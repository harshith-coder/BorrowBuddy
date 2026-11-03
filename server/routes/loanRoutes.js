const express = require("express");
const {
  requestLoan,
  approveLoan,
  rejectLoan,
  returnLoan,
  getUserLoans,
} = require("../controllers/loanController.js");
const { protect } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.post("/", protect, requestLoan);
router.get("/", protect, getUserLoans);
router.patch("/:id/approve", protect, approveLoan);
router.patch("/:id/reject", protect, rejectLoan);
router.patch("/:id/return", protect, returnLoan);

module.exports = router;
