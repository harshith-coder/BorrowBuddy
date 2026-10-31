const express = require("express");
const { returnLoan } = require("../controllers/loanController.js");
const { protect } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.patch("/:id/return", protect, returnLoan);

module.exports = router;