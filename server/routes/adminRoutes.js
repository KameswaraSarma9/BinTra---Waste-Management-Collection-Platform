const express = require("express");
const router = express.Router();
const {
  listUsers,
  toggleBlockUser,
  getUserHistory,
  createStaffUser,
  assignDriverToTruck,
  getDriverPerformance,
  getReports,
} = require("../controllers/adminController");
const { protect, allowRoles } = require("../middleware/auth");

router.use(protect, allowRoles("ADMIN"));

router.get("/users", listUsers);
router.patch("/users/:id/block", toggleBlockUser);
router.get("/users/:id/history", getUserHistory);

router.post("/staff", createStaffUser);
router.post("/trucks/assign-driver", assignDriverToTruck);
router.get("/drivers/:id/performance", getDriverPerformance);

router.get("/reports", getReports);

module.exports = router;
