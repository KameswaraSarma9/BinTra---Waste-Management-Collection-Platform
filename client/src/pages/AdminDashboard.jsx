import React, { useEffect, useState } from "react";
import api from "../services/api";

const TABS = ["Reports", "Users", "Trucks", "Yard", "Products", "Orders"];

export default function AdminDashboard() {
  const [tab, setTab] = useState("Reports");

  return (
    <div className="container">
      <h2>Admin Dashboard</h2>
      <div style={{ marginBottom: 14 }}>
        {TABS.map((t) => (
          <button
            key={t}
            className={t === tab ? "" : "secondary"}
            style={{ marginRight: 8 }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Reports" && <ReportsTab />}
      {tab === "Users" && <UsersTab />}
      {tab === "Trucks" && <TrucksTab />}
      {tab === "Yard" && <YardTab />}
      {tab === "Products" && <ProductsTab />}
      {tab === "Orders" && <OrdersTab />}
    </div>
  );
}

function ReportsTab() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/admin/reports")
      .then((res) => setReport(res.data))
      .catch((err) =>
        setError(err.response?.data?.message || err.message || "Failed to load reports")
      );
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!report) return <p>Loading...</p>;

  const items = [
    ["Total users", report.totalUsers],
    ["Active trucks", `${report.totalActiveTrucks}/${report.totalTrucks}`],
    ["Completed pickups", report.totalCompletedPickups],
    ["Garbage collected (yard verified)", `${report.totalGarbageCollected}kg`],
    ["Rewards issued", `${report.totalRewardsIssued} pts`],
    ["Marketplace orders", report.totalOrders],
  ];

  return (
    <div className="stats-row">
      {items.map(([label, value]) => (
        <div className="stat-box" key={label}>
          <div className="number">{value}</div>
          <div>{label}</div>
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [staffForm, setStaffForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "DRIVER",
    licenseNumber: "",
  });
  const [message, setMessage] = useState("");

  const load = () =>
    api
      .get("/admin/users")
      .then((res) => setUsers(res.data))
      .catch((err) => setMessage(err.response?.data?.message || err.message || "Failed to load users"));
  useEffect(() => {
    load();
  }, []);

  const toggleBlock = async (id) => {
    await api.patch(`/admin/users/${id}/block`);
    load();
  };

  const createStaff = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/staff", staffForm);
      setMessage(`${staffForm.role} account created`);
      setStaffForm({ ...staffForm, name: "", email: "", phone: "", password: "" });
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to create account");
    }
  };

  return (
    <div>
      <div className="card">
        <h3>Add driver or admin account</h3>
        <form onSubmit={createStaff}>
          <label>Name</label>
          <input
            value={staffForm.name}
            onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
            required
          />
          <label>Email</label>
          <input
            type="email"
            value={staffForm.email}
            onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
            required
          />
          <label>Phone</label>
          <input
            value={staffForm.phone}
            onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
            required
          />
          <label>Password</label>
          <input
            type="password"
            value={staffForm.password}
            onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
            required
          />
          <label>Role</label>
          <select
            value={staffForm.role}
            onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
          >
            <option value="DRIVER">Driver</option>
            <option value="ADMIN">Admin</option>
          </select>
          {staffForm.role === "DRIVER" && (
            <>
              <label>License number</label>
              <input
                value={staffForm.licenseNumber}
                onChange={(e) => setStaffForm({ ...staffForm, licenseNumber: e.target.value })}
              />
            </>
          )}
          <button type="submit">Create account</button>
        </form>
        {message && <p className="success">{message}</p>}
      </div>

      <h3>All users</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Points</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.rewardPoints}</td>
              <td>{u.isBlocked ? "Blocked" : "Active"}</td>
              <td>
                <button className="secondary" onClick={() => toggleBlock(u._id)}>
                  {u.isBlocked ? "Unblock" : "Block"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrucksTab() {
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({ vehicleNumber: "", capacity: "" });
  const [assignForm, setAssignForm] = useState({ driverId: "", truckId: "" });
  const [message, setMessage] = useState("");

  const load = () => {
    api
      .get("/trucks")
      .then((res) => setTrucks(res.data))
      .catch((err) => setMessage(err.response?.data?.message || err.message || "Failed to load trucks"));
    api
      .get("/admin/users?role=DRIVER")
      .then((res) => setDrivers(res.data))
      .catch((err) => setMessage(err.response?.data?.message || err.message || "Failed to load drivers"));
  };
  useEffect(load, []);

  const createTruck = async (e) => {
    e.preventDefault();
    try {
      await api.post("/trucks", { vehicleNumber: form.vehicleNumber, capacity: Number(form.capacity) });
      setForm({ vehicleNumber: "", capacity: "" });
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to add truck");
    }
  };

  const assignDriver = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/trucks/assign-driver", assignForm);
      setMessage("Driver assigned");
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to assign driver");
    }
  };

  return (
    <div>
      <div className="card">
        <h3>Add truck</h3>
        <form onSubmit={createTruck}>
          <label>Vehicle number</label>
          <input
            value={form.vehicleNumber}
            onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
            required
          />
          <label>Capacity (kg)</label>
          <input
            type="number"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            required
          />
          <button type="submit">Add truck</button>
        </form>
      </div>

      <div className="card">
        <h3>Assign driver to truck</h3>
        <form onSubmit={assignDriver}>
          <label>Driver</label>
          <select
            value={assignForm.driverId}
            onChange={(e) => setAssignForm({ ...assignForm, driverId: e.target.value })}
            required
          >
            <option value="">-- select driver --</option>
            {drivers.map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
          <label>Truck</label>
          <select
            value={assignForm.truckId}
            onChange={(e) => setAssignForm({ ...assignForm, truckId: e.target.value })}
            required
          >
            <option value="">-- select truck --</option>
            {trucks.map((t) => (
              <option key={t._id} value={t._id}>{t.vehicleNumber}</option>
            ))}
          </select>
          <button type="submit">Assign</button>
        </form>
        {message && <p className="success">{message}</p>}
      </div>

      <h3>All trucks</h3>
      <table>
        <thead>
          <tr>
            <th>Vehicle number</th>
            <th>Driver</th>
            <th>Capacity</th>
            <th>Load</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {trucks.map((t) => (
            <tr key={t._id}>
              <td>{t.vehicleNumber}</td>
              <td>{t.driver?.name || "-"}</td>
              <td>{t.capacity}kg</td>
              <td>{t.currentLoad}kg</td>
              <td><span className="badge">{t.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function YardTab() {
  const [yards, setYards] = useState([]);
  const [form, setForm] = useState({ name: "", address: "", lat: "", lng: "" });
  const [handovers, setHandovers] = useState([]);
  const [otpResult, setOtpResult] = useState({});
  const [weightForm, setWeightForm] = useState({});
  const [error, setError] = useState("");

  const load = () => {
    api
      .get("/yards")
      .then((res) => setYards(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message || "Failed to load yards"));
    api
      .get("/yards/handovers")
      .then((res) => setHandovers(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message || "Failed to load handovers"));
  };
  useEffect(load, []);

  const createYard = async (e) => {
    e.preventDefault();
    try {
      await api.post("/yards", {
        name: form.name,
        address: form.address,
        location: { lat: Number(form.lat), lng: Number(form.lng) },
      });
      setForm({ name: "", address: "", lat: "", lng: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add yard");
    }
  };

  const generateOtp = async (handoverId) => {
    try {
      const { data } = await api.post(`/yards/handovers/${handoverId}/generate-otp`);
      setOtpResult({ ...otpResult, [handoverId]: data.otp });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate OTP");
    }
  };

  const confirmWeight = async (handoverId) => {
    // admin doesn't need the otp here since it's driver who enters it - this just records the weight
    // after the driver has already verified. In this simplified flow, admin can also verify with weight+otp together.
    const w = weightForm[handoverId];
    if (!w?.otp) return;
    try {
      await api.post(`/yards/handovers/${handoverId}/verify`, {
        otp: w.otp,
        weightReceivedAtYard: Number(w.weight),
      });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to confirm handover");
    }
  };

  return (
    <div>
      {error && <p className="error">{error}</p>}
      <div className="card">
        <h3>Add garbage yard</h3>
        <form onSubmit={createYard}>
          <label>Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <label>Address</label>
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <label>Latitude</label>
          <input value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} required />
          <label>Longitude</label>
          <input value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} required />
          <button type="submit">Add yard</button>
        </form>
      </div>

      <h3>Yards</h3>
      {yards.map((y) => <div className="card" key={y._id}>{y.name} — {y.address}</div>)}

      <h3>Pending / recent handovers</h3>
      {handovers.map((h) => (
        <div className="card" key={h._id}>
          <p>Truck {h.truck?.vehicleNumber} — Driver {h.driver?.name} — Yard {h.yard?.name}</p>
          <p>Load before handover: {h.loadBeforeHandover}kg</p>
          <p>Status: <span className="badge">{h.status}</span></p>

          {h.status === "PENDING" && (
            <div>
              <button onClick={() => generateOtp(h._id)}>Generate OTP</button>
              {otpResult[h._id] && <p>OTP for driver: <strong>{otpResult[h._id]}</strong></p>}
            </div>
          )}

          {h.status === "OTP_GENERATED" && (
            <div>
              <label>OTP (from driver)</label>
              <input
                onChange={(e) =>
                  setWeightForm({ ...weightForm, [h._id]: { ...weightForm[h._id], otp: e.target.value } })
                }
              />
              <label>Weight received (kg)</label>
              <input
                type="number"
                onChange={(e) =>
                  setWeightForm({ ...weightForm, [h._id]: { ...weightForm[h._id], weight: e.target.value } })
                }
              />
              <button onClick={() => confirmWeight(h._id)}>Confirm handover</button>
            </div>
          )}

          {h.discrepancy !== undefined && h.status === "COMPLETED" && (
            <p>Received {h.weightReceivedAtYard}kg, discrepancy {h.discrepancy}kg</p>
          )}
        </div>
      ))}
    </div>
  );
}

function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    productName: "",
    description: "",
    materialUsed: "",
    pointsRequired: "",
    stock: "",
    category: "",
  });

  const [error, setError] = useState("");

  const load = () =>
    api
      .get("/products")
      .then((res) => setProducts(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message || "Failed to load products"));
  useEffect(() => {
    load();
  }, []);

  const createProduct = async (e) => {
    e.preventDefault();
    try {
      await api.post("/products", {
        ...form,
        pointsRequired: Number(form.pointsRequired),
        stock: Number(form.stock),
      });
      setForm({ productName: "", description: "", materialUsed: "", pointsRequired: "", stock: "", category: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add product");
    }
  };

  const removeProduct = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove product");
    }
  };

  return (
    <div>
      {error && <p className="error">{error}</p>}
      <div className="card">
        <h3>Add marketplace product</h3>
        <form onSubmit={createProduct}>
          <label>Product name</label>
          <input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} required />
          <label>Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <label>Material used</label>
          <input value={form.materialUsed} onChange={(e) => setForm({ ...form, materialUsed: e.target.value })} />
          <label>Category</label>
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <label>Points required</label>
          <input type="number" value={form.pointsRequired} onChange={(e) => setForm({ ...form, pointsRequired: e.target.value })} required />
          <label>Stock</label>
          <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
          <button type="submit">Add product</button>
        </form>
      </div>

      <h3>Products</h3>
      {products.map((p) => (
        <div className="card" key={p._id}>
          <p><strong>{p.productName}</strong> — {p.pointsRequired} pts — stock {p.stock} — {p.status}</p>
          <button className="secondary" onClick={() => removeProduct(p._id)}>Remove</button>
        </div>
      ))}
    </div>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  const load = () =>
    api
      .get("/orders/all")
      .then((res) => setOrders(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message || "Failed to load orders"));
  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/orders/${id}/status`, { status });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update order");
    }
  };

  const nextStatus = {
    PLACED: "CONFIRMED",
    CONFIRMED: "PROCESSING",
    PROCESSING: "READY",
    READY: "OUT_FOR_DELIVERY",
    OUT_FOR_DELIVERY: "DELIVERED",
  };

  return (
    <div>
      {error && <p className="error">{error}</p>}
      <h3>All orders</h3>
      {orders.map((o) => (
        <div className="card" key={o._id}>
          <p>{o.user?.name} — {o.products.map((p) => p.name).join(", ")}</p>
          <p>Status: <span className="badge">{o.status}</span></p>
          {nextStatus[o.status] && (
            <button onClick={() => updateStatus(o._id, nextStatus[o.status])}>
              Mark as {nextStatus[o.status]}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}