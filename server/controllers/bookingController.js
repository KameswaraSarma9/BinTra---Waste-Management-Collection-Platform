const GarbageBooking = require("../models/GarbageBooking");
const Truck = require("../models/Truck");
const User = require("../models/User");
const RewardTransaction = require("../models/RewardTransaction");
const Notification = require("../models/Notification");
const { distanceInKm } = require("../utils/geo");
const { calculatePoints } = require("../utils/rewardPoints");

// finds nearest AVAILABLE truck that has enough remaining capacity for the estimated weight
async function findSuitableTruck(lat, lng, estimatedWeight) {
  const trucks = await Truck.find({ status: "AVAILABLE", isAvailable: true });

  const candidates = trucks
    .filter((t) => t.capacity - t.currentLoad >= estimatedWeight)
    .map((t) => ({
      truck: t,
      distance: distanceInKm(lat, lng, t.currentLocation.lat, t.currentLocation.lng),
    }))
    .sort((a, b) => a.distance - b.distance);

  return candidates.length ? candidates[0].truck : null;
}

exports.createBooking = async (req, res) => {
  try {
    const { pickupAddress, categories, estimatedWeight, preferredTime } = req.body;

    if (!pickupAddress || !pickupAddress.lat || !pickupAddress.lng) {
      return res.status(400).json({ message: "pickupAddress with lat/lng is required" });
    }
    if (!estimatedWeight || estimatedWeight <= 0) {
      return res.status(400).json({ message: "estimatedWeight must be greater than 0" });
    }
    if (!categories || !categories.length) {
      return res.status(400).json({ message: "Select at least one waste category" });
    }

    const booking = await GarbageBooking.create({
      user: req.user._id,
      pickupAddress,
      categories,
      estimatedWeight,
      preferredTime,
      status: "CREATED",
    });

    const truck = await findSuitableTruck(pickupAddress.lat, pickupAddress.lng, estimatedWeight);

    if (!truck) {
      booking.status = "NO_TRUCK_AVAILABLE";
      await booking.save();
      return res.status(200).json({
        booking,
        message: "No suitable truck is currently available. You can schedule this pickup for later.",
      });
    }

    truck.status = "ASSIGNED";
    truck.isAvailable = false;
    await truck.save();

    booking.truck = truck._id;
    booking.driver = truck.driver;
    booking.status = "TRUCK_ASSIGNED";
    await booking.save();

    if (truck.driver) {
      await Notification.create({
        user: truck.driver,
        title: "New pickup request",
        message: `New pickup request for approx ${estimatedWeight}kg`,
        relatedBooking: booking._id,
      });
    }

    const io = req.app.get("io");
    if (io) io.emit("bookingAssigned", { bookingId: booking._id, truckId: truck._id });

    res.status(201).json({ booking, truck });
  } catch (err) {
    res.status(500).json({ message: "Failed to create booking", error: err.message });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const filter =
      req.user.role === "USER"
        ? { user: req.user._id }
        : req.user.role === "DRIVER"
        ? { driver: req.user._id }
        : {};
    const bookings = await GarbageBooking.find(filter)
      .populate("truck", "vehicleNumber capacity currentLoad")
      .populate("user", "name phone")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch bookings", error: err.message });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const booking = await GarbageBooking.findById(req.params.id)
      .populate("truck")
      .populate("user", "name phone email")
      .populate("driver", "name phone");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch booking", error: err.message });
  }
};

// driver moves the booking through ACCEPTED / ON_THE_WAY / ARRIVED
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["DRIVER_ACCEPTED", "ON_THE_WAY", "ARRIVED"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `status must be one of ${allowed.join(", ")}` });
    }

    const booking = await GarbageBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (String(booking.driver) !== String(req.user._id)) {
      return res.status(403).json({ message: "You are not assigned to this booking" });
    }

    booking.status = status;

    if (status === "ARRIVED") {
      const otp = booking.generateOtp();
      booking.status = "OTP_SENT";
      await booking.save();

      const io = req.app.get("io");
      // send the OTP only to the specific user's room, not a blind broadcast,
      // so the plaintext OTP actually reaches the person who needs it
      if (io) {
        io.to(String(booking.user)).emit("otpGenerated", { bookingId: booking._id, otp });
      }

      // in a production system this would go out over SMS. Returning it here in
      // response too, for the driver's own visibility during this project's demo.
      return res.json({ booking, otp, note: "OTP sent to the user. Ask them for it to confirm collection" });
    }

    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: "Failed to update booking status", error: err.message });
  }
};

// driver enters the OTP given by the user
exports.verifyPickupOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const booking = await GarbageBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (String(booking.driver) !== String(req.user._id)) {
      return res.status(403).json({ message: "You are not assigned to this booking" });
    }

    if (booking.status !== "OTP_SENT") {
      return res.status(400).json({ message: "OTP was not requested for this booking yet" });
    }

    if (!booking.verifyOtp(otp)) {
      return res.status(400).json({ message: "Incorrect or expired OTP" });
    }

    booking.otpVerified = true;
    booking.otpVerifiedAt = new Date();
    booking.status = "OTP_VERIFIED";
    await booking.save();

    res.json({ message: "OTP verified, you can now record the collected weight", booking });
  } catch (err) {
    res.status(500).json({ message: "Failed to verify OTP", error: err.message });
  }
};

// driver enters actual weight after OTP verification - this is what completes the collection
// driver enters actual weight after OTP verification - this is what completes the collection
exports.completeCollection = async (req, res) => {
  try {
    const { actualWeight } = req.body;

    if (!actualWeight || actualWeight <= 0) {
      return res.status(400).json({ message: "actualWeight must be greater than 0" });
    }

    const booking = await GarbageBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (String(booking.driver) !== String(req.user._id)) {
      return res.status(403).json({ message: "You are not assigned to this booking" });
    }

    // this is the important anti-fraud check from the spec: cannot mark collected without OTP
    if (!booking.otpVerified || booking.status !== "OTP_VERIFIED") {
      return res.status(400).json({ message: "OTP must be verified before marking as collected" });
    }

    if (booking.status === "COLLECTED" || booking.status === "COMPLETED") {
      return res.status(400).json({ message: "This booking is already marked as collected" });
    }

    const truck = await Truck.findById(booking.truck);
    if (!truck) return res.status(404).json({ message: "Assigned truck not found" });

    booking.actualWeight = actualWeight;
    booking.status = "COLLECTED";

    truck.currentLoad += actualWeight;
    if (truck.currentLoad >= truck.capacity) {
      truck.status = "RETURNING_TO_YARD";
      truck.isAvailable = false;
    } else {
      truck.status = "AVAILABLE";
      truck.isAvailable = true;
    }
    await truck.save();

    const user = await User.findById(booking.user);
    user.totalWasteCollected += actualWeight;

    // award points once per booking only
    if (!booking.rewardTransactionCreated) {
      const points = calculatePoints(actualWeight, booking.categories);
      user.rewardPoints += points;
      booking.rewardPointsAwarded = points;
      booking.rewardTransactionCreated = true;

      await RewardTransaction.create({
        user: user._id,
        type: "EARNED",
        points,
        booking: booking._id,
        note: `Reward for ${actualWeight}kg collected`,
        balanceAfter: user.rewardPoints,
      });
    }

    await user.save();
    booking.status = "COMPLETED";
    await booking.save();

    const io = req.app.get("io");
    if (io) {
      io.emit("garbageCollected", { bookingId: booking._id });
      io.emit("truckCapacityUpdated", { truckId: truck._id, currentLoad: truck.currentLoad });
      if (truck.status === "RETURNING_TO_YARD") {
        io.emit("truckFull", { truckId: truck._id });
      }

      // let this specific user's browser know their balance changed, so cached
      // user state (Marketplace, Rewards, Navbar, Home) can update itself
      console.log("emitting rewardPointsUpdated to room:", String(booking.user), "points:", user.rewardPoints); // temp debug
      io.to(String(booking.user)).emit("rewardPointsUpdated", {
        userId: booking.user,
        rewardPoints: user.rewardPoints,
        pointsAwarded: booking.rewardPointsAwarded,
      });
    }

    res.json({ booking, truck, rewardPointsAwarded: booking.rewardPointsAwarded });
  } catch (err) {
    res.status(500).json({ message: "Failed to complete collection", error: err.message });
  }
};

exports.rateBooking = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const booking = await GarbageBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (String(booking.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only rate your own bookings" });
    }
    if (booking.status !== "COMPLETED") {
      return res.status(400).json({ message: "You can only rate a completed booking" });
    }

    booking.rating = rating;
    booking.ratingComment = comment;
    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: "Failed to submit rating", error: err.message });
  }
};

exports.reportProblem = async (req, res) => {
  try {
    const { description } = req.body;
    const booking = await GarbageBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (String(booking.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only report a problem on your own booking" });
    }

    booking.reportedProblem = description;
    await booking.save();
    res.json({ message: "Problem reported", booking });
  } catch (err) {
    res.status(500).json({ message: "Failed to report problem", error: err.message });
  }
};