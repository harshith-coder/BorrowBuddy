const BorrowableItem = require("../model/borrowableItem.js");

const updateItem = async (req, res, next) => {
  try {
    const item = await BorrowableItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    const { name, category, description } = req.body;

    if (name !== undefined) item.name = name.trim();
    if (category !== undefined) item.category = category.trim();
    if (description !== undefined) item.description = description.trim();

    await item.save();

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { updateItem };