const Loan = require("../model/loan.js");
const BorrowableItem = require("../model/borrowableItem.js");
const Notification = require("../model/notification.js");
const Group = require("../model/group.js");

// Request to borrow an item (with self-borrow guard & race-condition check)
const requestLoan = async (req, res, next) => {
  try {
    const { itemId, dueDate, note, groupId } = req.body;
    const borrowerId = req.user._id;

    if (!itemId) {
      return res.status(400).json({ success: false, message: "Item ID is required" });
    }

    const candidate = await BorrowableItem.findById(itemId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    if (candidate.ownerId.toString() === borrowerId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot borrow your own item",
      });
    }

    const borrowerGroups = await Group.find({
      $or: [{ memberIds: borrowerId }, { ownerId: borrowerId }],
    }).select("_id");
    const borrowerGroupIds = borrowerGroups.map((group) => group._id.toString());
    const canAccess = candidate.sharingType === "selected"
      ? candidate.sharedWithGroups.some((groupId) => borrowerGroupIds.includes(groupId.toString()))
      : (await Group.exists({
          _id: { $in: borrowerGroupIds },
          $or: [
            { memberIds: candidate.ownerId },
            { ownerId: candidate.ownerId },
          ],
        }));

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to borrow this item",
      });
    }

    // Atomic find-and-update prevents two users from booking simultaneously.
    const item = await BorrowableItem.findOneAndUpdate(
      { _id: itemId, status: "available" },
      { $set: { status: "requested" } },
      { new: true }
    );

    if (!item) {
      // Check if it exists or already booked
      const existing = await BorrowableItem.findById(itemId);
      if (!existing) {
        return res.status(404).json({ success: false, message: "Item not found" });
      }
      return res.status(400).json({
        success: false,
        message: `This item is not available for borrowing (currently ${existing.status})`,
      });
    }

    const loan = await Loan.create({
      itemId: item._id,
      groupId: groupId || item.groupId,
      borrowerId,
      lenderId: item.ownerId,
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      note: note ? note.trim() : "",
      status: "requested",
    });

    // Notify the owner
    await Notification.create({
      recipientId: item.ownerId,
      senderId: borrowerId,
      type: "borrow_request",
      title: "New Borrow Request",
      message: `${req.user.name} requested to borrow "${item.name}"`,
      data: {
        itemId: item._id,
        loanId: loan._id,
        groupId: loan.groupId,
      },
    });

    res.status(201).json({ success: true, data: loan });
  } catch (error) {
    next(error);
  }
};

// Approve borrow request (Owner accepts)
const approveLoan = async (req, res, next) => {
  try {
    const loan = await Loan.findById(req.params.id).populate("itemId");
    if (!loan) {
      return res.status(404).json({ success: false, message: "Loan request not found" });
    }

    if (loan.lenderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the item owner can approve this request" });
    }

    if (loan.status !== "requested") {
      return res.status(400).json({ success: false, message: `Loan is already ${loan.status}` });
    }

    loan.status = "booked";
    await loan.save();

    await BorrowableItem.findByIdAndUpdate(loan.itemId._id, { status: "booked" });

    // Notify borrower
    await Notification.create({
      recipientId: loan.borrowerId,
      senderId: req.user._id,
      type: "borrow_approved",
      title: "Borrow Request Approved",
      message: `Your request for "${loan.itemId.name}" was approved!`,
      data: { loanId: loan._id, itemId: loan.itemId._id },
    });

    res.status(200).json({ success: true, data: loan });
  } catch (error) {
    next(error);
  }
};

// Reject borrow request (Owner declines)
const rejectLoan = async (req, res, next) => {
  try {
    const loan = await Loan.findById(req.params.id).populate("itemId");
    if (!loan) {
      return res.status(404).json({ success: false, message: "Loan request not found" });
    }

    if (loan.lenderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the item owner can reject this request" });
    }

    if (loan.status !== "requested") {
      return res.status(400).json({ success: false, message: `Loan is already ${loan.status}` });
    }

    loan.status = "rejected";
    await loan.save();

    // Release item back to available
    await BorrowableItem.findByIdAndUpdate(loan.itemId._id, { status: "available" });

    // Notify borrower
    await Notification.create({
      recipientId: loan.borrowerId,
      senderId: req.user._id,
      type: "borrow_rejected",
      title: "Borrow Request Declined",
      message: `Your request for "${loan.itemId.name}" was declined.`,
      data: { loanId: loan._id, itemId: loan.itemId._id },
    });

    res.status(200).json({ success: true, data: loan });
  } catch (error) {
    next(error);
  }
};

// Return item (Borrower returns or lender confirms return)
const returnLoan = async (req, res, next) => {
  try {
    const loan = await Loan.findById(req.params.id).populate("itemId");

    if (!loan) {
      return res.status(404).json({ success: false, message: "Loan not found" });
    }

    const userId = req.user._id.toString();
    if (loan.borrowerId.toString() !== userId && loan.lenderId.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized to return this loan" });
    }

    if (!["booked", "active"].includes(loan.status)) {
      return res.status(400).json({
        success: false,
        message: `A ${loan.status} loan cannot be returned`,
      });
    }

    loan.returnDate = new Date();
    loan.status = "returned";
    await loan.save();

    await BorrowableItem.findByIdAndUpdate(loan.itemId._id, { status: "available" });

    // Notify the other party
    const targetUserId = loan.borrowerId.toString() === userId ? loan.lenderId : loan.borrowerId;
    await Notification.create({
      recipientId: targetUserId,
      senderId: req.user._id,
      type: "item_returned",
      title: "Item Returned",
      message: `"${loan.itemId.name}" has been marked as returned and is now available.`,
      data: { loanId: loan._id, itemId: loan.itemId._id },
    });

    res.status(200).json({ success: true, data: loan });
  } catch (error) {
    next(error);
  }
};

// Get all loans where user is borrower or lender
const getUserLoans = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const loans = await Loan.find({
      $or: [{ borrowerId: userId }, { lenderId: userId }],
    })
      .populate("itemId")
      .populate("borrowerId", "name email phone avatar")
      .populate("lenderId", "name email phone avatar")
      .populate("groupId", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: loans });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestLoan,
  approveLoan,
  rejectLoan,
  returnLoan,
  getUserLoans,
};
