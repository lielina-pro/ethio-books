const mongoose = require('mongoose');

const CONTENT_TYPES = ['textbook', 'quiz', 'video'];

const contentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    grade: {
      type: Number,
      min: 7,
      max: 12,
      required: true
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true
    },
    contentType: {
      type: String,
      enum: CONTENT_TYPES,
      required: true
    },
    isFree: {
      type: Boolean,
      default: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Content = mongoose.model('Content', contentSchema);

module.exports = { Content, CONTENT_TYPES };

