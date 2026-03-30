const express = require('express');
const {
  createBooking,
  getStudentBookings,
  getTutorBookings,
  updateBookingStatus,
  addRating
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createBooking);
router.get('/student', protect, getStudentBookings);
router.get('/tutor', protect, getTutorBookings);
router.put('/:id/status', protect, updateBookingStatus);
router.post('/:id/rating', protect, addRating);

module.exports = router;

