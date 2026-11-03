const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Notification must have a recipient"],
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: [
        "group_invitation",
        "invitation_accepted",
        "invitation_rejected",
        "membership_request",
        "membership_request_approved",
        "membership_request_rejected",
        "borrow_request",
        "borrow_approved",
        "borrow_rejected",
        "loan_activated",
        "item_returned",
        "general"
      ],
      required: [true, "Notification type is required"],
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    data: {
      groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: "BorrowableItem" },
      loanId: { type: mongoose.Schema.Types.ObjectId, ref: "Loan" },
      invitationId: { type: mongoose.Schema.Types.ObjectId, ref: "Invitation" },
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);
