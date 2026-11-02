const express = require("express");

const router = express.Router();

const {
  createGroup,
  getGroups,
  getGroupItems,
  addItem,
  createLoan,
  getGroupLoans,
} = require("../controllers/groupController.js");

const { protect } = require("../middleware/authMiddleware.js");

router.post("/", protect, createGroup);
router.get("/", protect, getGroups);

router.get("/:id/items", protect, getGroupItems);
router.post("/:id/items", protect, addItem);

router.post("/:id/loans", protect, createLoan);
router.get("/:id/loans", protect, getGroupLoans);

module.exports = router;