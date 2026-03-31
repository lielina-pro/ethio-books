const { Content } = require('../models/Content');
const { User } = require('../models/User');
const { ContentPurchase } = require('../models/ContentPurchase');
const { Notification } = require('../models/Notification');

const notifyAdminsContentPending = async (req, title) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id');
    const io = req.app.get('io');
    for (const a of admins) {
      await Notification.create({
        user: a._id,
        message: `New content pending approval: "${title}"`,
        type: 'content'
      });
      if (io) {
        io.to(`user:${a._id.toString()}`).emit('notification', {
          message: `New content pending approval: "${title}"`,
          type: 'content',
          createdAt: new Date().toISOString()
        });
      }
    }
  } catch (e) {
    console.error('notifyAdminsContentPending:', e);
  }
};

const approvedStatusFilter = {
  $or: [
    { status: 'approved' },
    { moderationStatus: 'approved' },
    { status: { $exists: false }, moderationStatus: { $exists: false } }
  ]
};

const isApprovedContent = (item) => {
  const status = item?.status;
  const moderation = item?.moderationStatus;
  if (status) return status === 'approved';
  if (moderation) return moderation === 'approved';
  return true;
};

/**
 * @desc    Get approved tutors for marketplace
 * @route   GET /api/content/tutors
 */
const getApprovedTutors = async (_req, res) => {
  try {
    const tutors = await User.find({
      role: 'tutor',
      tutorStatus: 'approved'
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
 * @desc    Public tutor profile for marketplace (no email / phone)
 * @route   GET /api/content/tutors/:id
 */
const getApprovedTutorById = async (req, res) => {
  try {
    const tutor = await User.findOne({
      _id: req.params.id,
      role: 'tutor',
      tutorStatus: 'approved'
    }).select(
      'fullName averageRating ratingsCount educationLevel subjects bio achievements trialVideoUrl hourlyRate isVerified createdAt'
    );

    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    return res.json(tutor);
  } catch (error) {
    console.error('getApprovedTutorById error:', error);
    return res.status(500).json({ message: 'Error fetching tutor' });
  }
};

/**
 * @desc    Tutor's own uploads (all moderation states)
 * @route   GET /api/content/tutor/mine
 */
const getMyTutorContent = async (req, res) => {
  try {
    if (req.user.role !== 'tutor') {
      return res.status(403).json({ message: 'Tutors only' });
    }
    const items = await Content.find({ uploadedBy: req.user._id })
      .select('-__v')
      .sort({ createdAt: -1 });
    return res.json(items);
  } catch (error) {
    console.error('getMyTutorContent error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get library content (no grade filter)
 * @route   GET /api/content/library
 */
const getLibraryContent = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // NO grade filter - show ALL approved content
    const query = { status: 'approved' };

    // Filter by premium status only
    if (!user?.isPremium) {
      query.isPremium = { $ne: true };
    }

    const items = await Content.find(query)
      .select('-__v')
      .sort({ grade: 1, subject: 1, createdAt: -1 });

    // eslint-disable-next-line no-console
    console.log('📚 Library content count:', items.length);
    // eslint-disable-next-line no-console
    const grades = [...new Set(items.map((c) => c.grade))].sort();
    // eslint-disable-next-line no-console
    console.log('📚 Grades found:', grades);

    return res.json(items);
  } catch (error) {
    console.error('getLibraryContent error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get a single content item by id (paid unlock + moderation)
 * @route   GET /api/content/:id
 */
const getContentById = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Not authorized' });

    const item = await Content.findById(req.params.id).select('-__v');
    if (!item) return res.status(404).json({ message: 'Content not found' });

    const mod = item.status || item.moderationStatus;
    if (mod === 'pending' || mod === 'rejected') {
      if (user.role !== 'admin' && (!item.uploadedBy || item.uploadedBy.toString() !== user._id.toString())) {
        return res.status(404).json({ message: 'Content not available' });
      }
    }

    if (item.accessType === 'paid') {
      const unlock = await ContentPurchase.findOne({
        student: user._id,
        content: item._id,
        status: 'approved'
      });
      if (!unlock) {
        return res.status(403).json({
          message: 'Payment verification required',
          needsPayment: true,
          priceEtb: item.priceEtb || 50,
          contentId: item._id
        });
      }
    } else if (item.isPremium && !user.isPremium) {
      return res.status(403).json({ message: 'Premium content. Upgrade required.' });
    }

    return res.json(item);
  } catch (error) {
    console.error('getContentById error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Student submits payment screenshot for paid content
 * @route   POST /api/content/:id/payment-proof
 */
const submitContentPaymentProof = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Students only' });
    }
    const { id } = req.params; // contentId from URL
    const { tutorId, amount, paymentMethod, accountNumber } = req.body || {};

    // eslint-disable-next-line no-console
    console.log('[submitContentPaymentProof] incoming', {
      contentId: id,
      tutorId,
      amount,
      paymentMethod,
      accountNumber,
      studentId: req.user?._id?.toString?.() || String(req.user?._id || '')
    });

    if (!id) {
      return res.status(400).json({ message: 'Missing content id' });
    }

    const content = await Content.findById(id);
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    if (!content || content.accessType !== 'paid') {
      return res.status(400).json({ message: 'Invalid paid content' });
    }
    if (!isApprovedContent(content)) {
      return res.status(400).json({ message: 'Content is not published' });
    }

    if (!req.file) {
      // With multer-storage-cloudinary, req.file.path is the hosted URL.
      return res.status(400).json({ message: 'Payment screenshot is required' });
    }

    const screenshotUrl = req.file?.path;
    if (!screenshotUrl) {
      return res.status(400).json({ message: 'Screenshot file required' });
    }

    const parsedAmount = Number.isFinite(Number(amount)) ? Number(amount) : Number(content.priceEtb);

    let purchase = await ContentPurchase.findOne({ student: req.user._id, content: content._id });
    if (purchase) {
      if (purchase.status === 'approved') {
        return res.status(400).json({ message: 'You already have access' });
      }
      purchase.screenshotUrl = screenshotUrl;
      purchase.amount = parsedAmount;
      purchase.paymentMethod = paymentMethod || '';
      purchase.accountNumber = accountNumber || '';
      purchase.tutor = content.uploadedBy;
      purchase.status = 'pending';
      purchase.adminNote = '';
      await purchase.save();
    } else {
      purchase = await ContentPurchase.create({
        student: req.user._id,
        content: content._id,
        screenshotUrl,
        status: 'pending',
        amount: parsedAmount,
        paymentMethod: paymentMethod || '',
        accountNumber: accountNumber || '',
        tutor: content.uploadedBy
      });
    }

    const admins = await User.find({ role: 'admin' }).select('_id');
    const io = req.app.get('io');
    for (const a of admins) {
      await Notification.create({
        user: a._id,
        message: `New payment proof for content: "${content.title}"`,
        type: 'content_access'
      });
      if (io) {
        io.to(`user:${a._id.toString()}`).emit('notification', {
          message: `New payment proof for content: "${content.title}"`,
          type: 'content_access',
          createdAt: new Date().toISOString()
        });
      }
    }

    return res.status(201).json(purchase);
  } catch (error) {
    console.error('submitContentPaymentProof error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const buildTutorPayload = (user, body, overrides) => {
  const {
    title,
    subject,
    grade,
    description = '',
    accessType = 'free',
    priceEtb
  } = body || {};

  if (!title || !subject || !grade) {
    return { error: 'title, subject, and grade are required' };
  }

  const access = accessType === 'paid' ? 'paid' : 'free';
  let price;
  if (access === 'paid') {
    price = Number(priceEtb);
    if (!Number.isFinite(price) || price < 10 || price > 200) {
      return { error: 'Price must be between 10 and 200 ETB' };
    }
  }

  return {
    payload: {
      title,
      subject: String(subject),
      grade: Number(grade),
      description,
      accessType: access,
      priceEtb: access === 'paid' ? price : undefined,
      isPremium: access === 'paid',
      moderationStatus: 'pending',
      status: 'pending',
      moderationNote: '',
      uploadedBy: user._id,
      ...overrides
    }
  };
};

/**
 * @desc    Tutor upload file (PDF) → textbook pending approval
 * @route   POST /api/content/tutor/file
 */
const createTutorFileContent = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'tutor' || user.tutorStatus !== 'approved') {
      return res.status(403).json({ message: 'Approved tutors only' });
    }
    const fileUrl = req.file?.path;
    if (!fileUrl) {
      return res.status(400).json({ message: 'file is required' });
    }

    const built = buildTutorPayload(user, req.body, {
      contentType: 'textbook',
      pdfUrl: fileUrl,
      videoUrl: undefined,
      quizData: undefined
    });
    if (built.error) return res.status(400).json({ message: built.error });

    const created = await Content.create(built.payload);
    await notifyAdminsContentPending(req, created.title);
    return res.status(201).json(created);
  } catch (error) {
    console.error('createTutorFileContent error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Tutor submit video link → video pending approval
 * @route   POST /api/content/tutor/video
 */
const createTutorVideoContent = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'tutor' || user.tutorStatus !== 'approved') {
      return res.status(403).json({ message: 'Approved tutors only' });
    }
    const videoUrl = req.body?.videoUrl;
    if (!videoUrl || typeof videoUrl !== 'string') {
      return res.status(400).json({ message: 'videoUrl is required' });
    }

    const built = buildTutorPayload(user, req.body, {
      contentType: 'video',
      pdfUrl: undefined,
      videoUrl: videoUrl.trim(),
      quizData: undefined
    });
    if (built.error) return res.status(400).json({ message: built.error });

    const created = await Content.create(built.payload);
    await notifyAdminsContentPending(req, created.title);
    return res.status(201).json(created);
  } catch (error) {
    console.error('createTutorVideoContent error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Create content (admin or approved tutor) — JSON / admin seeds
 * @route   POST /api/content
 */
const createContent = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Not authorized' });

    const canCreate =
      user.role === 'admin' ||
      (user.role === 'tutor' && user.tutorStatus === 'approved');

    if (!canCreate) {
      return res.status(403).json({ message: 'Not allowed to create content' });
    }

    const {
      title,
      subject,
      grade,
      description = '',
      contentType,
      pdfUrl,
      videoUrl,
      quizData,
      isPremium = false,
      accessType: bodyAccess,
      priceEtb: bodyPrice,
      courseData
    } = req.body || {};

    if (!title || !subject || !grade || !contentType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (contentType === 'textbook' && !pdfUrl) {
      return res.status(400).json({ message: 'pdfUrl is required for textbooks' });
    }
    if (contentType === 'video' && !videoUrl) {
      return res.status(400).json({ message: 'videoUrl is required for videos' });
    }
    if (contentType === 'quiz') {
      const qs = quizData?.questions;
      if (!Array.isArray(qs) || qs.length < 1) {
        return res.status(400).json({ message: 'quizData.questions must be a non-empty array' });
      }
    }

    if (courseData && typeof courseData === 'object') {
      if (Array.isArray(courseData.sections)) {
        const invalidSection = courseData.sections.find((s) => !s?.sectionTitle || !Array.isArray(s?.lessons));
        if (invalidSection) {
          return res
            .status(400)
            .json({ message: 'courseData.sections must include sectionTitle and lessons[]' });
        }
      } else {
        return res.status(400).json({ message: 'courseData.sections must be an array' });
      }
    }

    const isAdmin = user.role === 'admin';
    const accessType = bodyAccess === 'paid' ? 'paid' : 'free';
    let priceEtb;
    if (accessType === 'paid') {
      priceEtb = Number(bodyPrice);
      if (!Number.isFinite(priceEtb) || priceEtb < 10 || priceEtb > 200) {
        return res.status(400).json({ message: 'Price must be between 10 and 200 ETB' });
      }
    }

    const moderationStatus = isAdmin ? 'approved' : 'pending';

    const created = await Content.create({
      title,
      subject,
      grade,
      description,
      contentType,
      pdfUrl: contentType === 'textbook' ? pdfUrl : undefined,
      videoUrl: contentType === 'video' ? videoUrl : undefined,
      quizData: contentType === 'quiz' ? quizData : undefined,
      isPremium: accessType === 'paid' ? true : !!isPremium,
      accessType,
      priceEtb: accessType === 'paid' ? priceEtb : undefined,
      moderationStatus,
      status: moderationStatus,
      moderationNote: '',
      courseData:
        courseData && typeof courseData === 'object'
          ? {
              thumbnail: courseData.thumbnail || '',
              sections: Array.isArray(courseData.sections) ? courseData.sections : []
            }
          : undefined,
      uploadedBy: user._id
    });

    if (!isAdmin) {
      await notifyAdminsContentPending(req, created.title);
    }

    return res.status(201).json(created);
  } catch (error) {
    console.error('createContent error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get approved content for a tutor profile (public to logged-in students/tutors)
 * @route   GET /api/content/tutor/:tutorId
 * Uses uploadedBy (tutor user id). Matches approved via status or moderationStatus.
 */
const getTutorApprovedContent = async (req, res) => {
  try {
    const { tutorId } = req.params;
    const items = await Content.find({
      uploadedBy: tutorId,
      $or: [
        { status: 'approved' },
        { moderationStatus: 'approved' },
        { status: { $exists: false }, moderationStatus: { $exists: false } }
      ]
    })
      .select('-__v')
      .sort({ createdAt: -1 });

    // eslint-disable-next-line no-console
    console.log('[getTutorApprovedContent]', {
      tutorId,
      count: items.length,
      sample: items.slice(0, 5).map((c) => ({
        id: c._id,
        title: c.title,
        status: c.status,
        moderationStatus: c.moderationStatus,
        accessType: c.accessType,
        isPremium: c.isPremium
      }))
    });

    return res.json(items);
  } catch (error) {
    console.error('getTutorApprovedContent error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getLibraryContent,
  getContentById,
  createContent,
  getApprovedTutors,
  getApprovedTutorById,
  getMyTutorContent,
  getTutorApprovedContent,
  createTutorFileContent,
  createTutorVideoContent,
  submitContentPaymentProof
};
