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
const { body, query, param, validationResult } = require('express-validator');
const mongoSanitize = require('express-mongo-sanitize');

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
  crossOriginEmbedderPolicy: false
})); // Enhanced security headers

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 uploads per windowMs
  message: 'Too many upload requests from this IP, please try again later.',
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// CORS configuration with specific origins
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200
}));

// Performance optimizations
app.use(compression()); // Enable gzip compression

// Sanitize user input against NoSQL injection attacks
app.use(mongoSanitize());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Redis cache setup
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379
  },
  password: process.env.REDIS_PASSWORD
});

redisClient.on('error', (err) => {
  console.log('Redis Client Error', err);
});

// MongoDB connection with optimizations and authentication
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/performance-demo';
mongoose.connect(mongoUri, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  w: 'majority'
}).catch((err) => {
  console.error('MongoDB initial connect error:', err.message);
});

// Disable mongoose buffering at the library level to fail fast when DB is down
mongoose.set('bufferCommands', false);

// Database schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  email: { type: String, required: true, unique: true, index: true },
  avatar: String,
  createdAt: { type: Date, default: Date.now, index: true }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  description: String,
  price: { type: Number, required: true, index: true },
  category: { type: String, index: true },
  images: [String],
  createdAt: { type: Date, default: Date.now, index: true }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);

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

// Image optimization middleware
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Input validation middleware
const validateImageOptimization = [
  body('width').optional().isInt({ min: 1, max: 4000 }).withMessage('Width must be between 1 and 4000 pixels'),
  body('quality').optional().isInt({ min: 1, max: 100 }).withMessage('Quality must be between 1 and 100'),
  body('format').optional().isIn(['webp', 'jpeg', 'png']).withMessage('Format must be webp, jpeg, or png'),
];

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

const validateSearch = [
  query('q').isLength({ min: 2, max: 100 }).withMessage('Search query must be between 2 and 100 characters'),
  query('type').optional().isIn(['products', 'users']).withMessage('Type must be products or users'),
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Optimize image endpoint
app.post('/api/optimize-image', uploadLimiter, upload.single('image'), validateImageOptimization, handleValidationErrors, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const { width = 800, quality = 80, format = 'webp' } = req.body;

    const optimizedImage = await sharp(req.file.buffer)
      .resize(parseInt(width), null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .toFormat(format, { quality: parseInt(quality) })
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
app.get('/api/users', validatePagination, handleValidationErrors, cache(300), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
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

app.get('/api/products', validatePagination, handleValidationErrors, cache(300), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const minPrice = req.query.minPrice;
    const maxPrice = req.query.maxPrice;

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

// Search endpoint with text indexing
app.get('/api/search', validateSearch, handleValidationErrors, cache(60), async (req, res) => {
  try {
    const { q, type = 'products' } = req.query;

    if (!q || q.length < 2) {
      return res.json({ results: [] });
    }

    let results = [];

    // Escape special regex characters to prevent ReDoS attacks
    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    if (type === 'products') {
      // Use text search with escaped regex for security
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