import {
  Ban,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Table2,
  UserPlus,
  UserRound,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, clearToken, getToken, setToken } from "./api.js";

const TIME_SLOTS = ["17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"];

function todayIso() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function Alert({ message, tone = "info" }) {
  if (!message) return null;
  return <div className={`alert ${tone}`}>{message}</div>;
}

function StatusBadge({ status }) {
  return <span className={`status ${status}`}>{status}</span>;
}

function IconButton({ icon: Icon, children, className = "", ...props }) {
  return (
    <button className={`button ${className}`} {...props}>
      <Icon size={17} aria-hidden="true" />
      <span>{children}</span>
    </button>
  );
}

function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    adminCode: ""
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const payload =
        mode === "login"
          ? await api.login({ email: form.email, password: form.password })
          : await api.register({
              name: form.name,
              email: form.email,
              password: form.password,
              adminCode: form.adminCode || undefined
            });

      setToken(payload.token);
      onAuthed(payload.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="brand-block">
          <div className="brand-mark">
            <Table2 size={28} aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Restaurant Reservation System</p>
            <h1 id="auth-title">Reservations</h1>
          </div>
        </div>

        <div className="segmented" role="tablist" aria-label="Authentication mode">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">
            <LogIn size={16} aria-hidden="true" />
            Login
          </button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">
            <UserPlus size={16} aria-hidden="true" />
            Register
          </button>
        </div>

        <form className="stack" onSubmit={submit}>
          {mode === "register" && (
            <label>
              Name
              <input value={form.name} onChange={(event) => updateField("name", event.target.value)} required />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              minLength={mode === "register" ? 8 : 1}
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              required
            />
          </label>
          {mode === "register" && (
            <label>
              Admin code
              <input value={form.adminCode} onChange={(event) => updateField("adminCode", event.target.value)} />
            </label>
          )}
          <Alert message={error} tone="danger" />
          <IconButton icon={mode === "login" ? LogIn : UserPlus} className="primary" disabled={busy}>
            {busy ? "Working" : mode === "login" ? "Login" : "Create account"}
          </IconButton>
        </form>
      </section>
    </main>
  );
}

function ReservationSummary({ reservation, onCancel, cancelingId }) {
  return (
    <article className="reservation-card">
      <div>
        <div className="row-title">
          <CalendarDays size={17} aria-hidden="true" />
          <strong>
            {reservation.reservationDate} at {reservation.timeSlot}
          </strong>
        </div>
        <p>
          {reservation.guests} guests - Table {reservation.table?.number} ({reservation.table?.capacity} seats)
        </p>
      </div>
      <div className="card-actions">
        <StatusBadge status={reservation.status} />
        {reservation.status === "active" && (
          <IconButton
            icon={X}
            className="danger ghost"
            onClick={() => onCancel(reservation._id)}
            disabled={cancelingId === reservation._id}
            title="Cancel reservation"
          >
            Cancel
          </IconButton>
        )}
      </div>
    </article>
  );
}

function CustomerDashboard({ user }) {
  const [reservations, setReservations] = useState([]);
  const [form, setForm] = useState({
    reservationDate: todayIso(),
    timeSlot: "18:00",
    guests: 2,
    notes: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelingId, setCancelingId] = useState("");

  async function loadReservations() {
    const payload = await api.myReservations();
    setReservations(payload.reservations);
  }

  useEffect(() => {
    loadReservations().catch((err) => setError(err.message));
  }, []);

  const activeCount = useMemo(() => reservations.filter((item) => item.status === "active").length, [reservations]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function createBooking(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setBusy(true);

    try {
      await api.createReservation({
        ...form,
        guests: Number(form.guests),
        notes: form.notes || undefined
      });
      setMessage("Reservation created.");
      setForm((current) => ({ ...current, notes: "" }));
      await loadReservations();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelBooking(id) {
    setCancelingId(id);
    setMessage("");
    setError("");

    try {
      await api.cancelReservation(id);
      setMessage("Reservation cancelled.");
      await loadReservations();
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelingId("");
    }
  }

  return (
    <div className="content-grid">
      <section className="tool-panel" aria-labelledby="new-reservation">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Customer</p>
            <h2 id="new-reservation">New reservation</h2>
          </div>
          <span className="metric">{activeCount} active</span>
        </div>

        <form className="form-grid" onSubmit={createBooking}>
          <label>
            Date
            <input
              type="date"
              min={todayIso()}
              value={form.reservationDate}
              onChange={(event) => updateField("reservationDate", event.target.value)}
              required
            />
          </label>
          <label>
            Time
            <select value={form.timeSlot} onChange={(event) => updateField("timeSlot", event.target.value)}>
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </label>
          <label>
            Guests
            <input
              type="number"
              min="1"
              max="20"
              value={form.guests}
              onChange={(event) => updateField("guests", event.target.value)}
              required
            />
          </label>
          <label className="wide">
            Notes
            <input value={form.notes} maxLength="300" onChange={(event) => updateField("notes", event.target.value)} />
          </label>
          <div className="wide">
            <Alert message={message} tone="success" />
            <Alert message={error} tone="danger" />
          </div>
          <IconButton icon={CalendarPlus} className="primary wide" disabled={busy}>
            {busy ? "Checking availability" : "Reserve table"}
          </IconButton>
        </form>
      </section>

      <section className="list-panel" aria-labelledby="my-reservations">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{user.name}</p>
            <h2 id="my-reservations">My reservations</h2>
          </div>
          <IconButton icon={RefreshCw} className="ghost" onClick={loadReservations} title="Refresh reservations">
            Refresh
          </IconButton>
        </div>
        <div className="card-list">
          {reservations.length === 0 ? (
            <p className="empty-state">No reservations yet.</p>
          ) : (
            reservations.map((reservation) => (
              <ReservationSummary
                key={reservation._id}
                reservation={reservation}
                onCancel={cancelBooking}
                cancelingId={cancelingId}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function AdminReservations() {
  const [reservations, setReservations] = useState([]);
  const [dateFilter, setDateFilter] = useState("");
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadReservations() {
    const payload = await api.adminReservations(dateFilter);
    setReservations(payload.reservations);
  }

  useEffect(() => {
    loadReservations().catch((err) => setError(err.message));
  }, [dateFilter]);

  function startEdit(reservation) {
    setEditing({
      id: reservation._id,
      reservationDate: reservation.reservationDate,
      timeSlot: reservation.timeSlot,
      guests: reservation.guests,
      notes: reservation.notes || ""
    });
  }

  function updateEdit(field, value) {
    setEditing((current) => ({ ...current, [field]: value }));
  }

  async function saveEdit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      await api.updateReservation(editing.id, {
        reservationDate: editing.reservationDate,
        timeSlot: editing.timeSlot,
        guests: Number(editing.guests),
        notes: editing.notes
      });
      setMessage("Reservation updated.");
      setEditing(null);
      await loadReservations();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelReservation(id) {
    const confirmed = window.confirm("Cancel this reservation?");
    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      await api.adminCancelReservation(id);
      setMessage("Reservation cancelled.");
      await loadReservations();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="wide-panel" aria-labelledby="admin-reservations">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h2 id="admin-reservations">Reservations</h2>
        </div>
        <div className="filter-row">
          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            aria-label="Filter reservations by date"
          />
          <IconButton icon={RefreshCw} className="ghost" onClick={loadReservations} title="Refresh reservations">
            Refresh
          </IconButton>
        </div>
      </div>

      <Alert message={message} tone="success" />
      <Alert message={error} tone="danger" />

      {editing && (
        <form className="edit-strip" onSubmit={saveEdit}>
          <input
            type="date"
            min={todayIso()}
            value={editing.reservationDate}
            onChange={(event) => updateEdit("reservationDate", event.target.value)}
            required
            aria-label="Reservation date"
          />
          <select
            value={editing.timeSlot}
            onChange={(event) => updateEdit("timeSlot", event.target.value)}
            aria-label="Reservation time"
          >
            {TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            max="20"
            value={editing.guests}
            onChange={(event) => updateEdit("guests", event.target.value)}
            aria-label="Guests"
            required
          />
          <input
            value={editing.notes}
            maxLength="300"
            onChange={(event) => updateEdit("notes", event.target.value)}
            aria-label="Notes"
          />
          <IconButton icon={Save} className="primary" disabled={busy}>
            Save
          </IconButton>
          <IconButton icon={X} className="ghost" type="button" onClick={() => setEditing(null)}>
            Close
          </IconButton>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Guest</th>
              <th>Date</th>
              <th>Time</th>
              <th>Party</th>
              <th>Table</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => (
              <tr key={reservation._id}>
                <td>
                  <strong>{reservation.user?.name}</strong>
                  <span>{reservation.user?.email}</span>
                </td>
                <td>{reservation.reservationDate}</td>
                <td>{reservation.timeSlot}</td>
                <td>{reservation.guests}</td>
                <td>
                  #{reservation.table?.number} ({reservation.table?.capacity})
                </td>
                <td>
                  <StatusBadge status={reservation.status} />
                </td>
                <td>
                  <div className="inline-actions">
                    <IconButton
                      icon={Pencil}
                      className="ghost"
                      onClick={() => startEdit(reservation)}
                      disabled={reservation.status !== "active"}
                      title="Edit reservation"
                    >
                      Edit
                    </IconButton>
                    <IconButton
                      icon={Ban}
                      className="danger ghost"
                      onClick={() => cancelReservation(reservation._id)}
                      disabled={reservation.status !== "active"}
                      title="Cancel reservation"
                    >
                      Cancel
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
            {reservations.length === 0 && (
              <tr>
                <td colSpan="7" className="empty-cell">
                  No reservations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdminTables() {
  const [tables, setTables] = useState([]);
  const [newTable, setNewTable] = useState({ number: "", capacity: 2 });
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadTables() {
    const payload = await api.adminTables();
    setTables(payload.tables);
  }

  useEffect(() => {
    loadTables().catch((err) => setError(err.message));
  }, []);

  async function addTable(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      await api.createTable({
        number: Number(newTable.number),
        capacity: Number(newTable.capacity),
        isActive: true
      });
      setNewTable({ number: "", capacity: 2 });
      setMessage("Table added.");
      await loadTables();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(table) {
    setEditing({
      id: table._id,
      number: table.number,
      capacity: table.capacity,
      isActive: table.isActive
    });
  }

  async function saveTable(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      await api.updateTable(editing.id, {
        number: Number(editing.number),
        capacity: Number(editing.capacity),
        isActive: editing.isActive
      });
      setEditing(null);
      setMessage("Table updated.");
      await loadTables();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deactivateTable(id) {
    setMessage("");
    setError("");

    try {
      await api.deactivateTable(id);
      setMessage("Table deactivated.");
      await loadTables();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="wide-panel" aria-labelledby="admin-tables">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h2 id="admin-tables">Tables</h2>
        </div>
        <IconButton icon={RefreshCw} className="ghost" onClick={loadTables} title="Refresh tables">
          Refresh
        </IconButton>
      </div>

      <Alert message={message} tone="success" />
      <Alert message={error} tone="danger" />

      <form className="edit-strip" onSubmit={addTable}>
        <input
          type="number"
          min="1"
          value={newTable.number}
          onChange={(event) => setNewTable((current) => ({ ...current, number: event.target.value }))}
          placeholder="Table number"
          aria-label="Table number"
          required
        />
        <input
          type="number"
          min="1"
          max="20"
          value={newTable.capacity}
          onChange={(event) => setNewTable((current) => ({ ...current, capacity: event.target.value }))}
          placeholder="Capacity"
          aria-label="Capacity"
          required
        />
        <IconButton icon={Plus} className="primary">
          Add table
        </IconButton>
      </form>

      {editing && (
        <form className="edit-strip" onSubmit={saveTable}>
          <input
            type="number"
            min="1"
            value={editing.number}
            onChange={(event) => setEditing((current) => ({ ...current, number: event.target.value }))}
            aria-label="Edited table number"
            required
          />
          <input
            type="number"
            min="1"
            max="20"
            value={editing.capacity}
            onChange={(event) => setEditing((current) => ({ ...current, capacity: event.target.value }))}
            aria-label="Edited table capacity"
            required
          />
          <label className="check-row">
            <input
              type="checkbox"
              checked={editing.isActive}
              onChange={(event) => setEditing((current) => ({ ...current, isActive: event.target.checked }))}
            />
            Active
          </label>
          <IconButton icon={Save} className="primary">
            Save
          </IconButton>
          <IconButton icon={X} className="ghost" type="button" onClick={() => setEditing(null)}>
            Close
          </IconButton>
        </form>
      )}

      <div className="table-grid">
        {tables.map((table) => (
          <article className="table-card" key={table._id}>
            <div>
              <p className="eyebrow">Table {table.number}</p>
              <h3>{table.capacity} seats</h3>
            </div>
            <div className="card-actions">
              <span className={`status ${table.isActive ? "active" : "cancelled"}`}>
                {table.isActive ? "active" : "inactive"}
              </span>
              <IconButton icon={Pencil} className="ghost" onClick={() => startEdit(table)} title="Edit table">
                Edit
              </IconButton>
              {table.isActive && (
                <IconButton icon={Ban} className="danger ghost" onClick={() => deactivateTable(table._id)}>
                  Disable
                </IconButton>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminDashboard() {
  const [view, setView] = useState("reservations");

  return (
    <div className="admin-layout">
      <div className="segmented compact" role="tablist" aria-label="Admin section">
        <button className={view === "reservations" ? "active" : ""} onClick={() => setView("reservations")}>
          <CalendarDays size={16} aria-hidden="true" />
          Reservations
        </button>
        <button className={view === "tables" ? "active" : ""} onClick={() => setView("tables")}>
          <Table2 size={16} aria-hidden="true" />
          Tables
        </button>
      </div>
      {view === "reservations" ? <AdminReservations /> : <AdminTables />}
    </div>
  );
}

function AppHeader({ user, onLogout }) {
  return (
    <header className="app-header">
      <div className="brand-block small">
        <div className="brand-mark">
          <Table2 size={24} aria-hidden="true" />
        </div>
        <div>
          <p className="eyebrow">Restaurant</p>
          <h1>Reservations</h1>
        </div>
      </div>
      <div className="user-block">
        <span className={`role-pill ${user.role}`}>
          {user.role === "admin" ? <Shield size={15} aria-hidden="true" /> : <UserRound size={15} aria-hidden="true" />}
          {user.role}
        </span>
        <span className="user-name">{user.name}</span>
        <IconButton icon={LogOut} className="ghost" onClick={onLogout} title="Logout">
          Logout
        </IconButton>
      </div>
    </header>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;

    api
      .me()
      .then((payload) => setUser(payload.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    clearToken();
    setUser(null);
  }

  if (loading) {
    return (
      <main className="loading-shell">
        <CheckCircle2 size={24} aria-hidden="true" />
        <span>Loading</span>
      </main>
    );
  }

  if (!user) {
    return <AuthScreen onAuthed={setUser} />;
  }

  return (
    <div className="app-shell">
      <AppHeader user={user} onLogout={logout} />
      <main>{user.role === "admin" ? <AdminDashboard /> : <CustomerDashboard user={user} />}</main>
    </div>
  );
}
