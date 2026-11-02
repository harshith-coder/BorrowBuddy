const mongoose = require("mongoose");

const borrowableItemSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: [true, "Item must belong to a group"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Please provide an item name"],
      trim: true,
      maxlength: [100, "Item name cannot be more than 100 characters"],
    },
    category: {
      type: String,
      required: [true, "Please provide an item category"],
      trim: true,
      default: "General",
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["available", "borrowed", "maintenance", "retired"],
      default: "available",
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    imageUrl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.BorrowableItem ||
  mongoose.model("BorrowableItem", borrowableItemSchema);
