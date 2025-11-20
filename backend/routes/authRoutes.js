const express = require('express');
const router = express.Router();
const {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');
const { authenticateToken, rateLimitSensitive } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', rateLimitSensitive(5, 15 * 60 * 1000), register);
router.post('/login', rateLimitSensitive(5, 15 * 60 * 1000), login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.post('/forgot-password', rateLimitSensitive(3, 60 * 60 * 1000), forgotPassword);
router.put('/reset-password/:resetToken', rateLimitSensitive(5, 60 * 60 * 1000), resetPassword);

// Protected routes
router.use(authenticateToken);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/logout-all', logoutAll);

module.exports = router;