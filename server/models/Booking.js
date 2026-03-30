const mongoose = require('mongoose');

const BOOKING_STATUSES = ['pending', 'accepted', 'rejected', 'completed', 'cancelled'];

const bookingSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    subject: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    duration: {
      type: Number,
      enum: [30, 60, 90, 120],
      required: true
    },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: 'pending'
    },
    amount: { type: Number, min: 0, required: true },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String, trim: true, default: '' },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = { Booking, BOOKING_STATUSES };

