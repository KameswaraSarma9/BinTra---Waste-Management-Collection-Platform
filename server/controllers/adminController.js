const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Truck = require("../models/Truck");
const GarbageBooking = require("../models/GarbageBooking");
const WasteHandover = require("../models/WasteHandover");
const RewardTransaction = require("../models/RewardTransaction");
const Order = require("../models/Order");

exports.listUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter).select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
};

exports.toggleBlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.isBlocked = !user.isBlocked;
    await user.save();
    res.json({ message: `User ${user.isBlocked ? "blocked" : "unblocked"}`, user });
  } catch (err) {
    res.status(500).json({ message: "Failed to update user", error: err.message });
  }
};

exports.getUserHistory = async (req, res) => {
  try {
    const bookings = await GarbageBooking.find({ user: req.params.id }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user history", error: err.message });
  }
};

// creates a DRIVER or ADMIN account - this is intentionally not exposed through the public register route
exports.createStaffUser = async (req, res) => {
  try {
    const { name, email, phone, password, role, licenseNumber } = req.body;

    if (!["DRIVER", "ADMIN"].includes(role)) {
      return res.status(400).json({ message: "role must be DRIVER or ADMIN" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: "Email already in use" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      role,
      licenseNumber,
    });

    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ message: "Failed to create staff account", error: err.message });
  }
};

exports.assignDriverToTruck = async (req, res) => {
  try {
    const { driverId, truckId } = req.body;
    const truck = await Truck.findById(truckId);
    if (!truck) return res.status(404).json({ message: "Truck not found" });

    const driver = await User.findById(driverId);
    if (!driver || driver.role !== "DRIVER") {
      return res.status(400).json({ message: "Provided user is not a driver" });
    }

    truck.driver = driver._id;
    truck.status = "AVAILABLE";
    truck.isAvailable = true;
    await truck.save();

    driver.assignedTruck = truck._id;
    await driver.save();

    res.json({ message: "Driver assigned to truck", truck });
  } catch (err) {
    res.status(500).json({ message: "Failed to assign driver", error: err.message });
  }
};

exports.getDriverPerformance = async (req, res) => {
  try {
    const bookings = await GarbageBooking.find({ driver: req.params.id, status: "COMPLETED" });

    const totalCollected = bookings.reduce((sum, b) => sum + (b.actualWeight || 0), 0);
    const ratedBookings = bookings.filter((b) => b.rating);
    const avgRating = ratedBookings.length
      ? ratedBookings.reduce((sum, b) => sum + b.rating, 0) / ratedBookings.length
      : null;

    res.json({
      completedPickups: bookings.length,
      totalWeightCollected: totalCollected,
      averageRating: avgRating,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch driver performance", error: err.message });
  }
};

exports.getReports = async (req, res) => {
  try {
    const [totalUsers, totalTrucks, activeTrucks, completedPickups, handovers, orders] =
      await Promise.all([
        User.countDocuments({ role: "USER" }),
        Truck.countDocuments(),
        Truck.countDocuments({ status: { $ne: "OFFLINE" } }),
        GarbageBooking.countDocuments({ status: "COMPLETED" }),
        WasteHandover.find({ status: "COMPLETED" }),
        Order.countDocuments(),
      ]);

    const totalGarbageCollected = handovers.reduce(
      (sum, h) => sum + (h.weightReceivedAtYard || 0),
      0
    );

    const rewardTotals = await RewardTransaction.aggregate([
      { $match: { type: "EARNED" } },
      { $group: { _id: null, total: { $sum: "$points" } } },
    ]);

    res.json({
      totalUsers,
      totalActiveTrucks: activeTrucks,
      totalTrucks,
      totalCompletedPickups: completedPickups,
      totalGarbageCollected,
      totalRewardsIssued: rewardTotals[0]?.total || 0,
      totalOrders: orders,
    });
  } catch (err) {
    console.error("getReports failed:", err);
    res.status(500).json({ message: "Failed to build reports", error: err.message });
  }
};