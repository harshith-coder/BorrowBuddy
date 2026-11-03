const Invitation = require("../model/invitation.js");
const Group = require("../model/group.js");
const User = require("../model/user.js");
const Notification = require("../model/notification.js");
const { emitToUser } = require("../config/socket.js");

// Send an invitation to a user to join a group (Only group admin/creator)
const sendInvitation = async (req, res, next) => {
  try {
    const { groupId, inviteeId, message } = req.body;
    const inviterId = req.user._id;

    if (!groupId || !inviteeId) {
      return res.status(400).json({ success: false, message: "Group ID and Invitee ID are required" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    // Permission check: only admin/creator can invite
    const isOwner = group.ownerId.toString() === inviterId.toString();
    const isManager = group.managerIds && group.managerIds.some((id) => id.toString() === inviterId.toString());

    if (!isOwner && !isManager) {
      return res.status(403).json({
        success: false,
        message: "Only the group creator/manager can invite members",
      });
    }

    // Check if invitee exists
    const invitee = await User.findById(inviteeId);
    if (!invitee) {
      return res.status(404).json({ success: false, message: "Invited user not found" });
    }

    // Prevent adding if already a member
    const alreadyMember = group.memberIds.some((id) => id.toString() === inviteeId.toString());
    if (alreadyMember) {
      return res.status(400).json({ success: false, message: "User is already a member of this group" });
    }

    // Check if duplicate pending invitation already exists
    const existingInvite = await Invitation.findOne({
      groupId,
      inviteeId,
      status: "pending",
    });

    if (existingInvite) {
      return res.status(400).json({
        success: false,
        message: "An invitation is already pending for this user",
      });
    }

    const invitation = await Invitation.create({
      groupId,
      inviterId,
      inviteeId,
      message: message ? message.trim() : "",
      status: "pending",
    });

    // Create real notification for invitee
    const notification = await Notification.create({
      recipientId: inviteeId,
      senderId: inviterId,
      type: "group_invitation",
      title: "Group Invitation",
      message: `${req.user.name} invited you to join "${group.name}"`,
      data: {
        groupId: group._id,
        invitationId: invitation._id,
      },
    });
    emitToUser(inviteeId, "invitation:new", {
      invitationId: invitation._id,
      groupId: group._id,
      groupName: group.name,
      inviterName: req.user.name,
      message: invitation.message,
    });
    emitToUser(inviteeId, "notification:new", notification);

    res.status(201).json({
      success: true,
      message: "Invitation sent successfully",
      data: invitation,
    });
  } catch (error) {
    next(error);
  }
};

// Get current user's invitations (received or sent)
const getMyInvitations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const received = await Invitation.find({ inviteeId: userId })
      .populate("groupId", "name description image")
      .populate("inviterId", "name email avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: received });
  } catch (error) {
    next(error);
  }
};

// Accept an invitation
const acceptInvitation = async (req, res, next) => {
  try {
    const invitation = await Invitation.findById(req.params.id)
      .populate("groupId")
      .populate("inviterId", "name");

    if (!invitation) {
      return res.status(404).json({ success: false, message: "Invitation not found" });
    }

    if (invitation.inviteeId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to accept this invitation" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ success: false, message: `Invitation is already ${invitation.status}` });
    }

    // Add user to group
    const group = await Group.findById(invitation.groupId._id);
    if (!group) {
      return res.status(404).json({ success: false, message: "Associated group not found" });
    }

    if (!group.memberIds.some((id) => id.toString() === req.user._id.toString())) {
      group.memberIds.push(req.user._id);
      await group.save();
    }

    invitation.status = "accepted";
    await invitation.save();

    // Notify inviter
    const notification = await Notification.create({
      recipientId: invitation.inviterId._id,
      senderId: req.user._id,
      type: "invitation_accepted",
      title: "Invitation Accepted",
      message: `${req.user.name} accepted your invitation to join "${group.name}"`,
      data: {
        groupId: group._id,
        invitationId: invitation._id,
      },
    });
    emitToUser(invitation.inviterId._id, "invitation:updated", {
      invitationId: invitation._id,
      groupId: group._id,
      status: invitation.status,
      memberId: req.user._id,
    });
    emitToUser(invitation.inviterId._id, "notification:new", notification);

    res.status(200).json({
      success: true,
      message: `You joined ${group.name}!`,
      data: invitation,
    });
  } catch (error) {
    next(error);
  }
};

// Reject an invitation
const rejectInvitation = async (req, res, next) => {
  try {
    const invitation = await Invitation.findById(req.params.id)
      .populate("groupId")
      .populate("inviterId", "name");

    if (!invitation) {
      return res.status(404).json({ success: false, message: "Invitation not found" });
    }

    if (invitation.inviteeId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to respond to this invitation" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ success: false, message: `Invitation is already ${invitation.status}` });
    }

    invitation.status = "rejected";
    await invitation.save();

    // Notify inviter
    const notification = await Notification.create({
      recipientId: invitation.inviterId._id,
      senderId: req.user._id,
      type: "invitation_rejected",
      title: "Invitation Declined",
      message: `${req.user.name} declined the invitation to join "${invitation.groupId.name}"`,
      data: {
        groupId: invitation.groupId._id,
        invitationId: invitation._id,
      },
    });
    emitToUser(invitation.inviterId._id, "invitation:updated", {
      invitationId: invitation._id,
      groupId: invitation.groupId._id,
      status: invitation.status,
      memberId: req.user._id,
    });
    emitToUser(invitation.inviterId._id, "notification:new", notification);

    res.status(200).json({
      success: true,
      message: "Invitation declined",
      data: invitation,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendInvitation,
  getMyInvitations,
  acceptInvitation,
  rejectInvitation,
};
