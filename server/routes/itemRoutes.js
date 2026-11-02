const express = require("express");
const { updateItem } = require("../controllers/itemController.js");
const { protect } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.patch("/:id", protect, updateItem);

module.exports = router;