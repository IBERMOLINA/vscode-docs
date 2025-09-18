const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const validator = require('validator');

// Input validation middleware
const validateInput = (validationRules) => {
  return (req, res, next) => {
    const errors = [];

    for (const field in validationRules) {
      const rules = validationRules[field];
      const value = req.body[field] || req.query[field] || req.params[field];

      if (rules.required && !value) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value) {
        if (rules.type === 'email' && !validator.isEmail(value)) {
          errors.push(`${field} must be a valid email`);
        }

        if (rules.type === 'url' && !validator.isURL(value)) {
          errors.push(`${field} must be a valid URL`);
        }

        if (rules.type === 'numeric' && !validator.isNumeric(value)) {
          errors.push(`${field} must be numeric`);
        }

        if (rules.type === 'alphanumeric' && !validator.isAlphanumeric(value)) {
          errors.push(`${field} must be alphanumeric`);
        }

        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }

        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} must not exceed ${rules.maxLength} characters`);
        }

        if (rules.min !== undefined && parseFloat(value) < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }

        if (rules.max !== undefined && parseFloat(value) > rules.max) {
          errors.push(`${field} must not exceed ${rules.max}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    next();
  };
};

// Sanitize input middleware
const sanitizeInput = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = validator.escape(req.body[key].trim());
      }
    }
  }

  // Sanitize query
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = validator.escape(req.query[key].trim());
      }
    }
  }

  // Sanitize params
  if (req.params) {
    for (const key in req.params) {
      if (typeof req.params[key] === 'string') {
        req.params[key] = validator.escape(req.params[key].trim());
      }
    }
  }

  next();
};

// JWT authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default-secret-change-this', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'default-secret-change-this', {
    expiresIn: '24h',
    issuer: 'lifeos',
    audience: 'lifeos-users'
  });
};

// Hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

// Verify password
const verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  
  next();
};

// Request logging middleware for security monitoring
const securityLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent');
  
  console.log(`[SECURITY] ${timestamp} - ${req.method} ${req.path} - IP: ${ip} - UA: ${userAgent}`);
  
  // Log suspicious activity
  if (req.path.includes('..') || req.path.includes('//')) {
    console.warn(`[SECURITY WARNING] Suspicious path detected: ${req.path} from IP: ${ip}`);
  }
  
  next();
};

module.exports = {
  validateInput,
  sanitizeInput,
  authenticateToken,
  generateToken,
  hashPassword,
  verifyPassword,
  securityHeaders,
  securityLogger
};