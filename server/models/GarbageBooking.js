const mongoose = require("mongoose");
const crypto = require("crypto");

const garbageBookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    truck: { type: mongoose.Schema.Types.ObjectId, ref: "Truck" },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    pickupAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      lat: Number,
      lng: Number,
    },

    categories: [
      {
        type: String,
        enum: [
          "WET_WASTE",
          "DRY_WASTE",
          "PLASTIC",
          "PAPER",
          "GLASS",
          "METAL",
          "E_WASTE",
          "ORGANIC_WASTE",
          "MIXED_WASTE",
        ],
      },
    ],

    estimatedWeight: { type: Number, required: true }, // kg
    actualWeight: { type: Number, default: null },

    preferredTime: Date,

    status: {
      type: String,
      enum: [
        "CREATED",
        "TRUCK_ASSIGNED",
        "DRIVER_ACCEPTED",
        "ON_THE_WAY",
        "ARRIVED",
        "OTP_SENT",
        "OTP_VERIFIED",
        "COLLECTED",
        "COMPLETED",
        "NO_TRUCK_AVAILABLE",
        "CANCELLED",
      ],
      default: "CREATED",
    },

    // OTP for house pickup, hashed - never store the raw OTP
    otpHash: String,
    otpExpiry: Date,
    otpVerified: { type: Boolean, default: false },
    otpVerifiedAt: Date,

    rewardPointsAwarded: { type: Number, default: 0 },
    rewardTransactionCreated: { type: Boolean, default: false },

    rating: { type: Number, min: 1, max: 5 },
    ratingComment: String,

    reportedProblem: String,
  },
  { timestamps: true }
);

garbageBookingSchema.methods.generateOtp = function () {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  this.otpHash = crypto.createHash("sha256").update(otp).digest("hex");
  this.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  this.otpVerified = false;
  return otp; // caller sends this to the user, we never save the plain otp
};

garbageBookingSchema.methods.verifyOtp = function (candidate) {
  if (!this.otpHash || !this.otpExpiry) return false;
  if (this.otpVerified) return false; // already used
  if (Date.now() > new Date(this.otpExpiry).getTime()) return false;
  const candidateHash = crypto.createHash("sha256").update(String(candidate)).digest("hex");
  return candidateHash === this.otpHash;
};

module.exports = mongoose.model("GarbageBooking", garbageBookingSchema);
