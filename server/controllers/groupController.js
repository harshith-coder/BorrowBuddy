const Group = require("../model/group.js");
const BorrowableItem = require("../model/borrowableItem.js");
const Loan = require("../model/loan.js");

const isGroupMember = (group, userId) =>
  group.ownerId.toString() === userId.toString() ||
  group.memberIds.some((id) => id.toString() === userId.toString());

const isManager = (group, userId) =>
  group.ownerId.toString() === userId.toString() ||
  group.managerIds.some((id) => id.toString() === userId.toString());

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
    const groups = await Group.find({
      $or: [
        { ownerId: req.user._id },
        { memberIds: req.user._id },
      ],
    });

    res.status(200).json({
      success: true,
      data: groups,
    });
  } catch (error) {
    next(error);
  }
};

const getGroupMembers = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("memberIds", "name email phone avatar");

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

    res.status(200).json({
      success: true,
      data: group.memberIds,
    });
  } catch (error) {
    next(error);
  }
};

const getGroupItems = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

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

    const { search, category, status } = req.query;
    const query = {
      $or: [
        { ownerId: req.user._id, sharingType: "all" },
        { sharedWithGroups: group._id },
        { groupId: group._id },
      ],
    };

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

const createLoan = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

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

    const {
      itemId,
      checkoutDate,
      dueDate,
      note,
    } = req.body || {};
    const borrowerId = req.user._id;

    if (!itemId || !checkoutDate || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "Item, checkout date and due date are required",
      });
    }

    const parsedCheckoutDate = new Date(checkoutDate);
    const parsedDueDate = new Date(dueDate);

    if (
      Number.isNaN(parsedCheckoutDate.getTime()) ||
      Number.isNaN(parsedDueDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Checkout date and due date must be valid dates",
      });
    }

    if (parsedDueDate < parsedCheckoutDate) {
      return res.status(400).json({
        success: false,
        message: "Due date cannot be before checkout date",
      });
    }

    const item = await BorrowableItem.findOne({
      _id: itemId,
      groupId: group._id,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found in this group",
      });
    }

    if (item.status !== "available") {
      return res.status(400).json({
        success: false,
        message: "Item is not available",
      });
    }

    if (!isGroupMember(group, borrowerId)) {
      return res.status(400).json({
        success: false,
        message: "Borrower is not a member of this group",
      });
    }

    const loan = await Loan.create({
      groupId: group._id,
      itemId,
      borrowerId,
      checkoutDate: parsedCheckoutDate,
      dueDate: parsedDueDate,
      note: note || "",
      status: "active",
    });

    item.status = "borrowed";
    await item.save();

    res.status(201).json({
      success: true,
      data: loan,
    });
  } catch (error) {
    next(error);
  }
};

const getGroupLoans = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

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

    const loans = await Loan.find({ groupId: group._id })
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

    // Get items for this group
    const items = await BorrowableItem.find({ groupId: group._id });

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
    const itemsWithOwners = await BorrowableItem.find({ groupId: group._id })
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
  getGroupItems,
  addItem,
  createLoan,
  getGroupLoans,
  getGroupDetails,
};
