const express = require("express");
const router = express.Router();
const {
  getNearbyTrucks,
  getTruckById,
  updateTruckLocation,
  createTruck,
  updateTruck,
  listTrucks,
  getMyTruck,
  goOnline,
  goOffline,
} = require("../controllers/truckController");
const { protect, allowRoles } = require("../middleware/auth");

// NOTE: specific/static routes ("nearby", "my-truck", "go-online", "go-offline")
// must be declared BEFORE the "/:id" param route, otherwise Express matches
// them as an :id value instead (e.g. GET /trucks/my-truck would 404 as "truck not found").
router.get("/nearby", protect, getNearbyTrucks);
router.get("/my-truck", protect, allowRoles("DRIVER"), getMyTruck);
router.patch("/go-online", protect, allowRoles("DRIVER"), goOnline);
router.patch("/go-offline", protect, allowRoles("DRIVER"), goOffline);

router.get("/", protect, allowRoles("ADMIN"), listTrucks);
router.get("/:id", protect, getTruckById);
router.patch("/:id/location", protect, allowRoles("DRIVER", "ADMIN"), updateTruckLocation);
router.post("/", protect, allowRoles("ADMIN"), createTruck);
router.patch("/:id", protect, allowRoles("ADMIN"), updateTruck);

module.exports = router;
