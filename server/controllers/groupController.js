const Group = require("../model/group.js");
const BorrowableItem = require("../model/borrowableItem.js");
const Loan = require("../model/loan.js");
const Invitation = require("../model/invitation.js");
const mongoose = require("mongoose");
const { getGroupForMember, getVisibleItemQuery } = require("../utils/itemVisibility.js");

const isGroupMember = (group, userId) => {
  const normalizedUserId = userId?.toString();
  if (!normalizedUserId || !group) return false;
  const normalizeId = value => (value?._id || value)?.toString();
  return normalizeId(group.ownerId) === normalizedUserId ||
    (Array.isArray(group.memberIds) &&
      group.memberIds.some((id) => normalizeId(id) === normalizedUserId));
};

const isManager = (group, userId) =>
  group.ownerId.toString() === userId.toString() ||
  group.managerIds.some((id) => id.toString() === userId.toString());

const unresolvedLoanStatuses = ["requested", "booked", "active"];

const hasUnresolvedGroupLoan = (groupId, userId) =>
  Loan.exists({
    groupId,
    $or: [{ borrowerId: userId }, { lenderId: userId }],
    status: { $in: unresolvedLoanStatuses },
  });

const createGroup = async (req, res, next) => {
  try {
    const { name, description, categories } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Group name is required",
      });
    }

    const parsedCategories = Array.isArray(categories)
      ? categories
      : (categories ? JSON.parse(categories) : []);
    const userId = req.user._id;

    const groupData = {
      name: name.trim(),
      description: description ? description.trim() : "",
      categories: parsedCategories,
      ownerId: userId,
      memberIds: [userId],
      managerIds: [userId],
    };

    // Handle image upload if file is present
    if (req.file) {
      groupData.image = `uploads/${req.file.filename}`;
    }

    const group = await Group.create(groupData);

    res.status(201).json({
      success: true,
      data: group,
    });
  } catch (error) {
    next(error);
  }
};

const getGroups = async (req, res, next) => {
  try {
    const acceptedInvitations = await Invitation.find({
      inviteeId: req.user._id,
      status: "accepted",
    }).select("groupId");
    const acceptedGroupIds = acceptedInvitations.map(invitation => invitation.groupId);
    if (acceptedGroupIds.length) {
      await Group.updateMany(
        { _id: { $in: acceptedGroupIds } },
        { $addToSet: { memberIds: req.user._id } }
      );
    }

    const groups = await Group.find({
      $or: [
        { ownerId: req.user._id },
        { memberIds: req.user._id },
      ],
    }).populate("ownerId", "name email avatar");

    res.status(200).json({
      success: true,
      data: groups,
    });
  } catch (error) {
    next(error);
  }
};

const getDiscoverableGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({
      ownerId: { $ne: req.user._id },
      memberIds: { $ne: req.user._id },
    })
      .populate("ownerId", "name email avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: groups });
  } catch (error) {
    next(error);
  }
};

const getGroupMembers = async (req, res, next) => {
  try {
    const membership = await getGroupForMember(req.params.id, req.user._id);
    const group = await Group.findById(req.params.id)
      .populate("memberIds", "name email phone avatar");

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (!membership || !isGroupMember(group, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    res.status(200).json({
      success: true,
      data: group.memberIds,
    });
  } catch (error) {
    next(error);
  }
};

const removeGroupMember = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id) ||
      !mongoose.Types.ObjectId.isValid(req.params.memberId)) {
      return res.status(400).json({ success: false, message: "Invalid group or member ID" });
    }

    const group = await Group.findById(req.params.id).select("ownerId memberIds");
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }
    if (group.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the group owner can remove members" });
    }
    if (group.ownerId.toString() === req.params.memberId) {
      return res.status(400).json({ success: false, message: "The group owner cannot be removed" });
    }
    if (!group.memberIds.some(id => id.toString() === req.params.memberId)) {
      return res.status(400).json({ success: false, message: "User is not a member of this group" });
    }
    if (await hasUnresolvedGroupLoan(group._id, req.params.memberId)) {
      return res.status(400).json({
        success: false,
        message: "This member cannot be removed while they have requested, booked, or active loans in this group",
      });
    }

    const updatedGroup = await Group.findOneAndUpdate(
      {
        _id: group._id,
        ownerId: req.user._id,
        memberIds: req.params.memberId,
      },
      { $pull: { memberIds: req.params.memberId, managerIds: req.params.memberId } },
      { returnDocument: "after" }
    );
    if (!updatedGroup) {
      return res.status(400).json({ success: false, message: "User is no longer a member of this group" });
    }

    res.status(200).json({ success: true, message: "Member removed successfully", data: updatedGroup });
  } catch (error) {
    next(error);
  }
};

const leaveGroup = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid group ID" });
    }

    const group = await Group.findById(req.params.id).select("ownerId memberIds");
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }
    const userId = req.user._id.toString();
    if (group.ownerId.toString() === userId) {
      return res.status(400).json({ success: false, message: "The group owner cannot leave this group" });
    }
    if (!group.memberIds.some(id => id.toString() === userId)) {
      return res.status(403).json({ success: false, message: "You are not a member of this group" });
    }
    if (await hasUnresolvedGroupLoan(group._id, req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot leave while you have requested, booked, or active loans in this group",
      });
    }

    const updatedGroup = await Group.findOneAndUpdate(
      { _id: group._id, memberIds: req.user._id, ownerId: { $ne: req.user._id } },
      { $pull: { memberIds: req.user._id, managerIds: req.user._id } },
      { returnDocument: "after" }
    );
    if (!updatedGroup) {
      return res.status(400).json({ success: false, message: "You are no longer a member of this group" });
    }

    res.status(200).json({ success: true, message: "You left the group successfully", data: updatedGroup });
  } catch (error) {
    next(error);
  }
};

const deleteGroup = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid group ID" });
    }

    const group = await Group.findById(req.params.id).select("_id ownerId");
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }
    if (group.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the group owner can delete this group" });
    }

    const unresolvedLoan = await Loan.exists({
      groupId: group._id,
      status: { $in: unresolvedLoanStatuses },
    });
    if (unresolvedLoan) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete the group while requested, booked, or active loans exist",
      });
    }

    const deletedGroup = await Group.findOneAndDelete({
      _id: group._id,
      ownerId: req.user._id,
    });
    if (!deletedGroup) {
      return res.status(400).json({ success: false, message: "Group could not be deleted" });
    }

    await Invitation.updateMany(
      { groupId: group._id, status: "pending" },
      { $set: { status: "cancelled" } }
    );
    await BorrowableItem.updateMany(
      { groupId: group._id },
      { $unset: { groupId: 1 } }
    );
    await BorrowableItem.updateMany(
      { sharedWithGroups: group._id },
      { $pull: { sharedWithGroups: group._id } }
    );

    res.status(200).json({
      success: true,
      message: "Group deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getGroupItems = async (req, res, next) => {
  try {
    const group = await getGroupForMember(req.params.id, req.user._id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const { search, category, status } = req.query;
    const visibilityQuery = await getVisibleItemQuery(req.user._id, group._id);
    const query = { ...visibilityQuery };

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (category) query.category = category;
    if (status) query.status = status;

    const items = await BorrowableItem.find(query);

    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

const addItem = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (!isManager(group, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Only a group manager can add items",
      });
    }

    const { name, category, description } = req.body || {};

    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: "Item name and category are required",
      });
    }

    const item = await BorrowableItem.create({
      groupId: group._id,
      name: name.trim(),
      category: category.trim(),
      description: description ? description.trim() : "",
      ownerId: req.user._id,
      status: "available",
    });

    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

const getGroupLoans = async (req, res, next) => {
  try {
    const membership = await getGroupForMember(req.params.id, req.user._id);
    if (!membership) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const bookedLoans = await Loan.find({
      groupId: membership._id,
      status: "booked",
    }).select("itemId");
    if (bookedLoans.length) {
      await Loan.updateMany(
        { _id: { $in: bookedLoans.map(loan => loan._id) }, status: "booked" },
        { $set: { status: "active" } }
      );
      await BorrowableItem.updateMany(
        { _id: { $in: bookedLoans.map(loan => loan.itemId) }, status: "booked" },
        { $set: { status: "borrowed" } }
      );
    }

    const loans = await Loan.find({ groupId: membership._id })
      .populate("itemId")
      .populate("borrowerId", "name email");

    res.status(200).json({
      success: true,
      data: loans,
    });
  } catch (error) {
    next(error);
  }
};

const getGroupDetails = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("memberIds", "name email avatar")
      .populate("ownerId", "name email");

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (!isGroupMember(group, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    const visibilityQuery = await getVisibleItemQuery(req.user._id, group._id);
    const items = await BorrowableItem.find(visibilityQuery);

    // Get active loans for this group
    const activeLoans = await Loan.find({
      groupId: group._id,
      status: { $in: ["active", "overdue"] },
    })
      .populate({
        path: "itemId",
        populate: { path: "ownerId", select: "name email" },
      })
      .populate("borrowerId", "name email");

    // Get items per member
    const itemsByMember = {};
    items.forEach(item => {
      if (item.ownerId) {
        const ownerId = item.ownerId.toString();
        if (!itemsByMember[ownerId]) {
          itemsByMember[ownerId] = [];
        }
        itemsByMember[ownerId].push(item);
      }
    });

    // Also populate owner info for items
    const itemsWithOwners = await BorrowableItem.find(visibilityQuery)
      .populate("ownerId", "name email");

    // Rebuild itemsByMember with populated owner info
    const itemsByMemberWithOwners = {};
    itemsWithOwners.forEach(item => {
      if (item.ownerId) {
        const ownerId = item.ownerId._id.toString();
        if (!itemsByMemberWithOwners[ownerId]) {
          itemsByMemberWithOwners[ownerId] = [];
        }
        itemsByMemberWithOwners[ownerId].push(item);
      }
    });

    res.status(200).json({
      success: true,
      data: {
        group,
        members: group.memberIds,
        items: itemsWithOwners,
        activeLoans,
        itemsByMember: itemsByMemberWithOwners,
        stats: {
          memberCount: group.memberIds.length,
          itemCount: items.length,
          activeLoanCount: activeLoans.length,
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGroup,
  getGroups,
  getGroupMembers,
  removeGroupMember,
  leaveGroup,
  deleteGroup,
  getGroupItems,
  addItem,
  getGroupLoans,
  getGroupDetails,
  getDiscoverableGroups,
};
