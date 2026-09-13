import React, { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { getSocket } from "../services/socket";

// default marker icon fix for leaflet + bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const CATEGORIES = [
  "WET_WASTE",
  "DRY_WASTE",
  "PLASTIC",
  "PAPER",
  "GLASS",
  "METAL",
  "E_WASTE",
  "ORGANIC_WASTE",
  "MIXED_WASTE",
];

const WEIGHT_OPTIONS = [
  { label: "1-2 kg", value: 2 },
  { label: "3-5 kg", value: 5 },
  { label: "6-10 kg", value: 10 },
  { label: "11-20 kg", value: 20 },
  { label: "20+ kg (custom)", value: "custom" },
];

function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  return position ? <Marker position={position} /> : null;
}

export default function BookPickup() {
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [weightOption, setWeightOption] = useState(WEIGHT_OPTIONS[0].value);
  const [customWeight, setCustomWeight] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // default center - Hyderabad, can be changed by clicking the map
  const defaultCenter = { lat: 17.385, lng: 78.4867 };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setPosition(defaultCenter)
      );
    } else {
      setPosition(defaultCenter);
    }
  }, []);

  const refreshTrucks = () => {
    if (!position) return;
    api
      .get(`/trucks/nearby?lat=${position.lat}&lng=${position.lng}&radiusKm=15`)
      .then((res) => setTrucks(res.data))
      .catch(() => setTrucks([]));
  };

  useEffect(refreshTrucks, [position]);

  // truck locations/capacity change server-side as drivers work through pickups,
  // so re-fetch the nearby list whenever one of those events comes in instead of polling
  useEffect(() => {
    const socket = getSocket();
    const handleUpdate = () => refreshTrucks();

    socket.on("truckLocationUpdated", handleUpdate);
    socket.on("truckCapacityUpdated", handleUpdate);
    socket.on("truckFull", handleUpdate);

    return () => {
      socket.off("truckLocationUpdated", handleUpdate);
      socket.off("truckCapacityUpdated", handleUpdate);
      socket.off("truckFull", handleUpdate);
    };
  }, [position]);

  const toggleCategory = (cat) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const getWeight = () => {
    if (weightOption === "custom") return Number(customWeight);
    return Number(weightOption);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!position) {
      setError("Please select a pickup location on the map");
      return;
    }
    if (!categories.length) {
      setError("Select at least one waste category");
      return;
    }

    const estimatedWeight = getWeight();
    if (!estimatedWeight || estimatedWeight <= 0) {
      setError("Enter a valid weight");
      return;
    }

    try {
      const { data } = await api.post("/bookings", {
        pickupAddress: { lat: position.lat, lng: position.lng },
        categories,
        estimatedWeight,
      });

      if (data.booking.status === "NO_TRUCK_AVAILABLE") {
        setMessage(data.message);
      } else {
        navigate(`/track/${data.booking._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create booking");
    }
  };

  return (
    <div className="container">
      <h2>Book Garbage Pickup</h2>

      <div className="card">
        <p>Click on the map to set your pickup location. Green markers are available trucks nearby.</p>
        <div className="map-container">
          {position && (
            <MapContainer center={position} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationPicker position={position} setPosition={setPosition} />
              {trucks.map((t) => (
                <Marker key={t._id} position={[t.currentLocation.lat, t.currentLocation.lng]}>
                  <Popup>
                    Truck {t.vehicleNumber}
                    <br />
                    Available capacity: {t.availableCapacity}kg
                    <br />
                    Distance: {t.distanceKm}km
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>
        <p>{trucks.length} truck(s) available nearby</p>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <label>Waste categories</label>
        <div>
          {CATEGORIES.map((cat) => (
            <label key={cat} style={{ display: "inline-block", width: "auto", marginRight: 12, fontWeight: "normal" }}>
              <input
                type="checkbox"
                style={{ width: "auto", marginRight: 4 }}
                checked={categories.includes(cat)}
                onChange={() => toggleCategory(cat)}
              />
              {cat.replace("_", " ")}
            </label>
          ))}
        </div>

        <label>Estimated weight</label>
        <select value={weightOption} onChange={(e) => setWeightOption(e.target.value)}>
          {WEIGHT_OPTIONS.map((w) => (
            <option key={w.label} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>

        {weightOption === "custom" && (
          <>
            <label>Custom weight (kg)</label>
            <input
              type="number"
              min="1"
              value={customWeight}
              onChange={(e) => setCustomWeight(e.target.value)}
            />
          </>
        )}

        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}

        <button type="submit">Book Pickup</button>
      </form>
    </div>
  );
}
