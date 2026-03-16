const express = require('express');
const { createOrUpdateReview, getTutorReviews } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createOrUpdateReview);
router.get('/tutor/:id', protect, getTutorReviews);

module.exports = router;

