require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");

const User = require("../models/User");
const Truck = require("../models/Truck");
const GarbageYard = require("../models/GarbageYard");
const Product = require("../models/Product");

// Run with: node utils/seed.js
// Creates one admin, two drivers, two trucks (assigned to those drivers), one yard,
// and a few marketplace products - just enough to test the full flow without
// clicking through the admin dashboard first.
async function seed() {
  await connectDB();

  const existingAdmin = await User.findOne({ email: "admin@smartwaste.test" });
  if (existingAdmin) {
    console.log("Seed data already exists (admin@smartwaste.test found). Skipping.");
    await mongoose.disconnect();
    return;
  }

  const password = await bcrypt.hash("password123", 10);

  const admin = await User.create({
    name: "Admin",
    email: "admin@smartwaste.test",
    phone: "9000000001",
    password,
    role: "ADMIN",
  });

  const driver1 = await User.create({
    name: "Ravi Kumar",
    email: "driver1@smartwaste.test",
    phone: "9000000002",
    password,
    role: "DRIVER",
    licenseNumber: "TS-DL-1001",
  });

  const driver2 = await User.create({
    name: "Suresh Naik",
    email: "driver2@smartwaste.test",
    phone: "9000000003",
    password,
    role: "DRIVER",
    licenseNumber: "TS-DL-1002",
  });

  // Hyderabad-ish coordinates so the demo map has something nearby
  const truck1 = await Truck.create({
    vehicleNumber: "TS09AB1234",
    driver: driver1._id,
    currentLocation: { lat: 17.385, lng: 78.4867 },
    capacity: 100,
    currentLoad: 0,
    status: "AVAILABLE",
    isAvailable: true,
  });

  const truck2 = await Truck.create({
    vehicleNumber: "TS09CD5678",
    driver: driver2._id,
    currentLocation: { lat: 17.44, lng: 78.35 },
    capacity: 150,
    currentLoad: 0,
    status: "AVAILABLE",
    isAvailable: true,
  });

  driver1.assignedTruck = truck1._id;
  driver2.assignedTruck = truck2._id;
  await driver1.save();
  await driver2.save();

  const yard = await GarbageYard.create({
    name: "Jubilee Hills Processing Yard",
    address: "Jubilee Hills, Hyderabad",
    location: { lat: 17.43, lng: 78.4 },
    admins: [admin._id],
  });

  await Product.create([
    {
      productName: "Recycled Paper Notebook",
      description: "A4 notebook made from 100% recycled paper collected through the app",
      category: "Stationery",
      pointsRequired: 200,
      stock: 50,
      materialUsed: "Recycled paper",
    },
    {
      productName: "Recycled Plastic Planter",
      description: "Small planter made from recovered plastic waste",
      category: "Home",
      pointsRequired: 350,
      stock: 30,
      materialUsed: "Recycled plastic",
    },
    {
      productName: "Eco-friendly Jute Bag",
      description: "Reusable bag made from jute and recycled fabric scraps",
      category: "Lifestyle",
      pointsRequired: 150,
      stock: 40,
      materialUsed: "Jute, recycled fabric",
    },
    {
      productName: "Compost Bag (5kg)",
      description: "Compost produced from processed organic waste",
      category: "Garden",
      pointsRequired: 100,
      stock: 60,
      materialUsed: "Processed organic waste",
    },
  ]);

  console.log("Seed data created:");
  console.log("  Admin    -> admin@smartwaste.test / password123");
  console.log("  Driver 1 -> driver1@smartwaste.test / password123 (truck TS09AB1234)");
  console.log("  Driver 2 -> driver2@smartwaste.test / password123 (truck TS09CD5678)");
  console.log("  Yard     -> Jubilee Hills Processing Yard");
  console.log("  Products -> 4 marketplace items created");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
