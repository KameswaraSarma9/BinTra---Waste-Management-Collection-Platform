const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true },
    description: String,
    image: String,
    category: String,
    pointsRequired: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    materialUsed: String,
    status: {
      type: String,
      enum: ["ACTIVE", "OUT_OF_STOCK", "DISCONTINUED"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
