const express = require("express");
const {
  sendInvitation,
  getMyInvitations,
  acceptInvitation,
  rejectInvitation,
  requestToJoinGroup,
  getOwnerRequests,
  approveMembershipRequest,
  rejectMembershipRequest,
} = require("../controllers/invitationController.js");
const { protect } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.post("/", protect, sendInvitation);
router.get("/", protect, getMyInvitations);
router.get("/me", protect, getMyInvitations);
router.post("/requests", protect, requestToJoinGroup);
router.get("/owner-requests", protect, getOwnerRequests);
router.patch("/:id/accept", protect, acceptInvitation);
router.patch("/:id/reject", protect, rejectInvitation);
router.patch("/:id/approve", protect, approveMembershipRequest);
router.patch("/:id/reject-request", protect, rejectMembershipRequest);

module.exports = router;
