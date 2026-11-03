const mongoose = require("mongoose");

const invitationSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: [true, "Invitation must be associated with a group"],
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Invitation must have an inviter"],
    },
    invitedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Invitation must have an invitee"],
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    message: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate pending invitations for the same group and user.
invitationSchema.index(
  { groupId: 1, invitedUserId: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

module.exports =
  mongoose.models.Invitation || mongoose.model("Invitation", invitationSchema);
