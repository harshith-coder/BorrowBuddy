const express = require("express");

const router = express.Router();

const {
  createGroup,
  getGroups,
  getGroupItems,
  addItem,
  createLoan,
  getGroupLoans,
  addGroupMember,
  getGroupMembers
} = require("../controllers/groupController.js");

const { protect } = require("../middleware/authMiddleware.js");

router.post("/", protect, createGroup);
router.get("/", protect, getGroups);

router.get("/:id/items", protect, getGroupItems);
router.post("/:id/items", protect, addItem);

router.post("/:id/loans", protect, createLoan);
router.get("/:id/loans", protect, getGroupLoans);

router.post("/:id/members", protect, addGroupMember);
router.get("/:id/members", protect, getGroupMembers);
module.exports = router;