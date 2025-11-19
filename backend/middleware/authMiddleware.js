const { verifyAccessToken, extractTokenFromHeader } = require('../utils/jwtUtils');
const User = require('../models/User');

// Authenticate user middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify the token
    const decoded = verifyAccessToken(token);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password -refreshTokens');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Update last active time
    user.updateLastActive();

    // Attach user to request object
    req.user = user;
    next();

  } catch (error) {
    if (error.message === 'Invalid access token') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired access token'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('-password -refreshTokens');
      
      if (user && user.isActive) {
        req.user = user;
        user.updateLastActive();
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Admin role check middleware
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

// Board access middleware
const checkBoardAccess = (requiredRole = 'viewer') => {
  return async (req, res, next) => {
    try {
      const boardId = req.params.boardId || req.params.id;
      
      if (!boardId) {
        return res.status(400).json({
          success: false,
          message: 'Board ID is required'
        });
      }

      const Board = require('../models/Board');
      const board = await Board.findById(boardId);

      if (!board) {
        return res.status(404).json({
          success: false,
          message: 'Board not found'
        });
      }

      if (!board.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Board is inactive'
        });
      }

      // Check if user has access
      if (!board.hasAccess(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this board'
        });
      }

      // Check role requirements
      const userRole = board.getUserRole(req.user._id);
      const roleHierarchy = {
        'viewer': 1,
        'editor': 2,
        'admin': 3,
        'owner': 4
      };

      if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
        return res.status(403).json({
          success: false,
          message: `${requiredRole} access required`
        });
      }

      req.board = board;
      req.userRole = userRole;
      next();

    } catch (error) {
      console.error('Board access middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check board access'
      });
    }
  };
};

// Rate limiting middleware for sensitive operations
const rateLimitSensitive = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip + req.originalUrl;
    const now = Date.now();
    
    if (!attempts.has(key)) {
      attempts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const attempt = attempts.get(key);
    
    if (now > attempt.resetTime) {
      attempt.count = 1;
      attempt.resetTime = now + windowMs;
      return next();
    }

    if (attempt.count >= maxAttempts) {
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please try again later.',
        retryAfter: Math.ceil((attempt.resetTime - now) / 1000)
      });
    }

    attempt.count++;
    next();
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  checkBoardAccess,
  rateLimitSensitive
};