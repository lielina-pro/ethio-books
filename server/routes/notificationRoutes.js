const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getMyNotifications,
  getUnreadCount,
  markAllRead,
  markRead
} = require('../controllers/notificationController');

const router = express.Router();

router.get('/', protect, getMyNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.patch('/mark-all-read', protect, markAllRead);
router.patch('/:id/read', protect, markRead);

module.exports = router;

