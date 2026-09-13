const RewardTransaction = require("../models/RewardTransaction");

exports.getMyRewards = async (req, res) => {
  try {
    res.json({ balance: req.user.rewardPoints });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch reward balance", error: err.message });
  }
};

exports.getMyTransactions = async (req, res) => {
  try {
    const transactions = await RewardTransaction.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch transactions", error: err.message });
  }
};
