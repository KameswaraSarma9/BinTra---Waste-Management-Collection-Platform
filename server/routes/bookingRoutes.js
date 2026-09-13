const express = require("express");
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  verifyPickupOtp,
  completeCollection,
  rateBooking,
  reportProblem,
} = require("../controllers/bookingController");
const { protect, allowRoles } = require("../middleware/auth");

router.post("/", protect, allowRoles("USER"), createBooking);
router.get("/", protect, getMyBookings);
router.get("/:id", protect, getBookingById);
router.patch("/:id/status", protect, allowRoles("DRIVER"), updateBookingStatus);
router.post("/:id/verify-otp", protect, allowRoles("DRIVER"), verifyPickupOtp);
router.post("/:id/complete", protect, allowRoles("DRIVER"), completeCollection);
router.post("/:id/rate", protect, allowRoles("USER"), rateBooking);
router.post("/:id/report", protect, allowRoles("USER"), reportProblem);

module.exports = router;
