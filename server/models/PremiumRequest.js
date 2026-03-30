const mongoose = require('mongoose');

const premiumRequestSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    paymentMethod: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    screenshotUrl: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectedReason: { type: String, default: '' },
    approvedAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PremiumRequest', premiumRequestSchema);

