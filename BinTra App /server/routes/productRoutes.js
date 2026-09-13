const express = require("express");
const router = express.Router();
const {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const { protect, allowRoles } = require("../middleware/auth");

router.get("/", listProducts);
router.get("/:id", getProductById);
router.post("/", protect, allowRoles("ADMIN"), createProduct);
router.patch("/:id", protect, allowRoles("ADMIN"), updateProduct);
router.delete("/:id", protect, allowRoles("ADMIN"), deleteProduct);

module.exports = router;
