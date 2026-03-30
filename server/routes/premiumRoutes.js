const express = require('express');
const { protect, roleCheck } = require('../middleware/authMiddleware');
const { uploadPaymentScreenshot } = require('../middleware/uploadMiddleware');
const {
  submitPremiumRequest,
  getPendingPremiumRequests,
  approvePremiumRequest,
  rejectPremiumRequest
} = require('../controllers/premiumController');

const router = express.Router();

// Student submits premium request
router.post('/request', protect, roleCheck('student'), uploadPaymentScreenshot, submitPremiumRequest);

// Admin review
router.get('/requests/pending', protect, roleCheck('admin'), getPendingPremiumRequests);
router.put('/requests/:requestId/approve', protect, roleCheck('admin'), approvePremiumRequest);
router.put('/requests/:requestId/reject', protect, roleCheck('admin'), rejectPremiumRequest);

module.exports = router;

