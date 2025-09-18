const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const redis = require('redis');
const sharp = require('sharp');
const multer = require('multer');
const path = require('path');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const validator = require('validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' }, // X-Frame-Options
  noSniff: true, // X-Content-Type-Options
  xssFilter: true, // X-XSS-Protection
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CORS configuration with specific origins
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
    : true,
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use('/api/', limiter);

// Stricter rate limiting for sensitive endpoints
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
});

// Performance optimizations
app.use(compression()); // Enable gzip compression

// Body parsing with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// MongoDB query sanitization
app.use(mongoSanitize({
  replaceWith: '_',
  allowDots: false
}));

// Authentication routes
app.use('/api/auth', authRoutes);

// Redis cache setup
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379
  }
});

redisClient.on('error', (err) => {
  console.log('Redis Client Error', err);
});

// MongoDB connection with optimizations
// Note: bufferMaxEntries was removed in modern Mongo drivers; using supported options only
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/performance-demo', {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
}).catch((err) => {
  console.error('MongoDB initial connect error:', err.message);
});

// Disable mongoose buffering at the library level to fail fast when DB is down
mongoose.set('bufferCommands', false);

// Import security middleware
const { securityHeaders, securityLogger, authenticateToken } = require('./middleware/security');
const authRoutes = require('./routes/auth');

// Apply security headers and logging
app.use(securityHeaders);
app.use(securityLogger);

// Import models
const User = require('./models/User');
const Product = require('./models/Product');

// Cache middleware
const cache = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;

    // If Redis is not connected, skip caching
    if (!redisClient || !redisClient.isOpen) {
      return next();
    }

    try {
      const cached = await redisClient.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      res.sendResponse = res.json;
      res.json = async (body) => {
        try {
          // Redis v4 uses setEx instead of setex
          await redisClient.setEx(key, duration, JSON.stringify(body));
        } catch (err) {
          console.error('Redis cache setex error:', err);
        }
        res.sendResponse(body);
      };

      next();
    } catch (error) {
      next();
    }
  };
};

// Image optimization middleware with enhanced validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB limit
    files: 1,
    fields: 10
  },
  fileFilter: (req, file, cb) => {
    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      // Additional check on file extension
      const fileExt = path.extname(file.originalname).toLowerCase();
      const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      if (allowedExts.includes(fileExt)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file extension'), false);
      }
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Optimize image endpoint with rate limiting
app.post('/api/optimize-image', strictLimiter, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Validate and sanitize input parameters
    const width = Math.min(Math.max(parseInt(req.body.width) || 800, 10), 4000);
    const quality = Math.min(Math.max(parseInt(req.body.quality) || 80, 1), 100);
    const allowedFormats = ['webp', 'jpeg', 'png'];
    const format = allowedFormats.includes(req.body.format) ? req.body.format : 'webp';

    // Validate image buffer before processing
    const metadata = await sharp(req.file.buffer).metadata();
    if (metadata.width > 10000 || metadata.height > 10000) {
      return res.status(400).json({ error: 'Image dimensions too large' });
    }

    const optimizedImage = await sharp(req.file.buffer)
      .resize(width, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .toFormat(format, { quality: quality })
      .toBuffer();

    res.set({
      'Content-Type': `image/${format}`,
      'Content-Length': optimizedImage.length,
      'Cache-Control': 'public, max-age=31536000' // 1 year cache
    });

    res.send(optimizedImage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Optimized API endpoints with caching and pagination
app.get('/api/users', cache(300), async (req, res) => {
  try {
    // Validate and sanitize pagination parameters
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    // Use aggregation pipeline for better performance
    const users = await User.aggregate([
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: { name: 1, email: 1, avatar: 1, createdAt: 1 } }
    ]);

    const total = await User.countDocuments();

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products', cache(300), async (req, res) => {
  try {
    // Validate and sanitize parameters
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const category = req.query.category ? validator.escape(req.query.category) : undefined;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined;

    // Build query with indexes
    const query = {};
    if (category) query.category = category;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name description price category images createdAt')
      .lean(); // Use lean() for better performance

    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search endpoint with text indexing and input validation
app.get('/api/search', cache(60), async (req, res) => {
  try {
    // Sanitize and validate search query
    const q = req.query.q ? validator.escape(req.query.q.trim()) : '';
    const type = ['products', 'users'].includes(req.query.type) ? req.query.type : 'products';

    if (!q || q.length < 2 || q.length > 100) {
      return res.json({ results: [] });
    }

    let results = [];

    if (type === 'products') {
      // Use text search with escaped regex to prevent ReDoS
      const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      results = await Product.find({
        $or: [
          { name: { $regex: escapedQuery, $options: 'i' } },
          { description: { $regex: escapedQuery, $options: 'i' } }
        ]
      })
      .limit(10)
      .select('name description price category')
      .lean();
    } else if (type === 'users') {
      const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      results = await User.find({
        name: { $regex: escapedQuery, $options: 'i' }
      })
      .limit(10)
      .select('name email avatar')
      .lean();
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve static files with caching
app.use('/static', express.static(path.join(__dirname, '../client/build/static'), {
  maxAge: '1y',
  etag: true,
  lastModified: true
}));

// Protected admin endpoints (example)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  try {
    // Await Redis quit (modern Redis clients support promises natively)
    await redisClient.quit();
  } catch (err) {
    console.error('Error closing Redis client:', err);
  }
  try {
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error closing MongoDB connection:', err);
  }
  process.exit(0);
});

// Connect to Redis in the background; do not crash on failure
(async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    console.log('Redis client connected');
  } catch (e) {
    console.warn('Redis connect failed:', e.message);
  }
})();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});