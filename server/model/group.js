const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a group name"],
      trim: true,
      maxlength: [100, "Group name cannot be more than 100 characters"],
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: [150, "Description cannot be more than 150 characters"],
    },
    categories: {
      type: [String],
      default: [],
    },
    image: {
      type: String,
      default: "",
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Group must have an owner"],
      index: true,
    },
    memberIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    managerIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Group || mongoose.model("Group", groupSchema);
