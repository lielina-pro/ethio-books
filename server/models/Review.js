const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    comment: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

reviewSchema.index({ student: 1, tutor: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);

module.exports = { Review };

