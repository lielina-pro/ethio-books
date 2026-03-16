const { Review } = require('../models/Review');
const { User } = require('../models/User');
const { Transaction } = require('../models/Transaction');

/**
 * Helper to recalculate tutor's average rating and total count
 */
const recalcTutorRating = async (tutorId) => {
  const stats = await Review.aggregate([
    { $match: { tutor: tutorId } },
    {
      $group: {
        _id: null,
        avg: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);

  const avg = stats[0]?.avg || 0;
  const count = stats[0]?.count || 0;

  await User.findByIdAndUpdate(tutorId, {
    averageRating: avg,
    ratingsCount: count
  });
};

/**
 * @desc    Get all approved tutors for Student Dashboard
 * @route   GET /api/content/tutors (or mapped route)
 */
const getTutors = async (req, res) => {
  try {
    // Only fetch users who are 'tutors' AND have 'approved' status
    const tutors = await User.find({
      role: 'tutor',
      status: 'approved'
    })
      .select('-password')
      .sort({ createdAt: -1 });

    return res.json(tutors);
  } catch (error) {
    console.error('getTutors error:', error);
    return res.status(500).json({ message: 'Error fetching tutors list' });
  }
};

/**
 * @desc    Create or Update a tutor review
 * @route   POST /api/reviews
 */
const createOrUpdateReview = async (req, res) => {
  try {
    const student = req.user;
    const { tutorId, rating, comment } = req.body;

    // 1. Validation
    if (!tutorId || !rating) {
      return res.status(400).json({ message: 'Tutor and rating are required' });
    }

    if (student.role !== 'student') {
      return res.status(403).json({ message: 'Only students can leave reviews' });
    }

    const tutor = await User.findById(tutorId);
    if (!tutor || tutor.role !== 'tutor') {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    // 2. Permission Check (Premium or Previous Purchase)
    if (!student.isPremium) {
      const tx = await Transaction.findOne({
        student: student._id,
        tutor: tutor._id,
        status: 'approved'
      });

      if (!tx) {
        return res.status(403).json({
          message: 'You can only rate tutors whose content you purchased or if you are Premium'
        });
      }
    }

    // 3. Save Review
    const review = await Review.findOneAndUpdate(
      { student: student._id, tutor: tutor._id },
      { rating, comment },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 4. Update Tutor Meta Data
    await recalcTutorRating(tutor._id);

    return res.status(200).json(review);
  } catch (error) {
    console.error('createOrUpdateReview error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get all reviews for a specific tutor
 * @route   GET /api/reviews/tutor/:id
 */
const getTutorReviews = async (req, res) => {
  try {
    const { id } = req.params;

    const reviews = await Review.find({ tutor: id })
      .populate('student', 'fullName grade')
      .sort({ createdAt: -1 });

    return res.json(reviews);
  } catch (error) {
    console.error('getTutorReviews error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getTutors,
  createOrUpdateReview,
  getTutorReviews
};