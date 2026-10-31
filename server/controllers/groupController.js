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
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Group name is required",
      });
    }

    const group = await Group.create({
      name: name.trim(),
      ownerId: req.user._id,
      memberIds: [req.user._id],
      managerIds: [req.user._id],
    });

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
    const query = { groupId: group._id };

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

    const { name, category, description } = req.body;

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

    if (!isManager(group, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Only a group manager can create loans",
      });
    }

    const { itemId, borrowerId, checkoutDate, dueDate, note } = req.body;

    if (!itemId || !borrowerId || !checkoutDate || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "Item, borrower, checkout date and due date are required",
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
      checkoutDate,
      dueDate,
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

module.exports = {
  createGroup,
  getGroups,
  getGroupItems,
  addItem,
  createLoan,
  getGroupLoans,
};