const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    index: true,
    minlength: 2,
    maxlength: 200,
    trim: true
  },
  description: {
    type: String,
    maxlength: 2000,
    trim: true
  },
  price: { 
    type: Number, 
    required: true, 
    index: true,
    min: 0,
    max: 1000000,
    validate: {
      validator: function(v) {
        return v >= 0;
      },
      message: 'Price must be a positive number'
    }
  },
  category: { 
    type: String, 
    index: true,
    trim: true,
    maxlength: 100
  },
  images: [{
    type: String,
    validate: {
      validator: function(v) {
        // Basic URL validation for image URLs
        return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(v);
      },
      message: 'Invalid image URL'
    }
  }],
  stock: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: 'Stock must be an integer'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now, 
    index: true 
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp on save
productSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Text index for search functionality
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Compound indexes for common queries
productSchema.index({ category: 1, price: 1 });
productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ category: 1, isActive: 1, price: 1 });

// Virtual for formatted price
productSchema.virtual('formattedPrice').get(function() {
  return `$${this.price.toFixed(2)}`;
});

// Method to check if product is in stock
productSchema.methods.isInStock = function() {
  return this.stock > 0 && this.isActive;
};

// Static method for searching products
productSchema.statics.searchProducts = async function(query, options = {}) {
  const { 
    page = 1, 
    limit = 20, 
    sortBy = 'createdAt', 
    sortOrder = -1,
    category,
    minPrice,
    maxPrice
  } = options;

  const filter = { isActive: true };
  
  if (query) {
    filter.$text = { $search: query };
  }
  
  if (category) {
    filter.category = category;
  }
  
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }

  const skip = (page - 1) * limit;

  const products = await this.find(filter)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await this.countDocuments(filter);

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;