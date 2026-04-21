import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getGoogleAuthUrl } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");

    const payload = new FormData();
    payload.append("name", form.name);
    payload.append("email", form.email);
    payload.append("password", form.password);
    if (profilePicture) payload.append("profilePicture", profilePicture);

    setLoading(true);
    try {
      await signup(payload);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell auth-shell">
      <form className="panel auth-panel" onSubmit={handleSubmit}>
        <p className="eyebrow">Create account</p>
        <h1>Join CarPool Hub</h1>
        <p className="muted-text">Add a profile picture now or update it later from your profile.</p>
        {error ? <div className="flash-message error">{error}</div> : null}
        <label>
          <span>Full name</span>
          <input type="text" name="name" value={form.name} onChange={updateField} required />
        </label>
        <label>
          <span>Email</span>
          <input type="email" name="email" value={form.email} onChange={updateField} required />
        </label>
        <label>
          <span>Password</span>
          <input type="password" name="password" value={form.password} onChange={updateField} required />
        </label>
        <label>
          <span>Confirm password</span>
          <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={updateField} required />
        </label>
        <label>
          <span>Profile picture</span>
          <input type="file" accept="image/*" onChange={(event) => setProfilePicture(event.target.files?.[0] || null)} />
        </label>
        <button type="submit" className="solid-button" disabled={loading}>{loading ? "Creating account..." : "Signup"}</button>
        <a className="google-button" href={getGoogleAuthUrl("signup")}>Continue with Google</a>
        <p className="muted-text">Already have an account? <Link to="/login">Login</Link></p>
      </form>
    </div>
  );
}
