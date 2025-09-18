const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const redis = require('redis');
const sharp = require('sharp');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Performance optimizations
app.use(compression()); // Enable gzip compression
app.use(helmet()); // Security headers
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Development mode flag
const isDevelopment = process.env.NODE_ENV !== 'production';
let redisClient = null;
let mongoConnected = false;

// In-memory cache for development
const memoryCache = new Map();

// Redis cache setup with fallback
if (!isDevelopment) {
  try {
    redisClient = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379
      }
    });

    redisClient.on('error', (err) => {
      console.log('Redis Client Error', err);
      redisClient = null;
    });

    redisClient.connect().catch(err => {
      console.log('Redis connection failed, using memory cache:', err.message);
      redisClient = null;
    });
  } catch (err) {
    console.log('Redis setup failed, using memory cache:', err.message);
    redisClient = null;
  }
} else {
  console.log('Development mode: Using in-memory cache instead of Redis');
}

// MongoDB connection with fallback (non-blocking)
const connectToMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/performance-demo', {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 2000,
      socketTimeoutMS: 2000,
    });
    
    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected successfully');
      mongoConnected = true;
    });

    mongoose.connection.on('error', (err) => {
      console.log('MongoDB connection error, using mock data:', err.message);
      mongoConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected, using mock data');
      mongoConnected = false;
    });
    
    mongoConnected = true;
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.log('MongoDB connection failed, using mock data:', err.message);
    mongoConnected = false;
  }
};

// Try to connect to MongoDB but don't block server startup
connectToMongoDB();

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

// Mock data for development/fallback
const mockUsers = [
  { _id: '1', name: 'John Doe', email: 'john@example.com', avatar: 'https://via.placeholder.com/150', createdAt: new Date('2024-01-15') },
  { _id: '2', name: 'Jane Smith', email: 'jane@example.com', avatar: 'https://via.placeholder.com/150', createdAt: new Date('2024-01-16') },
  { _id: '3', name: 'Bob Johnson', email: 'bob@example.com', avatar: 'https://via.placeholder.com/150', createdAt: new Date('2024-01-17') },
  { _id: '4', name: 'Alice Brown', email: 'alice@example.com', avatar: 'https://via.placeholder.com/150', createdAt: new Date('2024-01-18') },
  { _id: '5', name: 'Charlie Wilson', email: 'charlie@example.com', avatar: 'https://via.placeholder.com/150', createdAt: new Date('2024-01-19') }
];

const mockProducts = [
  { _id: '1', name: 'Laptop Pro', description: 'High-performance laptop for professionals', price: 1299.99, category: 'Electronics', images: ['https://via.placeholder.com/300'], createdAt: new Date('2024-01-10') },
  { _id: '2', name: 'Wireless Headphones', description: 'Premium noise-canceling headphones', price: 299.99, category: 'Electronics', images: ['https://via.placeholder.com/300'], createdAt: new Date('2024-01-11') },
  { _id: '3', name: 'Smart Watch', description: 'Advanced fitness and health tracking', price: 399.99, category: 'Electronics', images: ['https://via.placeholder.com/300'], createdAt: new Date('2024-01-12') },
  { _id: '4', name: 'Coffee Maker', description: 'Automatic drip coffee maker', price: 89.99, category: 'Home', images: ['https://via.placeholder.com/300'], createdAt: new Date('2024-01-13') },
  { _id: '5', name: 'Running Shoes', description: 'Comfortable athletic shoes', price: 129.99, category: 'Sports', images: ['https://via.placeholder.com/300'], createdAt: new Date('2024-01-14') }
];

// Cache middleware with memory fallback
const cache = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    
    try {
      let cached = null;
      
      // Try Redis first, fallback to memory cache
      if (redisClient) {
        try {
          cached = await redisClient.get(key);
        } catch (err) {
          console.log('Redis get error, using memory cache:', err.message);
        }
      }
      
      // Check memory cache if Redis failed
      if (!cached && memoryCache.has(key)) {
        const cacheEntry = memoryCache.get(key);
        if (Date.now() < cacheEntry.expires) {
          cached = cacheEntry.data;
        } else {
          memoryCache.delete(key);
        }
      }
      
      if (cached) {
        return res.json(typeof cached === 'string' ? JSON.parse(cached) : cached);
      }
      
      res.sendResponse = res.json;
      res.json = async (body) => {
        // Try to cache in Redis first, fallback to memory
        if (redisClient) {
          try {
            await redisClient.setex(key, duration, JSON.stringify(body));
          } catch (err) {
            console.log('Redis setex error, using memory cache:', err.message);
            memoryCache.set(key, {
              data: body,
              expires: Date.now() + (duration * 1000)
            });
          }
        } else {
          // Use memory cache
          memoryCache.set(key, {
            data: body,
            expires: Date.now() + (duration * 1000)
          });
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

// Optimize image endpoint
app.post('/api/optimize-image', upload.single('image'), async (req, res) => {
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
app.get('/api/users', cache(300), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let users, total;

    if (mongoConnected) {
      // Use aggregation pipeline for better performance
      users = await User.aggregate([
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: { name: 1, email: 1, avatar: 1, createdAt: 1 } }
      ]);

      total = await User.countDocuments();
    } else {
      // Use mock data
      const sortedUsers = [...mockUsers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      users = sortedUsers.slice(skip, skip + limit);
      total = mockUsers.length;
    }
    
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const minPrice = req.query.minPrice;
    const maxPrice = req.query.maxPrice;

    let products, total;

    if (mongoConnected) {
      // Build query with indexes
      const query = {};
      if (category) query.category = category;
      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = parseFloat(minPrice);
        if (maxPrice) query.price.$lte = parseFloat(maxPrice);
      }

      products = await Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('name description price category images createdAt')
        .lean(); // Use lean() for better performance

      total = await Product.countDocuments(query);
    } else {
      // Use mock data with filtering
      let filteredProducts = [...mockProducts];
      
      if (category) {
        filteredProducts = filteredProducts.filter(p => p.category === category);
      }
      if (minPrice) {
        filteredProducts = filteredProducts.filter(p => p.price >= parseFloat(minPrice));
      }
      if (maxPrice) {
        filteredProducts = filteredProducts.filter(p => p.price <= parseFloat(maxPrice));
      }
      
      const sortedProducts = filteredProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      products = sortedProducts.slice(skip, skip + limit);
      total = filteredProducts.length;
    }
    
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
app.get('/api/search', cache(60), async (req, res) => {
  try {
    const { q, type = 'products' } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ results: [] });
    }

    let results = [];
    
    if (mongoConnected) {
      if (type === 'products') {
        // Use text search with regex for better performance
        results = await Product.find({
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } }
          ]
        })
        .limit(10)
        .select('name description price category')
        .lean();
      } else if (type === 'users') {
        results = await User.find({
          name: { $regex: q, $options: 'i' }
        })
        .limit(10)
        .select('name email avatar')
        .lean();
      }
    } else {
      // Use mock data search
      const searchTerm = q.toLowerCase();
      
      if (type === 'products') {
        results = mockProducts
          .filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm)
          )
          .slice(0, 10)
          .map(({ _id, name, description, price, category }) => ({ _id, name, description, price, category }));
      } else if (type === 'users') {
        results = mockUsers
          .filter(user => user.name.toLowerCase().includes(searchTerm))
          .slice(0, 10)
          .map(({ _id, name, email, avatar }) => ({ _id, name, email, avatar }));
      }
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
    // Close Redis connection if it exists
    if (redisClient) {
      await redisClient.quit();
    }
  } catch (err) {
    console.error('Error closing Redis client:', err);
  }
  try {
    if (mongoConnected) {
      await mongoose.connection.close();
    }
  } catch (err) {
    console.error('Error closing MongoDB connection:', err);
  }
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});