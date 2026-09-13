const mongoose = require("mongoose");

const garbageYardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    location: {
      lat: Number,
      lng: Number,
    },
    address: String,
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("GarbageYard", garbageYardSchema);
