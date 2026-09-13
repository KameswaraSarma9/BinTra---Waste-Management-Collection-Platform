const Product = require("../models/Product");

exports.listProducts = async (req, res) => {
  try {
    const products = await Product.find({ status: { $ne: "DISCONTINUED" } });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch products", error: err.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch product", error: err.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { productName, description, image, category, pointsRequired, stock, materialUsed } =
      req.body;

    if (!productName || !pointsRequired) {
      return res.status(400).json({ message: "productName and pointsRequired are required" });
    }

    const product = await Product.create({
      productName,
      description,
      image,
      category,
      pointsRequired,
      stock: stock || 0,
      materialUsed,
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: "Failed to create product", error: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const allowedFields = [
      "productName",
      "description",
      "image",
      "category",
      "pointsRequired",
      "stock",
      "materialUsed",
      "status",
    ];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) product[field] = req.body[field];
    });

    if (product.stock === 0 && product.status === "ACTIVE") {
      product.status = "OUT_OF_STOCK";
    }

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Failed to update product", error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    product.status = "DISCONTINUED";
    await product.save();
    res.json({ message: "Product removed from marketplace" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete product", error: err.message });
  }
};
