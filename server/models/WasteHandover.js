const mongoose = require("mongoose");
const crypto = require("crypto");

// this tracks a truck emptying its load at the authorized yard.
// this is separate from GarbageBooking because one handover covers many bookings collected on the same trip.
const wasteHandoverSchema = new mongoose.Schema(
  {
    truck: { type: mongoose.Schema.Types.ObjectId, ref: "Truck", required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    yard: { type: mongoose.Schema.Types.ObjectId, ref: "GarbageYard", required: true },
    yardAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: "GarbageBooking" }],

    loadBeforeHandover: Number,
    weightReceivedAtYard: Number,
    discrepancy: Number,

    otpHash: String,
    otpExpiry: Date,
    otpVerified: { type: Boolean, default: false },
    otpVerifiedAt: Date,

    status: {
      type: String,
      enum: ["PENDING", "OTP_GENERATED", "VERIFIED", "COMPLETED"],
      default: "PENDING",
    },

    breakdown: {
      wetWaste: { type: Number, default: 0 },
      dryWaste: { type: Number, default: 0 },
      plastic: { type: Number, default: 0 },
      paper: { type: Number, default: 0 },
      glass: { type: Number, default: 0 },
      metal: { type: Number, default: 0 },
      eWaste: { type: Number, default: 0 },
      organic: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },

    processingStatus: {
      type: String,
      enum: ["RECEIVED", "SORTING", "SEGREGATED", "PROCESSING", "RECYCLED", "REUSED", "DISPOSED"],
      default: "RECEIVED",
    },
  },
  { timestamps: true }
);

wasteHandoverSchema.methods.generateOtp = function () {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  this.otpHash = crypto.createHash("sha256").update(otp).digest("hex");
  this.otpExpiry = new Date(Date.now() + 15 * 60 * 1000);
  this.status = "OTP_GENERATED";
  return otp;
};

wasteHandoverSchema.methods.verifyOtp = function (candidate) {
  if (!this.otpHash || !this.otpExpiry) return false;
  if (this.otpVerified) return false;
  if (Date.now() > new Date(this.otpExpiry).getTime()) return false;
  const candidateHash = crypto.createHash("sha256").update(String(candidate)).digest("hex");
  return candidateHash === this.otpHash;
};

module.exports = mongoose.model("WasteHandover", wasteHandoverSchema);
