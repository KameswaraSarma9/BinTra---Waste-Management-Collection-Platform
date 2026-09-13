const mongoose = require("mongoose");

const truckSchema = new mongoose.Schema(
  {
    vehicleNumber: { type: String, required: true, unique: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    currentLocation: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },

    capacity: { type: Number, required: true }, // kg
    currentLoad: { type: Number, default: 0 }, // kg

    status: {
      type: String,
      enum: [
        "AVAILABLE",
        "ASSIGNED",
        "COLLECTING",
        "FULL",
        "RETURNING_TO_YARD",
        "AT_YARD",
        "OFFLINE",
      ],
      default: "OFFLINE",
    },

    isAvailable: { type: Boolean, default: false },

    assignedYard: { type: mongoose.Schema.Types.ObjectId, ref: "GarbageYard" },
  },
  { timestamps: true }
);

// keeps isAvailable / status consistent whenever load or status is touched directly
truckSchema.methods.recalculateAvailability = function () {
  if (this.currentLoad >= this.capacity) {
    this.status = "RETURNING_TO_YARD";
    this.isAvailable = false;
  } else if (this.status === "AVAILABLE" || this.status === "ASSIGNED" || this.status === "COLLECTING") {
    this.isAvailable = this.status === "AVAILABLE";
  }
};

module.exports = mongoose.model("Truck", truckSchema);
