const express = require('express');
const { uploadContent, getMyMaterials } = require('../controllers/contentController');
const { protect, roleCheck } = require('../middleware/authMiddleware');

const router = express.Router();

// Upload educational content (admin only)
router.post('/upload', protect, roleCheck('admin'), uploadContent);

// Get materials for current user (student/tutor/admin)
router.get('/my-materials', protect, getMyMaterials);

module.exports = router;

