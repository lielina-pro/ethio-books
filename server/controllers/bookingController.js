const { Booking } = require('../models/Booking');
const { User } = require('../models/User');

const createBooking = async (req, res) => {
  try {
    const student = req.user;
    if (student.role !== 'student') {
      return res.status(403).json({ message: 'Only students can create bookings' });
    }

    const { tutorId, subject, date, duration, amount } = req.body || {};

    if (!tutorId || !subject || !date || !duration || amount == null) {
      return res.status(400).json({ message: 'Missing required booking fields' });
    }

    const tutor = await User.findById(tutorId).select('-password');
    if (!tutor || tutor.role !== 'tutor' || tutor.tutorStatus !== 'approved') {
      return res.status(400).json({ message: 'Tutor is not available for booking' });
    }

    const bookingDate = new Date(date);
    if (Number.isNaN(bookingDate.getTime()) || bookingDate.getTime() < Date.now()) {
      return res.status(400).json({ message: 'Booking date must be in the future' });
    }

    const booking = await Booking.create({
      studentId: student._id,
      tutorId,
      subject,
      date: bookingDate,
      duration,
      amount,
      status: 'pending'
    });

    const populated = await Booking.findById(booking._id)
      .populate('studentId', 'fullName role grade')
      .populate('tutorId', 'fullName role subjects hourlyRate averageRating');

    return res.status(201).json(populated);
  } catch (error) {
    console.error('createBooking error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getStudentBookings = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can view student bookings' });
    }

    const bookings = await Booking.find({ studentId: req.user._id })
      .populate('tutorId', 'fullName subjects hourlyRate averageRating')
      .sort({ date: -1, createdAt: -1 });

    return res.json(bookings);
  } catch (error) {
    console.error('getStudentBookings error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getTutorBookings = async (req, res) => {
  try {
    if (req.user.role !== 'tutor') {
      return res.status(403).json({ message: 'Only tutors can view tutor bookings' });
    }

    const bookings = await Booking.find({ tutorId: req.user._id })
      .populate('studentId', 'fullName grade schoolName')
      .sort({ date: -1, createdAt: -1 });

    return res.json(bookings);
  } catch (error) {
    console.error('getTutorBookings error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    if (req.user.role !== 'tutor') {
      return res.status(403).json({ message: 'Only tutors can update booking status' });
    }

    const { id } = req.params;
    const { status } = req.body || {};

    if (!status || !['accepted', 'rejected', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const booking = await Booking.findOne({ _id: id, tutorId: req.user._id });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = status;
    if (status === 'completed') {
      booking.completedAt = new Date();
    }

    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate('studentId', 'fullName grade schoolName')
      .populate('tutorId', 'fullName subjects hourlyRate averageRating');

    return res.json(populated);
  } catch (error) {
    console.error('updateBookingStatus error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const addRating = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can rate sessions' });
    }

    const { id } = req.params;
    const { rating, review } = req.body || {};

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const booking = await Booking.findOne({ _id: id, studentId: req.user._id });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Only completed sessions can be rated' });
    }

    booking.rating = rating;
    booking.review = review || '';
    await booking.save();

    // Update tutor rating aggregates
    const tutor = await User.findById(booking.tutorId);
    if (tutor) {
      const currentTotal = (tutor.averageRating || 0) * (tutor.ratingsCount || 0);
      const newCount = (tutor.ratingsCount || 0) + 1;
      tutor.ratingsCount = newCount;
      tutor.averageRating = (currentTotal + rating) / newCount;
      await tutor.save();
    }

    const populated = await Booking.findById(booking._id)
      .populate('tutorId', 'fullName subjects hourlyRate averageRating ratingsCount')
      .populate('studentId', 'fullName grade');

    return res.json(populated);
  } catch (error) {
    console.error('addRating error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createBooking,
  getStudentBookings,
  getTutorBookings,
  updateBookingStatus,
  addRating
};

