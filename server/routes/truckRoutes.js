const express = require("express");
const router = express.Router();
const {
  getNearbyTrucks,
  getTruckById,
  updateTruckLocation,
  createTruck,
  updateTruck,
  listTrucks,
} = require("../controllers/truckController");
const { protect, allowRoles } = require("../middleware/auth");

router.get("/nearby", protect, getNearbyTrucks);
router.get("/", protect, allowRoles("ADMIN"), listTrucks);
router.get("/:id", protect, getTruckById);
router.patch("/:id/location", protect, allowRoles("DRIVER", "ADMIN"), updateTruckLocation);
router.post("/", protect, allowRoles("ADMIN"), createTruck);
router.patch("/:id", protect, allowRoles("ADMIN"), updateTruck);

module.exports = router;
