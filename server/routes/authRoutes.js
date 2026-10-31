const express = require("express");

const router = express.Router();

const {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  listUsers,
} =  require("../controllers/authController.js");

const { protect } = require("../middleware/authMiddleware.js");
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.get('/users', protect, listUsers);

module.exports = router;