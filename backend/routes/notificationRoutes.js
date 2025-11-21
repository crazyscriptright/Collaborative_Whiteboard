const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');

router.use(authenticateToken);
router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);

module.exports = router;
