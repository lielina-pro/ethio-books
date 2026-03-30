const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Optional metadata for richer UI.
    title: {
      type: String,
      trim: true,
      default: ''
    },
    link: {
      type: String,
      trim: true,
      default: ''
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: [
        'payment',
        'payment_confirmed',
        'payment_rejected',
        'premium_request',
        'premium_approved',
        'premium_rejected',
        'profile',
        'message',
        'other',
        'content',
        'content_approved',
        'content_rejected',
        'content_access',
        'course_purchase_approved',
        'course_purchase_rejected',
        'help_center'
      ],
      default: 'other'
    },
    read: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = { Notification };

