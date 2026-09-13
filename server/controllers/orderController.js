const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const RewardTransaction = require("../models/RewardTransaction");

// creates an order and deducts points + stock together.
// uses a mongoose session/transaction so nothing gets applied halfway if something fails.
// note: transactions need MongoDB running as a replica set (a single local mongod won't support this,
// use MongoDB Atlas or `mongod --replSet rs0` locally).
exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { productId, quantity, deliveryAddress } = req.body;
    const qty = quantity || 1;

    let createdOrder;

    await session.withTransaction(async () => {
      const product = await Product.findById(productId).session(session);
      if (!product) throw new Error("Product not found");
      if (product.status !== "ACTIVE") throw new Error("This product is not available right now");
      if (product.stock < qty) throw new Error("Not enough stock for this product");

      const totalPoints = product.pointsRequired * qty;

      const user = await User.findById(req.user._id).session(session);
      if (user.rewardPoints < totalPoints) {
        throw new Error("You do not have enough reward points for this order");
      }

      user.rewardPoints -= totalPoints;
      product.stock -= qty;
      if (product.stock === 0) product.status = "OUT_OF_STOCK";

      await user.save({ session });
      await product.save({ session });

      const [order] = await Order.create(
        [
          {
            user: user._id,
            products: [
              {
                product: product._id,
                name: product.productName,
                pointsRequired: product.pointsRequired,
                quantity: qty,
              },
            ],
            pointsUsed: totalPoints,
            deliveryAddress,
            status: "PLACED",
          },
        ],
        { session }
      );

      await RewardTransaction.create(
        [
          {
            user: user._id,
            type: "REDEEMED",
            points: -totalPoints,
            order: order._id,
            note: `Redeemed for ${product.productName} x${qty}`,
            balanceAfter: user.rewardPoints,
          },
        ],
        { session }
      );

      createdOrder = order;
    });

    res.status(201).json(createdOrder);
  } catch (err) {
    res.status(400).json({ message: err.message || "Failed to place order" });
  } finally {
    session.endSession();
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders", error: err.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email");
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (req.user.role === "USER" && String(order.user._id) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only view your own orders" });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch order", error: err.message });
  }
};

exports.listAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate("user", "name email").sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders", error: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = status;
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Failed to update order", error: err.message });
  }
};
