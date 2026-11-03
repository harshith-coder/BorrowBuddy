const Loan = require("../model/loan.js");
const BorrowableItem = require("../model/borrowableItem.js");
const Notification = require("../model/notification.js");
const Group = require("../model/group.js");

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
      ? candidate.sharedWithGroups.some((sharedGroupId) =>
          borrowerGroupIds.includes(sharedGroupId.toString()))
      : await Group.exists({
          _id: { $in: borrowerGroupIds },
          $or: [
            { memberIds: candidate.ownerId },
            { ownerId: candidate.ownerId },
          ],
        });

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to borrow this item",
      });
    }

    const item = await BorrowableItem.findOneAndUpdate(
      { _id: itemId, status: "available" },
      { $set: { status: "requested" } },
      { new: true }
    );

    if (!item) {
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
    await BorrowableItem.findByIdAndUpdate(loan.itemId._id, { status: "available" });

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

const returnLoan = async (req, res, next) => {
  try {
    const loan = await Loan.findById(req.params.id).populate("itemId");

    if (!loan) {
      return res.status(404).json({ success: false, message: "Loan not found" });
    }

    const group = await Group.findById(loan.groupId).select("ownerId memberIds");
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    const userId = req.user._id.toString();
    const isGroupMember = group.ownerId.toString() === userId ||
      group.memberIds.some((memberId) => memberId.toString() === userId);
    if (!isGroupMember) {
      return res.status(403).json({ success: false, message: "You are not a member of this group" });
    }

    if (loan.status === "returned") {
      return res.status(400).json({ success: false, message: "Loan has already been returned" });
    }

    const requestedReturnDate = req.body?.returnDate ? new Date(req.body.returnDate) : new Date();
    if (Number.isNaN(requestedReturnDate.getTime())) {
      return res.status(400).json({ success: false, message: "Return date must be valid" });
    }

    const returnNote = typeof req.body?.note === "string" ? req.body.note.trim() : "";
    if (returnNote.length > 500) {
      return res.status(400).json({ success: false, message: "Return note cannot be more than 500 characters" });
    }

    // Conditional update prevents two return requests from creating duplicate transitions.
    const returnedLoan = await Loan.findOneAndUpdate(
      { _id: loan._id, status: { $in: ["active", "overdue"] } },
      { $set: { returnDate: requestedReturnDate, returnNote, status: "returned" } },
      { new: true, runValidators: true }
    );
    if (!returnedLoan) {
      return res.status(400).json({ success: false, message: "Loan has already been returned" });
    }

    try {
      const item = await BorrowableItem.findOneAndUpdate(
        { _id: loan.itemId, groupId: loan.groupId },
        { $set: { status: "available" } },
        { new: true }
      );
      if (!item) throw new Error("The loan item could not be found in its group");
    } catch (itemError) {
      await Loan.findOneAndUpdate(
        { _id: loan._id, status: "returned" },
        { $set: { status: loan.status }, $unset: { returnDate: 1, returnNote: 1 } }
      );
      throw itemError;
    }

    return res.status(200).json({ success: true, data: returnedLoan });
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
