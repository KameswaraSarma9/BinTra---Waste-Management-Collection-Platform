const mongoose = require("mongoose");

const rewardTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["EARNED", "REDEEMED", "REFUNDED", "ADJUSTED"],
      required: true,
    },
    points: { type: Number, required: true }, // positive for earned/refunded, negative for redeemed
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "GarbageBooking" },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    note: String,
    balanceAfter: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("RewardTransaction", rewardTransactionSchema);
