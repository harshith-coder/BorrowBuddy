const Loan = require("../model/loan.js");
const BorrowableItem = require("../model/borrowableItem.js");

const returnLoan = async (req, res, next) => {
  try {
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    if (loan.status === "returned") {
      return res.status(400).json({
        success: false,
        message: "Loan has already been returned",
      });
    }

    loan.returnDate = new Date();
    loan.status = "returned";
    await loan.save();

    await BorrowableItem.findByIdAndUpdate(loan.itemId, {
      status: "available",
    });

    res.status(200).json({
      success: true,
      data: loan,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { returnLoan };