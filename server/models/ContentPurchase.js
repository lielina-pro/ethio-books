const mongoose = require('mongoose');

const PURCHASE_STATUSES = ['pending', 'approved', 'rejected'];

const contentPurchaseSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content',
      required: true
    },
    screenshotUrl: {
      type: String,
      required: true,
      trim: true
    },
    // Optional payment metadata (stored for admin visibility / audit trail)
    amount: {
      type: Number,
      required: false
    },
    paymentMethod: {
      type: String,
      required: false,
      trim: true
    },
    accountNumber: {
      type: String,
      required: false,
      trim: true
    },
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    status: {
      type: String,
      enum: PURCHASE_STATUSES,
      default: 'pending'
    },
    adminNote: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { timestamps: true }
);

const ContentPurchase = mongoose.model('ContentPurchase', contentPurchaseSchema);

module.exports = { ContentPurchase, PURCHASE_STATUSES };
