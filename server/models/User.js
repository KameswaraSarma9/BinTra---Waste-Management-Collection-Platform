const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: "Home" },
    street: String,
    city: String,
    state: String,
    pincode: String,
    lat: Number,
    lng: Number,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["USER", "DRIVER", "ADMIN"],
      default: "USER",
    },
    homeAddress: addressSchema,

    // driver specific fields (only used when role === "DRIVER")
    assignedTruck: { type: mongoose.Schema.Types.ObjectId, ref: "Truck", default: null },
    licenseNumber: String,

    isBlocked: { type: Boolean, default: false },

    totalWasteCollected: { type: Number, default: 0 }, // kg, actual weight only
    totalWasteRecycled: { type: Number, default: 0 },
    rewardPoints: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
