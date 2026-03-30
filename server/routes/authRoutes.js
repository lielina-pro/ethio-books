const express = require('express');
const { register, login, registerTutor, getMe, getHelpAdmin } = require('../controllers/authController');
const { uploadTutorDocs, collectDocsUrls } = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');

const router = express.Router();

// Multer "none" middleware so FormData from the student register page populates req.body.
// Student registration does not upload files, but the frontend sends multipart/form-data.
const uploadNone = multer().none();

router.post('/register', uploadNone, register);
// Tutor registration: docs uploaded to Cloudinary, URLs attached to req.docsUrls
router.post('/register-tutor', uploadTutorDocs, collectDocsUrls, registerTutor);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/help-admin', protect, getHelpAdmin);

module.exports = router;

