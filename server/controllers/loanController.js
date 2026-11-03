const Loan = require("../model/loan.js");
const BorrowableItem = require("../model/borrowableItem.js");
const Group = require("../model/group.js");

const returnLoan = async (req, res, next) => {
  try {
    const loan = await Loan.findById(req.params.id);

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

module.exports = { returnLoan };
