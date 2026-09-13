require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const truckRoutes = require("./routes/truckRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const yardRoutes = require("./routes/yardRoutes");
const rewardRoutes = require("./routes/rewardRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");

connectDB();

const app = express();
const server = http.createServer(app);

app.set("etag", false);
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});


const allowedOrigin = process.env.CLIENT_URL || "*";

const io = new Server(server, {
  cors: { origin: allowedOrigin },
});

// so controllers can access io via req.app.get("io") without passing it around everywhere
app.set("io", io);

app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/trucks", truckRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/yards", yardRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

// fallback error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong on the server" });
});

io.on("connection", (socket) => {
  console.log("client connected:", socket.id);

  socket.on("join", (userId) => {
    console.log("socket", socket.id, "joined room", userId); // temp debug log
    if (userId) socket.join(userId);
  });

  socket.on("disconnect", () => console.log("client disconnected:", socket.id));
});

const PORT = process.env.PORT || 5050;
server.listen(PORT, () => console.log(`SmartWaste server running on port ${PORT}`));