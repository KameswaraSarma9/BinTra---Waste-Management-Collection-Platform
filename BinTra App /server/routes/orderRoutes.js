const express = require("express");
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderById,
  listAllOrders,
  updateOrderStatus,
} = require("../controllers/orderController");
const { protect, allowRoles } = require("../middleware/auth");

router.post("/", protect, allowRoles("USER"), createOrder);
router.get("/", protect, allowRoles("USER"), getMyOrders);
router.get("/all", protect, allowRoles("ADMIN"), listAllOrders);
router.get("/:id", protect, getOrderById);
router.patch("/:id/status", protect, allowRoles("ADMIN"), updateOrderStatus);

module.exports = router;
