const express = require('express');
const {
  getLibraryContent,
  getApprovedTutors,
  getApprovedTutorById,
  getMyTutorContent,
  getTutorApprovedContent,
  createTutorFileContent,
  createTutorVideoContent,
  getContentById,
  createContent,
  submitContentPaymentProof
} = require('../controllers/contentController');
const { protect, roleCheck } = require('../middleware/authMiddleware');
const { uploadContentFile, uploadPaymentScreenshot } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/library', protect, getLibraryContent);
router.get('/tutors', protect, getApprovedTutors);
router.get('/tutors/:id', protect, getApprovedTutorById);

router.get('/tutor/mine', protect, roleCheck('tutor'), getMyTutorContent);
router.get('/tutor/:tutorId', protect, getTutorApprovedContent);
router.post('/tutor/file', protect, roleCheck('tutor'), uploadContentFile, createTutorFileContent);
router.post('/tutor/video', protect, roleCheck('tutor'), createTutorVideoContent);

router.post(
  '/:id/payment-proof',
  protect,
  roleCheck('student'),
  uploadPaymentScreenshot,
  submitContentPaymentProof
);

router.get('/:id', protect, getContentById);

router.post('/', protect, (req, _res, next) => roleCheck('admin', 'tutor')(req, _res, next), createContent);

module.exports = router;
