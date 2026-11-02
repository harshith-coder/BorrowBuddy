const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: [true, "Loan must belong to a group"],
      index: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BorrowableItem",
      required: [true, "Loan must have an associated item"],
      index: true,
    },
    borrowerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Loan must have a borrower"],
      index: true,
    },
    checkoutDate: {
      type: Date,
      required: [true, "Checkout date is required"],
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },
    returnDate: {
      type: Date,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "returned", "overdue"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Loan || mongoose.model("Loan", loanSchema);
