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

// -----------------------------
// CORS
// -----------------------------

const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

// -----------------------------
// Middleware
// -----------------------------

app.use(express.json());

app.set("etag", false);

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// -----------------------------
// Socket.IO
// -----------------------------

const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

// -----------------------------
// Health Check
// -----------------------------

app.get("/", (req, res) => {
  res.json({
    message: "BinTra API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

// -----------------------------
// API Routes
// -----------------------------

app.use("/api/auth", authRoutes);
app.use("/api/trucks", truckRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/yards", yardRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);


app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    message: "Something went wrong on the server",
  });
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join", (userId) => {
    console.log("Socket", socket.id, "joined room", userId);

    if (userId) {
      socket.join(userId);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5050;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`BinTra server running on port ${PORT}`);
});