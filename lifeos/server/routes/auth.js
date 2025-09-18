const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validateInput, sanitizeInput, generateToken, hashPassword, verifyPassword } = require('../middleware/security');
const User = require('../models/User');

// Validation rules for registration
const registerValidation = {
  name: { required: true, minLength: 2, maxLength: 100 },
  email: { required: true, type: 'email' },
  password: { required: true, minLength: 8, maxLength: 128 }
};

// Validation rules for login
const loginValidation = {
  email: { required: true, type: 'email' },
  password: { required: true }
};

// User registration endpoint
router.post('/register', 
  validateInput(registerValidation),
  sanitizeInput,
  async (req, res) => {
    try {
      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create new user
      const user = new User({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        createdAt: new Date()
      });

      await user.save();

      // Generate token
      const token = generateToken({ 
        id: user._id, 
        email: user.email 
      });

      res.status(201).json({
        message: 'User created successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// User login endpoint
router.post('/login',
  validateInput(loginValidation),
  sanitizeInput,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate token
      const token = generateToken({ 
        id: user._id, 
        email: user.email 
      });

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Token refresh endpoint
router.post('/refresh-token', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-change-this');
    
    // Generate new token
    const newToken = generateToken({ 
      id: decoded.id, 
      email: decoded.email 
    });

    res.json({ token: newToken });
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
});

// Logout endpoint (for token blacklisting if implemented)
router.post('/logout', (req, res) => {
  // In a production environment, you might want to blacklist the token
  // For now, we'll just return a success message
  res.json({ message: 'Logout successful' });
});

module.exports = router;