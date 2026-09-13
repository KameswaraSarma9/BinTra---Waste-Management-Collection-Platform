const WasteHandover = require("../models/WasteHandover");
const GarbageBooking = require("../models/GarbageBooking");
const GarbageYard = require("../models/GarbageYard");
const Truck = require("../models/Truck");

exports.createYard = async (req, res) => {
  try {
    const { name, location, address } = req.body;
    const yard = await GarbageYard.create({ name, location, address, admins: [req.user._id] });
    res.status(201).json(yard);
  } catch (err) {
    res.status(500).json({ message: "Failed to create yard", error: err.message });
  }
};

exports.listYards = async (req, res) => {
  try {
    const yards = await GarbageYard.find();
    res.json(yards);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch yards", error: err.message });
  }
};

// driver clicks "Arrived at Yard" - creates a pending handover record for that yard admin to act on
exports.arriveAtYard = async (req, res) => {
  try {
    const { truckId, yardId } = req.body;
    const truck = await Truck.findById(truckId);
    if (!truck) return res.status(404).json({ message: "Truck not found" });

    if (String(truck.driver) !== String(req.user._id)) {
      return res.status(403).json({ message: "This is not your assigned truck" });
    }

    truck.status = "AT_YARD";
    await truck.save();

    // pull in all COLLECTED/COMPLETED bookings for this truck that have not yet been through a handover
    const bookings = await GarbageBooking.find({
      truck: truck._id,
      status: "COMPLETED",
    });

    const handover = await WasteHandover.create({
      truck: truck._id,
      driver: req.user._id,
      yard: yardId,
      bookings: bookings.map((b) => b._id),
      loadBeforeHandover: truck.currentLoad,
      status: "PENDING",
    });

    const io = req.app.get("io");
    if (io) io.emit("truckReachedYard", { truckId: truck._id, handoverId: handover._id });

    res.status(201).json(handover);
  } catch (err) {
    res.status(500).json({ message: "Failed to record yard arrival", error: err.message });
  }
};

// yard admin generates the OTP once the truck has physically arrived
exports.generateHandoverOtp = async (req, res) => {
  try {
    const handover = await WasteHandover.findById(req.params.id);
    if (!handover) return res.status(404).json({ message: "Handover not found" });

    const otp = handover.generateOtp();
    handover.yardAdmin = req.user._id;
    await handover.save();

    const io = req.app.get("io");
    if (io) io.emit("otpGenerated", { handoverId: handover._id });

    res.json({ otp, message: "Give this OTP to the driver to confirm handover" });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate OTP", error: err.message });
  }
};

// driver enters the OTP given by the yard admin, then admin confirms received weight
exports.verifyHandover = async (req, res) => {
  try {
    const { otp, weightReceivedAtYard, breakdown } = req.body;

    const handover = await WasteHandover.findById(req.params.id);
    if (!handover) return res.status(404).json({ message: "Handover not found" });

    if (!handover.verifyOtp(otp)) {
      return res.status(400).json({ message: "Incorrect or expired OTP" });
    }

    handover.otpVerified = true;
    handover.otpVerifiedAt = new Date();
    handover.status = "VERIFIED";

    if (weightReceivedAtYard !== undefined) {
      handover.weightReceivedAtYard = weightReceivedAtYard;
      handover.discrepancy = Number(
        (handover.loadBeforeHandover - weightReceivedAtYard).toFixed(2)
      );
    }
    if (breakdown) {
      handover.breakdown = { ...handover.breakdown.toObject(), ...breakdown };
    }

    handover.status = "COMPLETED";
    await handover.save();

    // reset the truck: it becomes available again
    const truck = await Truck.findById(handover.truck);
    if (truck) {
      truck.currentLoad = 0;
      truck.status = "AVAILABLE";
      truck.isAvailable = true;
      await truck.save();
    }

    const io = req.app.get("io");
    if (io) io.emit("wasteHandoverCompleted", { handoverId: handover._id, truckId: handover.truck });

    res.json({ handover, truck });
  } catch (err) {
    res.status(500).json({ message: "Failed to verify handover", error: err.message });
  }
};

exports.updateProcessingStatus = async (req, res) => {
  try {
    const { processingStatus, breakdown } = req.body;
    const handover = await WasteHandover.findById(req.params.id);
    if (!handover) return res.status(404).json({ message: "Handover not found" });

    if (processingStatus) handover.processingStatus = processingStatus;
    if (breakdown) handover.breakdown = { ...handover.breakdown.toObject(), ...breakdown };

    await handover.save();
    res.json(handover);
  } catch (err) {
    res.status(500).json({ message: "Failed to update processing status", error: err.message });
  }
};

exports.listHandovers = async (req, res) => {
  try {
    const handovers = await WasteHandover.find()
      .populate("truck", "vehicleNumber")
      .populate("driver", "name")
      .populate("yard", "name")
      .sort({ createdAt: -1 });
    res.json(handovers);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch handovers", error: err.message });
  }
};
