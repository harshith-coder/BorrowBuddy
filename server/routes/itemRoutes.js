const express = require("express");
const multer = require("multer");
const {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
} = require("../controllers/itemController.js");
const { protect } = require("../middleware/authMiddleware.js");
const { Constants } = require("../config/constants.js");

const router = express.Router();

// Multer storage for item images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, Constants.UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "item-" + uniqueSuffix + "." + file.originalname.split(".").pop());
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: function (req, file, cb) {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, JPG, PNG, and WebP images are allowed"), false);
    }
  },
});

router.post("/", protect, upload.single("image"), createItem);
router.get("/", protect, getItems);
router.get("/:id", protect, getItemById);
router.patch("/:id", protect, upload.single("image"), updateItem);
router.delete("/:id", protect, deleteItem);

module.exports = router;
