const express = require("express");
const {
  sendInvitation,
  getMyInvitations,
  acceptInvitation,
  rejectInvitation,
} = require("../controllers/invitationController.js");
const { protect } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.post("/", protect, sendInvitation);
router.get("/", protect, getMyInvitations);
router.get("/me", protect, getMyInvitations);
router.patch("/:id/accept", protect, acceptInvitation);
router.patch("/:id/reject", protect, rejectInvitation);

module.exports = router;
