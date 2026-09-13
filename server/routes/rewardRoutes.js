const express = require("express");
const router = express.Router();
const { getMyRewards, getMyTransactions } = require("../controllers/rewardController");
const { protect } = require("../middleware/auth");

router.get("/", protect, getMyRewards);
router.get("/transactions", protect, getMyTransactions);

module.exports = router;
