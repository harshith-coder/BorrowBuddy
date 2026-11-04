const Invitation = require("../model/invitation.js");
const Group = require("../model/group.js");
const User = require("../model/user.js");
const Notification = require("../model/notification.js");
const mongoose = require("mongoose");
const { emitToUser } = require("../config/socket.js");
const mongoose = require("mongoose");

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const markInvitationNotificationRead = (invitationId, userId) =>
  Notification.updateMany(
    { recipientId: userId, "data.invitationId": invitationId },
    { $set: { read: true } }
  );

const isValidId = value => mongoose.Types.ObjectId.isValid(value);

const createInvitationNotification = async ({ recipientId, senderId, type, title, message, data }) => {
  const notification = await Notification.create({
    recipientId,
    senderId,
    type,
    title,
    message,
    data,
  });
  emitToUser(recipientId, "notification:new", notification);
  return notification;
};

// Send an invitation to a user to join a group
const sendInvitation = async (req, res, next) => {
  try {
    const { groupId, invitedUserId, message } = req.body;
    const inviterId = req.user._id;

    if (!isValidId(groupId) || !isValidId(inviteeId)) {
      return res.status(400).json({ success: false, message: "Group ID and Invitee ID are required" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    // Any existing member, including the owner, can invite another user.
    const isMember = group.ownerId.toString() === inviterId.toString() ||
      group.memberIds.some(id => id.toString() === inviterId.toString());
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "Only group members can invite other users",
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

    let invitation;
    try {
      invitation = await Invitation.create({
        groupId,
        inviterId,
        inviteeId,
        message: message ? message.trim() : "",
        status: "pending",
        requestType: "owner_invitation",
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "An invitation is already pending for this user",
        });
      }
      throw error;
    }

    // Create real notification for invitee
    await createInvitationNotification({
      recipientId: inviteeId,
      senderId: inviterId,
      type: "group_invitation",
      title: "Group Invitation",
      message: `${req.user.name} invited you to join "${group.name}"`,
      data: { groupId: group._id, invitationId: invitation._id },
    });
    emitToUser(invitedUserId, "invitation:new", {
      invitationId: invitation._id,
      groupId: group._id,
      groupName: group.name,
      inviterName: req.user.name,
      message: invitation.message,
    });

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
    const invitations = await Invitation.find({
      $or: [{ inviteeId: userId }, { requestedBy: userId }],
    })
      .populate("groupId", "name description image")
      .populate("inviterId", "name email avatar")
      .populate("requestedBy", "name email avatar")
      .sort({ createdAt: -1 });

    const data = invitations.map(invitation => ({
      ...invitation.toObject(),
      direction: invitation.requestType === "member_request"
        ? "outgoing"
        : invitation.inviteeId.toString() === userId.toString() ? "incoming" : "outgoing",
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Accept an invitation
const acceptInvitation = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid invitation ID" });
    }
    const invitation = await Invitation.findById(req.params.id)
      .populate("groupId")
      .populate("invitedBy", "name");

    if (!invitation) {
      return res.status(404).json({ success: false, message: "Invitation not found" });
    }
    if (invitation.requestType === "member_request") {
      return res.status(403).json({ success: false, message: "Only the group owner can approve membership requests" });
    }

    if (invitation.invitedUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to accept this invitation" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ success: false, message: `Invitation is already ${invitation.status}` });
    }

    const inviteeId = invitation.inviteeId;
    const updatedInvitation = await Invitation.findOneAndUpdate(
      {
        _id: invitation._id,
        inviteeId,
        status: "pending",
      },
      { $set: { status: "accepted" } },
      { returnDocument: "after", runValidators: true }
    );
    if (!updatedInvitation) {
      return res.status(400).json({ success: false, message: "Invitation is no longer pending" });
    }

    const group = await Group.findByIdAndUpdate(
      { _id: invitation.groupId._id },
      { $addToSet: { memberIds: inviteeId } },
      { returnDocument: "after" }
    );
    if (!group) {
      await Invitation.findOneAndUpdate(
        { _id: invitation._id, status: "accepted" },
        { $set: { status: "pending" } }
      );
      return res.status(404).json({ success: false, message: "Associated group not found" });
    }
    if (!group.memberIds.some(memberId => memberId.toString() === inviteeId.toString())) {
      await Invitation.findOneAndUpdate(
        { _id: invitation._id, status: "accepted" },
        { $set: { status: "pending" } }
      );
      return res.status(500).json({ success: false, message: "Could not add you to the group" });
    }

    // Notify inviter
    await createInvitationNotification({
      recipientId: invitation.inviterId._id,
      senderId: req.user._id,
      type: "invitation_accepted",
      title: "Invitation Accepted",
      message: `${req.user.name} accepted your invitation to join "${group.name}"`,
      data: { groupId: group._id, invitationId: invitation._id },
    });
    emitToUser(invitation.invitedBy._id, "invitation:updated", {
      invitationId: invitation._id,
      groupId: group._id,
      status: updatedInvitation.status,
      memberId: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: `You joined ${group.name}!`,
      data: updatedInvitation,
    });
  } catch (error) {
    next(error);
  }
};

// Reject an invitation
const rejectInvitation = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid invitation ID" });
    }
    const invitation = await Invitation.findById(req.params.id)
      .populate("groupId")
      .populate("invitedBy", "name");

    if (!invitation) {
      return res.status(404).json({ success: false, message: "Invitation not found" });
    }
    if (invitation.requestType === "member_request") {
      return res.status(403).json({ success: false, message: "Only the group owner can reject membership requests" });
    }

    if (invitation.invitedUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to respond to this invitation" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ success: false, message: `Invitation is already ${invitation.status}` });
    }

    const updatedInvitation = await Invitation.findOneAndUpdate(
      { _id: invitation._id, status: "pending" },
      { $set: { status: "rejected" } },
      { returnDocument: "after", runValidators: true }
    );
    if (!updatedInvitation) {
      return res.status(400).json({ success: false, message: "Invitation is no longer pending" });
    }

    // Notify inviter
    await createInvitationNotification({
      recipientId: invitation.inviterId._id,
      senderId: req.user._id,
      type: "invitation_rejected",
      title: "Invitation Declined",
      message: `${req.user.name} declined the invitation to join "${invitation.groupId.name}"`,
      data: { groupId: invitation.groupId._id, invitationId: invitation._id },
    });
    emitToUser(invitation.invitedBy._id, "invitation:updated", {
      invitationId: invitation._id,
      groupId: invitation.groupId._id,
      status: updatedInvitation.status,
      memberId: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: "Invitation declined",
      data: updatedInvitation,
    });
  } catch (error) {
    next(error);
  }
};

const requestToJoinGroup = async (req, res, next) => {
  try {
    const { groupId, message } = req.body;
    if (!isValidId(groupId)) {
      return res.status(400).json({ success: false, message: "Valid group ID is required" });
    }

    const group = await Group.findById(groupId).select("name ownerId memberIds");
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    const userId = req.user._id;
    if (group.ownerId.toString() === userId.toString() ||
      group.memberIds.some(id => id.toString() === userId.toString())) {
      return res.status(400).json({ success: false, message: "You already belong to this group" });
    }

    const existingRequest = await Invitation.findOne({
      groupId,
      inviteeId: userId,
      requestType: "member_request",
      status: "pending",
    });
    if (existingRequest) {
      return res.status(400).json({ success: false, message: "A membership request is already pending" });
    }

    let request;
    try {
      request = await Invitation.create({
        groupId,
        inviterId: userId,
        inviteeId: userId,
        requestedBy: userId,
        requestType: "member_request",
        message: typeof message === "string" ? message.trim() : "",
        status: "pending",
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: "A membership request is already pending" });
      }
      throw error;
    }

    await createInvitationNotification({
      recipientId: group.ownerId,
      senderId: userId,
      type: "membership_request",
      title: "New Membership Request",
      message: `${req.user.name} requested to join "${group.name}"`,
      data: { groupId: group._id, invitationId: request._id, requestedBy: userId },
    });

    res.status(201).json({
      success: true,
      message: "Membership request sent",
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

const getOwnerRequests = async (req, res, next) => {
  try {
    const groups = await Group.find({ ownerId: req.user._id }).select("_id");
    const groupIds = groups.map(group => group._id);
    const requests = await Invitation.find({
      groupId: { $in: groupIds },
      requestType: "member_request",
    })
      .populate("groupId", "name description image")
      .populate("requestedBy", "name email avatar")
      .populate("inviteeId", "name email avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

const updateMembershipRequest = async (req, res, next, status) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid request ID" });
    }

    const request = await Invitation.findOne({
      _id: req.params.id,
      requestType: "member_request",
    })
      .populate("groupId", "name ownerId memberIds")
      .populate("requestedBy", "name")
      .populate("inviteeId", "name");

    if (!request) {
      return res.status(404).json({ success: false, message: "Membership request not found" });
    }
    if (request.groupId.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the group owner can manage membership requests" });
    }

    const updatedRequest = await Invitation.findOneAndUpdate(
      { _id: request._id, status: "pending" },
      { $set: { status } },
      { returnDocument: "after", runValidators: true }
    );
    if (!updatedRequest) {
      return res.status(400).json({ success: false, message: "Membership request is no longer pending" });
    }

    if (status === "accepted") {
      const updatedGroup = await Group.findOneAndUpdate(
        { _id: request.groupId._id, ownerId: req.user._id },
        { $addToSet: { memberIds: request.inviteeId._id } },
        { returnDocument: "after" }
      );
      if (!updatedGroup) {
        await Invitation.findOneAndUpdate(
          { _id: request._id, status: "accepted" },
          { $set: { status: "pending" } }
        );
        return res.status(404).json({ success: false, message: "Group not found" });
      }
    }

    const recipientId = request.requestedBy._id;
    const type = status === "accepted"
      ? "membership_request_approved"
      : "membership_request_rejected";
    const title = status === "accepted"
      ? "Membership Request Approved"
      : "Membership Request Rejected";
    const message = status === "accepted"
      ? `Your request to join "${request.groupId.name}" was approved`
      : `Your request to join "${request.groupId.name}" was rejected`;

    const notification = await createInvitationNotification({
      recipientId,
      senderId: req.user._id,
      type,
      title,
      message,
      data: { groupId: request.groupId._id, invitationId: request._id, requestedBy: recipientId },
    });
    emitToUser(recipientId, "invitation:updated", {
      invitationId: request._id,
      groupId: request.groupId._id,
      status,
    });

    res.status(200).json({ success: true, message: title, data: updatedRequest, notification });
  } catch (error) {
    next(error);
  }
};

const approveMembershipRequest = (req, res, next) =>
  updateMembershipRequest(req, res, next, "accepted");

const rejectMembershipRequest = (req, res, next) =>
  updateMembershipRequest(req, res, next, "rejected");

module.exports = {
  sendInvitation,
  getMyInvitations,
  acceptInvitation,
  rejectInvitation,
  requestToJoinGroup,
  getOwnerRequests,
  approveMembershipRequest,
  rejectMembershipRequest,
};
