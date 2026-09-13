import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext.jsx";

export default function DriverDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [otpInputs, setOtpInputs] = useState({});
  const [weightInputs, setWeightInputs] = useState({});
  const [yardOtp, setYardOtp] = useState({});
  const [yards, setYards] = useState([]);
  const [selectedYard, setSelectedYard] = useState("");
  const [handover, setHandover] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    api.get("/bookings").then((res) => setBookings(res.data));
    api.get("/yards").then((res) => setYards(res.data));
  };

  useEffect(load, []);

  const notify = (msg, isError) => {
    if (isError) setError(msg);
    else setMessage(msg);
    setTimeout(() => {
      setMessage("");
      setError("");
    }, 4000);
  };

  const updateStatus = async (bookingId, status) => {
    try {
      const { data } = await api.patch(`/bookings/${bookingId}/status`, { status });
      if (data.otp) {
        notify(`OTP sent to user. For testing, the OTP is: ${data.otp}`);
      }
      load();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to update status", true);
    }
  };

  const verifyOtp = async (bookingId) => {
    try {
      await api.post(`/bookings/${bookingId}/verify-otp`, { otp: otpInputs[bookingId] });
      notify("OTP verified");
      load();
    } catch (err) {
      notify(err.response?.data?.message || "OTP verification failed", true);
    }
  };

  const completeCollection = async (bookingId) => {
    try {
      const { data } = await api.post(`/bookings/${bookingId}/complete`, {
        actualWeight: Number(weightInputs[bookingId]),
      });
      notify(`Collection complete. ${data.rewardPointsAwarded} points awarded to user.`);
      load();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to complete collection", true);
    }
  };

  const arriveAtYard = async () => {
    if (!user.assignedTruck || !selectedYard) {
      notify("Select a yard first", true);
      return;
    }
    try {
      const { data } = await api.post("/yards/handovers/arrive", {
        truckId: user.assignedTruck,
        yardId: selectedYard,
      });
      setHandover(data);
      notify("Arrival recorded, waiting for yard admin to generate OTP");
    } catch (err) {
      notify(err.response?.data?.message || "Failed to record arrival", true);
    }
  };

  const verifyYardHandover = async () => {
    try {
      const { data } = await api.post(`/yards/handovers/${handover._id}/verify`, {
        otp: yardOtp.value,
      });
      notify("Handover verified, truck is now available again");
      setHandover(null);
      setYardOtp({});
    } catch (err) {
      notify(err.response?.data?.message || "Handover verification failed", true);
    }
  };

  const activeBookings = bookings.filter((b) => b.status !== "COMPLETED");
  const completedBookings = bookings.filter((b) => b.status === "COMPLETED");

  return (
    <div className="container">
      <h2>Driver Dashboard</h2>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h3>Truck to yard handover</h3>
        <label>Select yard</label>
        <select value={selectedYard} onChange={(e) => setSelectedYard(e.target.value)}>
          <option value="">-- select --</option>
          {yards.map((y) => (
            <option key={y._id} value={y._id}>
              {y.name}
            </option>
          ))}
        </select>
        <button onClick={arriveAtYard}>Mark arrived at yard</button>

        {handover && (
          <div style={{ marginTop: 12 }}>
            <p>Waiting for yard admin OTP. Enter it below once received:</p>
            <input
              placeholder="Enter yard OTP"
              value={yardOtp.value || ""}
              onChange={(e) => setYardOtp({ value: e.target.value })}
            />
            <button onClick={verifyYardHandover}>Confirm handover</button>
          </div>
        )}
      </div>

      <h3>Active pickups</h3>
      {activeBookings.length === 0 && <p>No active pickups assigned.</p>}
      {activeBookings.map((b) => (
        <div className="card" key={b._id}>
          <p><strong>{b.user?.name}</strong> — {b.categories.join(", ")}</p>
          <p>Estimated: {b.estimatedWeight}kg</p>
          <p>Status: <span className="badge">{b.status}</span></p>

          {b.status === "TRUCK_ASSIGNED" && (
            <button onClick={() => updateStatus(b._id, "DRIVER_ACCEPTED")}>Accept pickup</button>
          )}
          {b.status === "DRIVER_ACCEPTED" && (
            <button onClick={() => updateStatus(b._id, "ON_THE_WAY")}>Start driving</button>
          )}
          {b.status === "ON_THE_WAY" && (
            <button onClick={() => updateStatus(b._id, "ARRIVED")}>Arrived at location</button>
          )}

          {b.status === "OTP_SENT" && (
            <div>
              <label>Enter OTP from user</label>
              <input
                value={otpInputs[b._id] || ""}
                onChange={(e) => setOtpInputs({ ...otpInputs, [b._id]: e.target.value })}
              />
              <button onClick={() => verifyOtp(b._id)}>Verify OTP</button>
            </div>
          )}

          {b.status === "OTP_VERIFIED" && (
            <div>
              <label>Actual collected weight (kg)</label>
              <input
                type="number"
                value={weightInputs[b._id] || ""}
                onChange={(e) => setWeightInputs({ ...weightInputs, [b._id]: e.target.value })}
              />
              <button onClick={() => completeCollection(b._id)}>Mark collected</button>
            </div>
          )}
        </div>
      ))}

      <h3>Completed pickups</h3>
      {completedBookings.map((b) => (
        <div className="card" key={b._id}>
          <p>{b.user?.name} — {b.actualWeight}kg collected</p>
        </div>
      ))}
    </div>
  );
}
