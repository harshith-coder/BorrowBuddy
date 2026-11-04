const mongoose = require("mongoose");

const borrowableItemSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      // Optional if item is shared to multiple selected groups or all groups
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
      enum: ["available", "requested", "booked", "borrowed", "maintenance", "retired"],
      default: "available",
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    sharingType: {
      type: String,
      enum: ["all", "selected"],
      default: "all",
    },
    sharedWithGroups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
      },
    ],
  },
  {
    timestamps: true,
  }
);

borrowableItemSchema.index({ sharingType: 1, sharedWithGroups: 1, ownerId: 1 });

module.exports =
  mongoose.models.BorrowableItem ||
  mongoose.model("BorrowableItem", borrowableItemSchema);
