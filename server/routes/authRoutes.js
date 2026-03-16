const express = require('express');
const { register, login } = require('../controllers/authController');
const { uploadTutorDocs, collectDocsUrls } = require('../middleware/uploadMiddleware');

const router = express.Router();

// For tutor registration, docs will be uploaded to Cloudinary and URLs
// attached on req.docsUrls before reaching the controller.
router.post('/register', uploadTutorDocs, collectDocsUrls, register);
router.post('/login', login);

module.exports = router;

