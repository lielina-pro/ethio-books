const express = require('express');
const { register, login, registerTutor } = require('../controllers/authController');
const { uploadTutorDocs, collectDocsUrls } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/register', register);
// Tutor registration: docs uploaded to Cloudinary, URLs attached to req.docsUrls
router.post('/register-tutor', uploadTutorDocs, collectDocsUrls, registerTutor);
router.post('/login', login);

module.exports = router;

