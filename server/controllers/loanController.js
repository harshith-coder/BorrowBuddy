const mongoose = require("mongoose");
const Loan = require("../model/loan.js");
const BorrowableItem = require("../model/borrowableItem.js");
const Notification = require("../model/notification.js");
const { getVisibleItemQuery } = require("../utils/itemVisibility.js");

const activeStatuses = ["requested", "booked", "active"];
const isValidId = value => mongoose.Types.ObjectId.isValid(value);

const notify = (recipientId, senderId, type, title, message, data) =>
  Notification.create({ recipientId, senderId, type, title, message, data });

const syncItemStatus = async itemId => {
  const unresolvedLoan = await Loan.findOne({ itemId, status: { $in: activeStatuses } })
    .sort({ createdAt: -1 })
    .select("status");
  const status = unresolvedLoan
    ? unresolvedLoan.status === "active" ? "borrowed" : unresolvedLoan.status
    : "available";
  await BorrowableItem.findByIdAndUpdate(itemId, { $set: { status } });
};

const requestLoan = async (req, res, next) => {
  try {
    const { itemId, checkoutDate, dueDate, durationDays, note, groupId } = req.body || {};
    const borrowerId = req.user._id;
    if (!isValidId(itemId) || (groupId && !isValidId(groupId))) {
      return res.status(400).json({ success: false, message: "Valid item and group IDs are required" });
    }
    const visibilityQuery = await getVisibleItemQuery(borrowerId, groupId);
    const item = visibilityQuery
      ? await BorrowableItem.findOne({ _id: itemId, ...visibilityQuery })
      : null;
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });
    if (item.ownerId.toString() === borrowerId.toString()) {
      return res.status(400).json({ success: false, message: "You cannot borrow your own item" });
    }

    const checkout = checkoutDate ? new Date(checkoutDate) : new Date();
    const due = dueDate ? new Date(dueDate) : new Date(checkout.getTime() + 7 * 86400000);
    const duration = durationDays === undefined || durationDays === ""
      ? Math.ceil((due.getTime() - checkout.getTime()) / 86400000)
      : Number(durationDays);
    if (
      Number.isNaN(checkout.getTime()) ||
      Number.isNaN(due.getTime()) ||
      due < checkout ||
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 365
    ) {
      return res.status(400).json({ success: false, message: "Borrow duration must be a whole number from 1 to 365 days" });
    }

    const reservedItem = await BorrowableItem.findOneAndUpdate(
      { _id: itemId, status: "available" },
      { $set: { status: "requested" } },
      { returnDocument: "after" }
    );
    if (!reservedItem) {
      return res.status(400).json({ success: false, message: "This item is not available for borrowing" });
    }

    let loan;
    try {
      loan = await Loan.create({
        itemId,
        groupId: groupId || undefined,
        borrowerId,
        lenderId: item.ownerId,
        checkoutDate: checkout,
        dueDate: due,
        durationDays: duration,
        note: typeof note === "string" ? note.trim() : "",
        status: "requested",
      });
    } catch (error) {
      await BorrowableItem.findOneAndUpdate({ _id: itemId, status: "requested" }, { $set: { status: "available" } });
      throw error;
    }

    await notify(
      item.ownerId,
      borrowerId,
      "borrow_request",
      "New Borrow Request",
      `${req.user.name} requested to borrow "${item.name}"`,
      { itemId: item._id, loanId: loan._id, groupId: loan.groupId }
    );
    res.status(201).json({ success: true, data: loan });
  } catch (error) {
    next(error);
  }
};

const requestGroupLoan = (req, res, next) => {
  req.body = { ...(req.body || {}), groupId: req.params.id };
  return requestLoan(req, res, next);
};

const approveLoan = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid loan ID" });
    const loan = await Loan.findById(req.params.id).populate("itemId");
    if (!loan) return res.status(404).json({ success: false, message: "Loan request not found" });
    if (loan.lenderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the item owner can approve this request" });
    }
    if (loan.status !== "requested") {
      return res.status(400).json({ success: false, message: `Loan is already ${loan.status}` });
    }
    const conflictingLoan = await Loan.exists({
      itemId: loan.itemId._id,
      _id: { $ne: loan._id },
      status: { $in: ["booked", "active"] },
    });
    if (conflictingLoan) {
      return res.status(400).json({ success: false, message: "Another borrowing request already owns this item" });
    }

    const item = await BorrowableItem.findOneAndUpdate(
      { _id: loan.itemId._id, status: "requested" },
      { $set: { status: "borrowed" } },
      { returnDocument: "after" }
    );
    if (!item) return res.status(400).json({ success: false, message: "Item is no longer available for approval" });

    const activeLoan = await Loan.findOneAndUpdate(
      { _id: loan._id, status: "requested" },
      { $set: { status: "active" } },
      { returnDocument: "after", runValidators: true }
    );
    if (!activeLoan) {
      await syncItemStatus(item._id);
      return res.status(400).json({ success: false, message: "Loan is no longer pending" });
    }

    await notify(
      loan.borrowerId,
      req.user._id,
      "borrow_approved",
      "Borrow Request Approved",
      `Your request for "${item.name}" was approved`,
      { loanId: loan._id, itemId: item._id, groupId: loan.groupId }
    );
    res.status(200).json({ success: true, data: activeLoan });
  } catch (error) {
    next(error);
  }
};

const rejectLoan = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid loan ID" });
    const loan = await Loan.findById(req.params.id).populate("itemId");
    if (!loan) return res.status(404).json({ success: false, message: "Loan request not found" });
    if (loan.lenderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the item owner can reject this request" });
    }
    const rejectedLoan = await Loan.findOneAndUpdate(
      { _id: loan._id, status: "requested" },
      { $set: { status: "rejected" } },
      { returnDocument: "after", runValidators: true }
    );
    if (!rejectedLoan) return res.status(400).json({ success: false, message: `Loan is already ${loan.status}` });
    await syncItemStatus(loan.itemId._id);
    await notify(
      loan.borrowerId,
      req.user._id,
      "borrow_rejected",
      "Borrow Request Declined",
      `Your request for "${loan.itemId.name}" was declined`,
      { loanId: loan._id, itemId: loan.itemId._id, groupId: loan.groupId }
    );
    res.status(200).json({ success: true, data: rejectedLoan });
  } catch (error) {
    next(error);
  }
};

const activateLoan = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid loan ID" });
    const loan = await Loan.findById(req.params.id).populate("itemId");
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found" });
    const userId = req.user._id.toString();
    if (![loan.borrowerId, loan.lenderId].some(id => id.toString() === userId)) {
      return res.status(403).json({ success: false, message: "You are not authorized to activate this loan" });
    }
    const activeLoan = await Loan.findOneAndUpdate(
      { _id: loan._id, status: "booked" },
      { $set: { status: "active" } },
      { returnDocument: "after", runValidators: true }
    );
    if (!activeLoan) return res.status(400).json({ success: false, message: `Loan is already ${loan.status}` });
    const item = await BorrowableItem.findOneAndUpdate(
      { _id: loan.itemId._id, status: "booked" },
      { $set: { status: "borrowed" } },
      { returnDocument: "after" }
    );
    if (!item) {
      await Loan.findOneAndUpdate({ _id: loan._id, status: "active" }, { $set: { status: "booked" } });
      await syncItemStatus(loan.itemId._id);
      return res.status(400).json({ success: false, message: "Item is not in booked state" });
    }
    await notify(
      loan.borrowerId.toString() === userId ? loan.lenderId : loan.borrowerId,
      req.user._id,
      "loan_activated",
      "Loan Activated",
      `"${item.name}" is now active`,
      { loanId: loan._id, itemId: item._id, groupId: loan.groupId }
    );
    res.status(200).json({ success: true, data: activeLoan });
  } catch (error) {
    next(error);
  }
};

const getUserLoans = async (req, res, next) => {
  try {
    const loans = await Loan.find({ $or: [{ borrowerId: req.user._id }, { lenderId: req.user._id }] })
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
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid loan ID" });
    const loan = await Loan.findById(req.params.id).populate("itemId");
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found" });
    const userId = req.user._id.toString();
    if (![loan.borrowerId, loan.lenderId].some(id => id.toString() === userId)) {
      return res.status(403).json({ success: false, message: "You are not authorized to return this loan" });
    }
    if (!["active", "booked"].includes(loan.status)) {
      return res.status(400).json({ success: false, message: `Loan must be active to return (currently ${loan.status})` });
    }
    const requestedReturnDate = req.body?.returnDate ? new Date(req.body.returnDate) : new Date();
    const returnNote = typeof req.body?.note === "string" ? req.body.note.trim() : "";
    if (Number.isNaN(requestedReturnDate.getTime()) || returnNote.length > 500) {
      return res.status(400).json({ success: false, message: "Return details are invalid" });
    }
    const returnedLoan = await Loan.findOneAndUpdate(
      { _id: loan._id, status: { $in: ["active", "booked"] } },
      { $set: { status: "returned", returnDate: requestedReturnDate, returnNote } },
      { returnDocument: "after", runValidators: true }
    );
    if (!returnedLoan) return res.status(400).json({ success: false, message: "Loan is no longer active" });
    const item = await BorrowableItem.findOne({ _id: loan.itemId._id });
    if (!item) {
      await Loan.findOneAndUpdate(
        { _id: loan._id, status: "returned" },
        { $set: { status: "active" }, $unset: { returnDate: 1, returnNote: 1 } }
      );
      return res.status(404).json({ success: false, message: "The loan item could not be found" });
    }
    await syncItemStatus(item._id);
    const recipientId = loan.borrowerId.toString() === userId ? loan.lenderId : loan.borrowerId;
    await notify(
      recipientId,
      req.user._id,
      "item_returned",
      "Item Returned",
      `"${item.name}" was returned`,
      { loanId: loan._id, itemId: item._id, groupId: loan.groupId }
    );
    res.status(200).json({ success: true, data: returnedLoan });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestLoan,
  requestGroupLoan,
  approveLoan,
  rejectLoan,
  activateLoan,
  returnLoan,
  getUserLoans,
};
