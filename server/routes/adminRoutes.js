const express = require('express');
const {
  getPendingTutors,
  approveTutor,
  getPendingTransactions,
  approvePremium,
  getUsers,
  blockUser,
  deleteUser
} = require('../controllers/adminController');
const { protect, roleCheck } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes below are protected and admin-only
router.use(protect, roleCheck('admin'));

// Tutors
router.get('/pending-tutors', getPendingTutors);
router.patch('/approve-tutor/:id', approveTutor);

// Transactions / premium
router.get('/pending-transactions', getPendingTransactions);
router.patch('/approve-premium/:id', approvePremium);

// Users management
router.get('/users', getUsers);
router.patch('/block-user/:id', blockUser);
router.delete('/users/:id', deleteUser);

module.exports = router;

