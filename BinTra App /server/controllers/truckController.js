const Truck = require("../models/Truck");
const { distanceInKm } = require("../utils/geo");

// GET /api/trucks/nearby?lat=..&lng=..&radiusKm=10
exports.getNearbyTrucks = async (req, res) => {
  try {
    const { lat, lng, radiusKm } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: "lat and lng are required" });
    }

    const trucks = await Truck.find({ isAvailable: true, status: "AVAILABLE" }).populate(
      "driver",
      "name phone"
    );

    const radius = radiusKm ? Number(radiusKm) : 10;

    const nearby = trucks
      .map((truck) => {
        const distance = distanceInKm(
          Number(lat),
          Number(lng),
          truck.currentLocation.lat,
          truck.currentLocation.lng
        );
        return { truck, distance };
      })
      .filter((t) => t.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .map((t) => ({
        _id: t.truck._id,
        vehicleNumber: t.truck.vehicleNumber,
        driver: t.truck.driver,
        currentLocation: t.truck.currentLocation,
        capacity: t.truck.capacity,
        currentLoad: t.truck.currentLoad,
        availableCapacity: t.truck.capacity - t.truck.currentLoad,
        status: t.truck.status,
        distanceKm: Number(t.distance.toFixed(2)),
      }));

    res.json(nearby);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch nearby trucks", error: err.message });
  }
};

exports.getTruckById = async (req, res) => {
  try {
    const truck = await Truck.findById(req.params.id).populate("driver", "name phone");
    if (!truck) return res.status(404).json({ message: "Truck not found" });
    res.json(truck);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch truck", error: err.message });
  }
};

exports.updateTruckLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const truck = await Truck.findById(req.params.id);
    if (!truck) return res.status(404).json({ message: "Truck not found" });

    // only the assigned driver (or admin) can move the truck
    if (req.user.role === "DRIVER" && String(truck.driver) !== String(req.user._id)) {
      return res.status(403).json({ message: "This is not your assigned truck" });
    }

    truck.currentLocation = { lat, lng };
    await truck.save();

    const io = req.app.get("io");
    if (io) io.emit("truckLocationUpdated", { truckId: truck._id, lat, lng });

    res.json(truck);
  } catch (err) {
    res.status(500).json({ message: "Failed to update location", error: err.message });
  }
};

// admin only
exports.createTruck = async (req, res) => {
  try {
    const { vehicleNumber, capacity, driver } = req.body;
    if (!vehicleNumber || !capacity) {
      return res.status(400).json({ message: "vehicleNumber and capacity are required" });
    }
    const truck = await Truck.create({ vehicleNumber, capacity, driver, status: "OFFLINE" });
    res.status(201).json(truck);
  } catch (err) {
    res.status(500).json({ message: "Failed to create truck", error: err.message });
  }
};

exports.updateTruck = async (req, res) => {
  try {
    const truck = await Truck.findById(req.params.id);
    if (!truck) return res.status(404).json({ message: "Truck not found" });

    const allowedFields = ["vehicleNumber", "capacity", "driver", "status", "isAvailable"];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) truck[field] = req.body[field];
    });

    await truck.save();
    res.json(truck);
  } catch (err) {
    res.status(500).json({ message: "Failed to update truck", error: err.message });
  }
};

exports.listTrucks = async (req, res) => {
  try {
    const trucks = await Truck.find().populate("driver", "name phone");
    res.json(trucks);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch trucks", error: err.message });
  }
};

// GET /api/trucks/my-truck - driver fetches their own assigned truck from the DB
// (never trust user.assignedTruck cached in localStorage on the frontend)
exports.getMyTruck = async (req, res) => {
  try {
    const truck = await Truck.findOne({ driver: req.user._id });
    if (!truck) {
      return res.status(404).json({ message: "No truck is currently assigned to you" });
    }
    res.json(truck);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch your truck", error: err.message });
  }
};

// PATCH /api/trucks/go-online - driver explicitly brings their assigned truck online
// body: { lat, lng } - the driver's current location, becomes the truck's location
exports.goOnline = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: "lat and lng are required to go online" });
    }

    const truck = await Truck.findOne({ driver: req.user._id });
    if (!truck) {
      return res.status(404).json({ message: "You do not have a truck assigned yet" });
    }

    truck.currentLocation = { lat, lng };
    truck.status = "AVAILABLE";
    truck.isAvailable = true;
    await truck.save();

    const io = req.app.get("io");
    if (io) io.emit("truckLocationUpdated", { truckId: truck._id, lat, lng });

    res.json(truck);
  } catch (err) {
    res.status(500).json({ message: "Failed to go online", error: err.message });
  }
};

// PATCH /api/trucks/go-offline - driver takes their truck offline
exports.goOffline = async (req, res) => {
  try {
    const truck = await Truck.findOne({ driver: req.user._id });
    if (!truck) {
      return res.status(404).json({ message: "You do not have a truck assigned yet" });
    }

    const activeStates = ["ASSIGNED", "COLLECTING", "RETURNING_TO_YARD"];
    if (activeStates.includes(truck.status)) {
      return res.status(400).json({
        message: "You cannot go offline while a pickup is in progress. Finish or hand it over first.",
      });
    }

    truck.status = "OFFLINE";
    truck.isAvailable = false;
    await truck.save();

    res.json(truck);
  } catch (err) {
    res.status(500).json({ message: "Failed to go offline", error: err.message });
  }
};
