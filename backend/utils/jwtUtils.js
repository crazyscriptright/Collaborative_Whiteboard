const jwt = require('jsonwebtoken');
const { 
  JWT_ACCESS_SECRET, 
  JWT_REFRESH_SECRET, 
  ACCESS_TOKEN_EXPIRES, 
  REFRESH_TOKEN_EXPIRES 
} = require('../config/jwt');

// Generate access token
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { 
    expiresIn: ACCESS_TOKEN_EXPIRES 
  });
};

// Generate refresh token
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { 
    expiresIn: REFRESH_TOKEN_EXPIRES 
  });
};

// Generate both tokens
const generateTokens = (payload) => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  return {
    accessToken,
    refreshToken
  };
};

// Verify access token
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET);
  } catch (error) {
    throw new Error('Invalid access token');
  }
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

// Extract token from header
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader
};