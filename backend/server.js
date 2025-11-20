require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { initializeSocket } = require('./sockets/whiteboardSocket');

// Import routes
const authRoutes = require('./routes/authRoutes');
const boardRoutes = require('./routes/boardRoutes');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV;
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL || 'https://drawvix.vercel.app';

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      FRONTEND_URL,
      'https://drawvix.vercel.app',
      'https://www.drawvix.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000',
    ];

    // In production, add your deployed frontend URL
    if (NODE_ENV === 'production') {
      if (FRONTEND_URL) allowedOrigins.push(FRONTEND_URL);
    }

    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(o => o && origin.startsWith(o))) {
      callback(null, true);
    } else {
      console.warn(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['set-cookie']
};

// Socket.io configuration
const io = socketIo(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Security middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  if (NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  if (NODE_ENV === 'development') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Collaborative Whiteboard API',
    version: '1.0.0',
    environment: NODE_ENV,
    docs: '/api/docs', // Future API documentation endpoint
    health: '/health'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // CORS error
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation'
    });
  }

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: messages
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = NODE_ENV === 'production' 
    ? 'Something went wrong' 
    : error.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Initialize Socket.io
initializeSocket(io);

// Make io accessible to routes (for future use)
app.set('io', io);

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('HTTP server closed.');
    
    // Close database connection
    const mongoose = require('mongoose');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start server
server.listen(PORT, () => {
  console.log(`
🚀 Server running on port ${PORT}
📱 Environment: ${NODE_ENV}
🌐 Frontend URL: ${FRONTEND_URL}
💾 Database: ${process.env.MONGO_URI ? 'Connected' : 'Not configured'}
⚡ Socket.io: Enabled
🔒 CORS: Configured
  `);
});

module.exports = { app, server, io };