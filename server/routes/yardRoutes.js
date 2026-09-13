const express = require("express");
const router = express.Router();
const {
  createYard,
  listYards,
  arriveAtYard,
  generateHandoverOtp,
  verifyHandover,
  updateProcessingStatus,
  listHandovers,
} = require("../controllers/yardController");
const { protect, allowRoles } = require("../middleware/auth");

router.post("/", protect, allowRoles("ADMIN"), createYard);
router.get("/", protect, listYards);

router.post("/handovers/arrive", protect, allowRoles("DRIVER"), arriveAtYard);
router.post("/handovers/:id/generate-otp", protect, allowRoles("ADMIN"), generateHandoverOtp);
router.post("/handovers/:id/verify", protect, allowRoles("DRIVER", "ADMIN"), verifyHandover);
router.patch("/handovers/:id/processing", protect, allowRoles("ADMIN"), updateProcessingStatus);
router.get("/handovers", protect, allowRoles("ADMIN"), listHandovers);

module.exports = router;
