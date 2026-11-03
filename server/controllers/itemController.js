const BorrowableItem = require("../model/borrowableItem.js");
const Group = require("../model/group.js");

const getAccessibleItemQuery = async (userId) => {
  const userGroups = await Group.find({
    $or: [{ memberIds: userId }, { ownerId: userId }],
  }).select("_id memberIds");
  const userGroupIds = userGroups.map((group) => group._id);
  const peerUserIds = [
    ...new Set(
      userGroups.flatMap((group) => group.memberIds.map((id) => id.toString()))
    ),
  ];

  return {
    $or: [
      { ownerId: userId },
      { sharingType: "all", ownerId: { $in: peerUserIds } },
      { sharingType: "selected", sharedWithGroups: { $in: userGroupIds } },
    ],
  };
};

// Create an item with optional image and group sharing preferences
const createItem = async (req, res, next) => {
  try {
    const { name, category, description, sharingType, sharedWithGroups, groupId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Item name is required" });
    }

    let parsedSharedWith = [];
    if (sharedWithGroups) {
      parsedSharedWith = typeof sharedWithGroups === "string"
        ? JSON.parse(sharedWithGroups)
        : sharedWithGroups;
    }
    if (!Array.isArray(parsedSharedWith)) {
      return res.status(400).json({ success: false, message: "Selected groups must be an array" });
    }

    if (groupId) {
      const group = await Group.findOne({
        _id: groupId,
        $or: [{ memberIds: req.user._id }, { ownerId: req.user._id }],
      }).select("_id");
      if (!group) {
        return res.status(403).json({
          success: false,
          message: "You can only add items to groups you belong to",
        });
      }
    }

    if (sharingType === "selected") {
      const groups = await Group.find({
        _id: { $in: parsedSharedWith },
        $or: [{ memberIds: req.user._id }, { ownerId: req.user._id }],
      }).select("_id");
      if (groups.length !== parsedSharedWith.length || parsedSharedWith.length === 0) {
        return res.status(400).json({
          success: false,
          message: "You can only share an item with groups you belong to",
        });
      }
    }

    let imageUrl = "";
    if (req.file) {
      imageUrl = `uploads/${req.file.filename}`;
    }

    const item = await BorrowableItem.create({
      name: name.trim(),
      category: category ? category.trim() : "General",
      description: description ? description.trim() : "",
      ownerId: req.user._id,
      imageUrl,
      sharingType: sharingType === "selected" ? "selected" : "all",
      sharedWithGroups: parsedSharedWith,
      groupId: groupId || (parsedSharedWith.length === 1 ? parsedSharedWith[0] : undefined),
      status: "available",
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

// Get items accessible to the logged-in user
// Logic:
// 1. Items owned by the user.
// 2. Items shared with 'all' groups where the owner and viewer share at least one group.
// 3. Items shared with 'selected' groups where the viewer is a member of that group.
const getItems = async (req, res, next) => {
  try {
    const query = await getAccessibleItemQuery(req.user._id);

    const items = await BorrowableItem.find(query)
      .populate("ownerId", "name email phone avatar")
      .populate("sharedWithGroups", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

const getItemById = async (req, res, next) => {
  try {
    const accessQuery = await getAccessibleItemQuery(req.user._id);
    const item = await BorrowableItem.findOne({ _id: req.params.id, ...accessQuery })
      .populate("ownerId", "name email phone avatar")
      .populate("sharedWithGroups", "name");

    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

const updateItem = async (req, res, next) => {
  try {
    const item = await BorrowableItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    if (item.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the item owner can update this item" });
    }

    const { name, category, description, sharingType, sharedWithGroups } = req.body;

    if (name !== undefined) item.name = name.trim();
    if (category !== undefined) item.category = category.trim();
    if (description !== undefined) item.description = description.trim();
    if (sharingType !== undefined) item.sharingType = sharingType;
    if (sharedWithGroups !== undefined) {
      const parsedGroups = typeof sharedWithGroups === "string"
        ? JSON.parse(sharedWithGroups)
        : sharedWithGroups;
      if (!Array.isArray(parsedGroups)) {
        return res.status(400).json({ success: false, message: "Selected groups must be an array" });
      }
      if (item.sharingType === "selected") {
        const groups = await Group.find({
          _id: { $in: parsedGroups },
          $or: [{ memberIds: req.user._id }, { ownerId: req.user._id }],
        }).select("_id");
        if (groups.length !== parsedGroups.length || parsedGroups.length === 0) {
          return res.status(400).json({
            success: false,
            message: "You can only share an item with groups you belong to",
          });
        }
      }
      item.sharedWithGroups = parsedGroups;
    }
    if (item.sharingType === "all") item.sharedWithGroups = [];
    if (item.sharingType === "selected" && item.sharedWithGroups.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one group when using selected sharing",
      });
    }

    if (req.file) {
      item.imageUrl = `uploads/${req.file.filename}`;
    }

    await item.save();

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

const deleteItem = async (req, res, next) => {
  try {
    const item = await BorrowableItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    if (item.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only owner can delete this item" });
    }

    await item.deleteOne();
    res.status(200).json({ success: true, message: "Item deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
};
