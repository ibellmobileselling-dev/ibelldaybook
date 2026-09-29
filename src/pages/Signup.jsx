import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ shopName: "", ownerName: "", phone: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signup(form);
      navigate("/");
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-header">
        <h1>Create Account</h1>
        <p>Set up your shop's daybook</p>
      </div>
      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label>Shop Name</label>
          <input required value={form.shopName} onChange={(e) => update("shopName", e.target.value)} placeholder="IBELL MOBILE" />
        </div>
        <div className="field">
          <label>Owner Name</label>
          <input required value={form.ownerName} onChange={(e) => update("ownerName", e.target.value)} />
        </div>
        <div className="field">
          <label>Phone</label>
          <input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" required minLength={6} value={form.password} onChange={(e) => update("password", e.target.value)} />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button className="btn btn-primary btn-block" disabled={busy} type="submit">
          {busy ? "Creating..." : "Create Account"}
        </button>
      </form>
      <div className="link-row">
        Already have an account? <Link to="/login">Login</Link>
      </div>
    </div>
  );
}
