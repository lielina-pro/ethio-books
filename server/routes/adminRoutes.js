const express = require('express');
const {
  getPendingTutors,
  approveTutor,
  rejectTutor,
  getPendingTransactions,
  approvePremium,
  getUsers,
  blockUser,
  deleteUser,
  deleteTutor,
  getPendingContent,
  approveContent,
  rejectContent,
  getPendingContentPurchases,
  approveContentPurchase,
  rejectContentPurchase
} = require('../controllers/adminController');
const { protect, roleCheck } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes below are protected and admin-only
router.use(protect, roleCheck('admin'));

// Tutors
router.get('/pending-tutors', getPendingTutors);
router.patch('/approve-tutor/:id', approveTutor);
router.patch('/reject-tutor/:id', rejectTutor);

// Content moderation & paid access
router.get('/pending-content', getPendingContent);
router.patch('/approve-content/:id', approveContent);
router.patch('/reject-content/:id', rejectContent);
router.get('/pending-content-purchases', getPendingContentPurchases);
router.patch('/approve-content-purchase/:id', approveContentPurchase);
router.patch('/reject-content-purchase/:id', rejectContentPurchase);

// Transactions / premium
router.get('/pending-transactions', getPendingTransactions);
router.patch('/approve-premium/:id', approvePremium);

// Users management
router.get('/users', getUsers);
router.patch('/block-user/:id', blockUser);
router.delete('/users/:id', deleteUser);

// Tutor deletion (deletes tutor + their uploaded content)
router.delete('/tutors/:id', deleteTutor);

module.exports = router;

