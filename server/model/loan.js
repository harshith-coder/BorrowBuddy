const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
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
    lenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    checkoutDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
    },
    durationDays: {
      type: Number,
      min: [1, "Borrow duration must be at least one day"],
    },
    returnDate: {
      type: Date,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    returnNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: [500, "Return note cannot be more than 500 characters"],
    },
    status: {
      type: String,
      enum: ["requested", "booked", "active", "returned", "rejected", "cancelled"],
      default: "requested",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Loan || mongoose.model("Loan", loanSchema);
