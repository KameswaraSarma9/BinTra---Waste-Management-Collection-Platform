import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext.jsx";

export default function DriverDashboard() {
  const { user } = useAuth();

  const [truck, setTruck] = useState(null);
  const [bookings, setBookings] = useState([]);

  const [otpInputs, setOtpInputs] = useState({});
  const [weightInputs, setWeightInputs] = useState({});

  const [yardOtp, setYardOtp] = useState({});
  const [yards, setYards] = useState([]);
  const [selectedYard, setSelectedYard] = useState("");
  const [handover, setHandover] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [loadingTruck, setLoadingTruck] = useState(false);

  // --------------------------------------------------
  // Notifications
  // --------------------------------------------------

  const notify = (msg, isError = false) => {
    if (isError) {
      setError(msg);
      setMessage("");
    } else {
      setMessage(msg);
      setError("");
    }

    setTimeout(() => {
      setMessage("");
      setError("");
    }, 4000);
  };

  // --------------------------------------------------
  // Load driver data
  // --------------------------------------------------

  const load = async () => {
    try {
      const [bookingsRes, yardsRes, truckRes] = await Promise.all([
        api.get("/bookings"),
        api.get("/yards"),
        api.get("/trucks/my-truck"),
      ]);

      setBookings(bookingsRes.data);
      setYards(yardsRes.data);
      setTruck(truckRes.data);
    } catch (err) {
      console.error("Driver dashboard load error:", err);

      notify(
        err.response?.data?.message ||
          "Failed to load driver dashboard",
        true
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  // --------------------------------------------------
  // Get browser location
  // --------------------------------------------------

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    });
  };

  // --------------------------------------------------
  // GO ONLINE
  // --------------------------------------------------

  const goOnline = async () => {
    if (!truck) {
      notify("No truck is assigned to you", true);
      return;
    }

    try {
      setLoadingTruck(true);

      let location = null;

      try {
        location = await getCurrentLocation();
      } catch {
        // For demo/testing, use existing truck location
        location = truck.currentLocation;
      }

      const { data } = await api.post(
        `/trucks/${truck._id}/go-online`,
        {
          lat: location?.lat,
          lng: location?.lng,
        }
      );

      setTruck(data.truck);

      notify(
        "You are now online. Your truck is available for pickups."
      );
    } catch (err) {
      notify(
        err.response?.data?.message ||
          "Failed to go online",
        true
      );
    } finally {
      setLoadingTruck(false);
    }
  };

  // --------------------------------------------------
  // GO OFFLINE
  // --------------------------------------------------

  const goOffline = async () => {
    if (!truck) return;

    try {
      setLoadingTruck(true);

      const { data } = await api.post(
        `/trucks/${truck._id}/go-offline`
      );

      setTruck(data.truck);

      notify("You are now offline.");
    } catch (err) {
      notify(
        err.response?.data?.message ||
          "Failed to go offline",
        true
      );
    } finally {
      setLoadingTruck(false);
    }
  };

  // --------------------------------------------------
  // Update location
  // --------------------------------------------------

  const updateLocation = async () => {
    if (!truck) return;

    try {
      const location = await getCurrentLocation();

      const { data } = await api.patch(
        `/trucks/${truck._id}/location`,
        location
      );

      setTruck(data);

      notify("Truck location updated.");
    } catch (err) {
      notify(
        err.response?.data?.message ||
          "Failed to update truck location",
        true
      );
    }
  };

  // --------------------------------------------------
  // Booking status
  // --------------------------------------------------

  const updateStatus = async (bookingId, status) => {
    try {
      const { data } = await api.patch(
        `/bookings/${bookingId}/status`,
        { status }
      );

      if (data.otp) {
        notify(
          `OTP sent to user. For testing, the OTP is: ${data.otp}`
        );
      }

      await load();
    } catch (err) {
      notify(
        err.response?.data?.message ||
          "Failed to update status",
        true
      );
    }
  };

  // --------------------------------------------------
  // Verify pickup OTP
  // --------------------------------------------------

  const verifyOtp = async (bookingId) => {
    try {
      await api.post(
        `/bookings/${bookingId}/verify-otp`,
        {
          otp: otpInputs[bookingId],
        }
      );

      notify("OTP verified successfully.");

      await load();
    } catch (err) {
      notify(
        err.response?.data?.message ||
          "OTP verification failed",
        true
      );
    }
  };

  // --------------------------------------------------
  // Complete collection
  // --------------------------------------------------

  const completeCollection = async (bookingId) => {
    const weight = Number(weightInputs[bookingId]);

    if (!weight || weight <= 0) {
      notify("Enter a valid collected weight.", true);
      return;
    }

    try {
      const { data } = await api.post(
        `/bookings/${bookingId}/complete`,
        {
          actualWeight: weight,
        }
      );

      notify(
        `Collection complete. ${data.rewardPointsAwarded} points awarded.`
      );

      await load();
    } catch (err) {
      notify(
        err.response?.data?.message ||
          "Failed to complete collection",
        true
      );
    }
  };

  // --------------------------------------------------
  // Arrive at yard
  // --------------------------------------------------

  const arriveAtYard = async () => {
    if (!truck || !selectedYard) {
      notify("Select a yard first.", true);
      return;
    }

    try {
      const { data } = await api.post(
        "/yards/handovers/arrive",
        {
          truckId: truck._id,
          yardId: selectedYard,
        }
      );

      setHandover(data);

      notify(
        "Arrival recorded. Waiting for yard admin OTP."
      );

      await load();
    } catch (err) {
      notify(
        err.response?.data?.message ||
          "Failed to record arrival",
        true
      );
    }
  };

  // --------------------------------------------------
  // Verify yard handover
  // --------------------------------------------------

  const verifyYardHandover = async () => {
    if (!handover) return;

    try {
      const { data } = await api.post(
        `/yards/handovers/${handover._id}/verify`,
        {
          otp: yardOtp.value,
        }
      );

      setHandover(null);
      setYardOtp({});

      notify(
        "Handover verified. Truck is available again."
      );

      await load();
    } catch (err) {
      notify(
        err.response?.data?.message ||
          "Handover verification failed",
        true
      );
    }
  };

  const activeBookings = bookings.filter(
    (b) => b.status !== "COMPLETED"
  );

  const completedBookings = bookings.filter(
    (b) => b.status === "COMPLETED"
  );

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className="container">
      <h2>Driver Dashboard</h2>

      {message && (
        <p className="success">{message}</p>
      )}

      {error && (
        <p className="error">{error}</p>
      )}

      {/* -------------------------------------------- */}
      {/* TRUCK STATUS */}
      {/* -------------------------------------------- */}

      <div className="card">
        <h3>My Truck</h3>

        {!truck ? (
          <p>No truck has been assigned to you.</p>
        ) : (
          <>
            <p>
              <strong>Vehicle:</strong>{" "}
              {truck.vehicleNumber}
            </p>

            <p>
              <strong>Capacity:</strong>{" "}
              {truck.capacity} kg
            </p>

            <p>
              <strong>Current Load:</strong>{" "}
              {truck.currentLoad} kg
            </p>

            <p>
              <strong>Available Capacity:</strong>{" "}
              {truck.capacity - truck.currentLoad} kg
            </p>

            <p>
              <strong>Status:</strong>{" "}
              <span className="badge">
                {truck.status}
              </span>
            </p>

            <p>
              <strong>Availability:</strong>{" "}
              {truck.isAvailable
                ? "🟢 Online"
                : "🔴 Offline"}
            </p>

            <p>
              <strong>Location:</strong>{" "}
              {truck.currentLocation?.lat},{" "}
              {truck.currentLocation?.lng}
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              {!truck.isAvailable &&
                truck.status !== "RETURNING_TO_YARD" &&
                truck.status !== "ASSIGNED" && (
                  <button
                    onClick={goOnline}
                    disabled={loadingTruck}
                  >
                    {loadingTruck
                      ? "Going online..."
                      : "Go Online"}
                  </button>
                )}

              {truck.isAvailable && (
                <button
                  onClick={goOffline}
                  disabled={loadingTruck}
                >
                  {loadingTruck
                    ? "Going offline..."
                    : "Go Offline"}
                </button>
              )}

              <button
                onClick={updateLocation}
                disabled={loadingTruck}
              >
                Update My Location
              </button>
            </div>
          </>
        )}
      </div>

      {/* -------------------------------------------- */}
      {/* YARD HANDOVER */}
      {/* -------------------------------------------- */}

      <div className="card">
        <h3>Truck to Yard Handover</h3>

        <label>Select yard</label>

        <select
          value={selectedYard}
          onChange={(e) =>
            setSelectedYard(e.target.value)
          }
        >
          <option value="">
            -- select yard --
          </option>

          {yards.map((yard) => (
            <option
              key={yard._id}
              value={yard._id}
            >
              {yard.name}
            </option>
          ))}
        </select>

        <button
          onClick={arriveAtYard}
          disabled={!truck || !selectedYard}
        >
          Mark Arrived at Yard
        </button>

        {handover && (
          <div style={{ marginTop: 12 }}>
            <p>
              Waiting for yard admin OTP.
            </p>

            <input
              placeholder="Enter yard OTP"
              value={yardOtp.value || ""}
              onChange={(e) =>
                setYardOtp({
                  value: e.target.value,
                })
              }
            />

            <button
              onClick={verifyYardHandover}
            >
              Confirm Handover
            </button>
          </div>
        )}
      </div>

      {/* -------------------------------------------- */}
      {/* ACTIVE PICKUPS */}
      {/* -------------------------------------------- */}

      <h3>Active Pickups</h3>

      {activeBookings.length === 0 && (
        <p>No active pickups assigned.</p>
      )}

      {activeBookings.map((booking) => (
        <div
          className="card"
          key={booking._id}
        >
          <p>
            <strong>
              {booking.user?.name}
            </strong>{" "}
            —{" "}
            {booking.categories?.join(", ")}
          </p>

          <p>
            Estimated:{" "}
            {booking.estimatedWeight} kg
          </p>

          <p>
            Status:{" "}
            <span className="badge">
              {booking.status}
            </span>
          </p>

          {booking.status === "TRUCK_ASSIGNED" && (
            <button
              onClick={() =>
                updateStatus(
                  booking._id,
                  "DRIVER_ACCEPTED"
                )
              }
            >
              Accept Pickup
            </button>
          )}

          {booking.status === "DRIVER_ACCEPTED" && (
            <button
              onClick={() =>
                updateStatus(
                  booking._id,
                  "ON_THE_WAY"
                )
              }
            >
              Start Driving
            </button>
          )}

          {booking.status === "ON_THE_WAY" && (
            <button
              onClick={() =>
                updateStatus(
                  booking._id,
                  "ARRIVED"
                )
              }
            >
              Arrived at Location
            </button>
          )}

          {booking.status === "OTP_SENT" && (
            <div>
              <label>
                Enter OTP from user
              </label>

              <input
                value={
                  otpInputs[booking._id] || ""
                }
                onChange={(e) =>
                  setOtpInputs({
                    ...otpInputs,
                    [booking._id]:
                      e.target.value,
                  })
                }
              />

              <button
                onClick={() =>
                  verifyOtp(booking._id)
                }
              >
                Verify OTP
              </button>
            </div>
          )}

          {booking.status === "OTP_VERIFIED" && (
            <div>
              <label>
                Actual collected weight (kg)
              </label>

              <input
                type="number"
                min="0.1"
                value={
                  weightInputs[booking._id] || ""
                }
                onChange={(e) =>
                  setWeightInputs({
                    ...weightInputs,
                    [booking._id]:
                      e.target.value,
                  })
                }
              />

              <button
                onClick={() =>
                  completeCollection(
                    booking._id
                  )
                }
              >
                Mark Collected
              </button>
            </div>
          )}
        </div>
      ))}

      {/* -------------------------------------------- */}
      {/* COMPLETED */}
      {/* -------------------------------------------- */}

      <h3>Completed Pickups</h3>

      {completedBookings.length === 0 && (
        <p>No completed pickups yet.</p>
      )}

      {completedBookings.map((booking) => (
        <div
          className="card"
          key={booking._id}
        >
          <p>
            {booking.user?.name} —{" "}
            {booking.actualWeight} kg collected
          </p>
        </div>
      ))}
    </div>
  );
}