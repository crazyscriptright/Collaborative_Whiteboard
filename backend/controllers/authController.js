const User = require('../models/User');
const { generateTokens, verifyRefreshToken } = require('../utils/jwtUtils');
const { COOKIE_OPTIONS } = require('../config/jwt');

// Register new user
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.email === email ? 'Email already registered' : 'Username already taken'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    // Generate tokens
    const tokens = generateTokens({
      userId: user._id,
      username: user.username,
      email: user.email
    });

    // Save refresh token
    await user.addRefreshToken(tokens.refreshToken);

    // Set HTTP-only cookie for refresh token
    res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          createdAt: user.createdAt
        },
        accessToken: tokens.accessToken
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || 'Validation failed'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Clean expired tokens
    await user.cleanExpiredTokens();

    // Generate new tokens
    const tokens = generateTokens({
      userId: user._id,
      username: user.username,
      email: user.email
    });

    // Save refresh token
    await user.addRefreshToken(tokens.refreshToken);
    await user.updateLastActive();

    // Set HTTP-only cookie for refresh token
    res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          lastActive: user.lastActive
        },
        accessToken: tokens.accessToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

// Refresh access token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not provided'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Find user and check if refresh token exists
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Check if refresh token exists in user's tokens
    const tokenExists = user.refreshTokens.some(rt => rt.token === refreshToken);
    
    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found'
      });
    }

    // Generate new tokens
    const tokens = generateTokens({
      userId: user._id,
      username: user.username,
      email: user.email
    });

    // Remove old refresh token and add new one
    await user.removeRefreshToken(refreshToken);
    await user.addRefreshToken(tokens.refreshToken);
    await user.updateLastActive();

    // Set new refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (refreshToken) {
      const decoded = verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.userId);
      
      if (user) {
        await user.removeRefreshToken(refreshToken);
      }
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', COOKIE_OPTIONS);

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    // Still clear cookie even if there's an error
    res.clearCookie('refreshToken', COOKIE_OPTIONS);
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }
};

// Logout from all devices
const logoutAll = async (req, res) => {
  try {
    const user = req.user;
    
    // Clear all refresh tokens
    user.refreshTokens = [];
    await user.save();

    // Clear refresh token cookie
    res.clearCookie('refreshToken', COOKIE_OPTIONS);

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });

  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout from all devices'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          lastActive: user.lastActive,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const user = req.user;

    // Check if username is taken by another user
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Username already taken'
        });
      }
      user.username = username;
    }

    if (avatar !== undefined) {
      user.avatar = avatar;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          lastActive: user.lastActive
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || 'Validation failed'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  getProfile,
  updateProfile
};