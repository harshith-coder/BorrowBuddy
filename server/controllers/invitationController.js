const Invitation = require("../model/invitation.js");
const Group = require("../model/group.js");
const User = require("../model/user.js");
const Notification = require("../model/notification.js");
const { emitToUser } = require("../config/socket.js");
const mongoose = require("mongoose");

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const markInvitationNotificationRead = (invitationId, userId) =>
  Notification.updateMany(
    { recipientId: userId, "data.invitationId": invitationId },
    { $set: { read: true } }
  );

// Send an invitation to a user to join a group (Only group admin/creator)
const sendInvitation = async (req, res, next) => {
  try {
    const { groupId, invitedUserId, message } = req.body;
    const inviterId = req.user._id;

    if (!isValidObjectId(groupId) || !isValidObjectId(invitedUserId)) {
      return res.status(400).json({ success: false, message: "Group ID and invited user ID must be valid" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    // Only the group owner can send invitations.
    const isOwner = group.ownerId.toString() === inviterId.toString();

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Only the group owner can invite members",
      });
    }

    // Check if invitee exists
    const invitee = await User.findById(invitedUserId);
    if (!invitee) {
      return res.status(404).json({ success: false, message: "Invited user not found" });
    }

    // Prevent adding if already a member
    const alreadyMember = group.memberIds.some((id) => id.toString() === invitedUserId.toString());
    if (alreadyMember) {
      return res.status(400).json({ success: false, message: "User is already a member of this group" });
    }

    // Check if duplicate pending invitation already exists
    const existingInvite = await Invitation.findOne({
      groupId,
      invitedUserId,
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
      invitedBy: inviterId,
      invitedUserId,
      message: message ? message.trim() : "",
      status: "pending",
    });

    // Create real notification for invitee
    const notification = await Notification.create({
      recipientId: invitedUserId,
      senderId: inviterId,
      type: "group_invitation",
      title: "Group Invitation",
      message: `${req.user.name} invited you to join "${group.name}"`,
      data: {
        groupId: group._id,
        invitationId: invitation._id,
      },
    });
    emitToUser(invitedUserId, "invitation:new", {
      invitationId: invitation._id,
      groupId: group._id,
      groupName: group.name,
      inviterName: req.user.name,
      message: invitation.message,
    });
    emitToUser(invitedUserId, "notification:new", notification);

    res.status(201).json({
      success: true,
      message: "Invitation sent successfully",
      data: invitation,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An invitation is already pending for this user",
      });
    }
    next(error);
  }
};

// Get current user's invitations (received or sent)
const getMyInvitations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const received = await Invitation.find({ invitedUserId: userId })
      .populate("groupId", "name description image")
      .populate("invitedBy", "name email avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: received });
  } catch (error) {
    next(error);
  }
};

// Accept an invitation
const acceptInvitation = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid invitation ID" });
    }

    const invitation = await Invitation.findById(req.params.id)
      .populate("groupId")
      .populate("invitedBy", "name");

    if (!invitation) {
      return res.status(404).json({ success: false, message: "Invitation not found" });
    }

    if (invitation.invitedUserId.toString() !== req.user._id.toString()) {
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

    const acceptedInvitation = await Invitation.findOneAndUpdate(
      {
        _id: invitation._id,
        invitedUserId: req.user._id,
        status: "pending",
      },
      { $set: { status: "accepted" } },
      { new: true, runValidators: true }
    );
    if (!acceptedInvitation) {
      return res.status(400).json({ success: false, message: "Invitation is no longer pending" });
    }
    await Group.updateOne(
      { _id: group._id },
      { $addToSet: { memberIds: req.user._id } }
    );
    await markInvitationNotificationRead(invitation._id, req.user._id);

    // Notify inviter
    const notification = await Notification.create({
      recipientId: invitation.invitedBy._id,
      senderId: req.user._id,
      type: "invitation_accepted",
      title: "Invitation Accepted",
      message: `${req.user.name} accepted your invitation to join "${group.name}"`,
      data: {
        groupId: group._id,
        invitationId: invitation._id,
      },
    });
    emitToUser(invitation.invitedBy._id, "invitation:updated", {
      invitationId: invitation._id,
      groupId: group._id,
      status: acceptedInvitation.status,
      memberId: req.user._id,
    });
    emitToUser(invitation.invitedBy._id, "notification:new", notification);

    res.status(200).json({
      success: true,
      message: `You joined ${group.name}!`,
      data: acceptedInvitation,
    });
  } catch (error) {
    next(error);
  }
};

// Reject an invitation
const rejectInvitation = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid invitation ID" });
    }

    const invitation = await Invitation.findById(req.params.id)
      .populate("groupId")
      .populate("invitedBy", "name");

    if (!invitation) {
      return res.status(404).json({ success: false, message: "Invitation not found" });
    }

    if (invitation.invitedUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to respond to this invitation" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ success: false, message: `Invitation is already ${invitation.status}` });
    }

    const rejectedInvitation = await Invitation.findOneAndUpdate(
      {
        _id: invitation._id,
        invitedUserId: req.user._id,
        status: "pending",
      },
      { $set: { status: "rejected" } },
      { new: true, runValidators: true }
    );
    if (!rejectedInvitation) {
      return res.status(400).json({ success: false, message: "Invitation is no longer pending" });
    }
    await markInvitationNotificationRead(invitation._id, req.user._id);

    // Notify inviter
    const notification = await Notification.create({
      recipientId: invitation.invitedBy._id,
      senderId: req.user._id,
      type: "invitation_rejected",
      title: "Invitation Declined",
      message: `${req.user.name} declined the invitation to join "${invitation.groupId.name}"`,
      data: {
        groupId: invitation.groupId._id,
        invitationId: invitation._id,
      },
    });
    emitToUser(invitation.invitedBy._id, "invitation:updated", {
      invitationId: invitation._id,
      groupId: invitation.groupId._id,
      status: rejectedInvitation.status,
      memberId: req.user._id,
    });
    emitToUser(invitation.invitedBy._id, "notification:new", notification);

    res.status(200).json({
      success: true,
      message: "Invitation declined",
      data: rejectedInvitation,
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
