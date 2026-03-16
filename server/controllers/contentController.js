const { Content } = require('../models/Content');
const { User } = require('../models/User');

/**
 * @desc    Get all approved tutors for the Student Dashboard
 * @route   GET /api/content/tutors
 * @access  Public/Private
 */
const getTutors = async (req, res) => {
  try {
    // Only fetch users who are 'tutors' AND have been approved by the admin
    // This ensures pending or rejected tutors are not visible to students
    const tutors = await User.find({ 
      role: 'tutor', 
      status: 'approved' 
    })
    .select('-password') // Security: Remove hashed passwords from the response
    .sort({ createdAt: -1 }); // Show newest approved tutors first

    return res.json(tutors);
  } catch (error) {
    console.error('getTutors error:', error);
    return res.status(500).json({ message: 'Error fetching tutors list' });
  }
};

/**
 * @desc    Upload content material (Admin only)
 * @route   POST /api/content/upload
 */
const uploadContent = async (req, res) => {
  try {
    const { title, grade, fileUrl, contentType, isFree = true } = req.body;

    if (!title || !grade || !fileUrl || !contentType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const content = await Content.create({
      title,
      grade,
      fileUrl,
      contentType,
      isFree,
      uploadedBy: req.user._id
    });

    return res.status(201).json(content);
  } catch (error) {
    console.error('uploadContent error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get materials based on user role and premium status
 * @route   GET /api/content/my-materials
 */
const getMyMaterials = async (req, res) => {
  try {
    const { role, isPremium, grade, _id } = req.user;

    let query = {};

    if (role === 'student') {
      if (isPremium) {
        // Premium students can access all materials across all grades
        query = {};
      } else {
        // Free students only see materials matching their specific grade
        query = { grade: grade || 0 };
      }
    } else if (role === 'tutor') {
      // Tutors only see the materials they personally uploaded
      query = { uploadedBy: _id };
    } else if (role === 'admin') {
      // Admins have full visibility
      query = {};
    } else {
      return res.status(403).json({ message: 'Role not supported for materials' });
    }

    const materials = await Content.find(query)
      .populate('uploadedBy', 'fullName role')
      .sort({ createdAt: -1 });

    return res.json(materials);
  } catch (error) {
    console.error('getMyMaterials error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getTutors,
  uploadContent,
  getMyMaterials
};