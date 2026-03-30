const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getRecentMessages, getConversation, sendMessage } = require('../controllers/messageController');

const router = express.Router();

router.get('/recent', protect, getRecentMessages);
router.get('/:otherUserId', protect, getConversation);
router.post('/', protect, sendMessage);

module.exports = router;

