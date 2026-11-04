const express = require("express");
const multer = require("multer");

const router = express.Router();

const {
  createGroup,
  getGroups,
  getGroupItems,
  addItem,
  getGroupLoans,
  addGroupMember,
  getGroupMembers,
  getGroupDetails,
  getDiscoverableGroups,
  removeGroupMember,
  leaveGroup,
  deleteGroup
} = require("../controllers/groupController.js");
const { requestGroupLoan } = require("../controllers/loanController.js");

const { protect } = require("../middleware/authMiddleware.js");
const { Constants } = require("../config/constants.js");

// Configure multer for group image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, Constants.UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'group-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, JPG, and PNG files are allowed'), false);
    }
  }
});

router.post("/", protect, upload.single('image'), createGroup);
router.get("/", protect, getGroups);
router.get("/discover", protect, getDiscoverableGroups);
router.get("/:id/details", protect, getGroupDetails);

router.get("/:id/items", protect, getGroupItems);
router.post("/:id/items", protect, addItem);

router.post("/:id/loans", protect, requestGroupLoan);
router.get("/:id/loans", protect, getGroupLoans);

router.get("/:id/members", protect, getGroupMembers);
router.delete("/:id/members/:memberId", protect, removeGroupMember);
router.patch("/:id/leave", protect, leaveGroup);
router.delete("/:id", protect, deleteGroup);
module.exports = router;
