import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getGoogleAuthUrl } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Signup() {
  const { signup } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [loading, setLoading] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (form.password.length < 8) return showToast("Password must be at least 8 characters.", "error");
    if (form.password !== form.confirmPassword) return showToast("Passwords do not match.", "error");

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
      showToast(err.message, 'error');
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
          <div className="password-input-wrapper">
            <input 
              type={showPassword ? "text" : "password"} 
              name="password" 
              value={form.password} 
              onChange={updateField} 
              required 
            />
            <button 
              type="button" 
              className="password-toggle" 
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>
        </label>
        <label>
          <span>Confirm password</span>
          <div className="password-input-wrapper">
            <input 
              type={showConfirmPassword ? "text" : "password"} 
              name="confirmPassword" 
              value={form.confirmPassword} 
              onChange={updateField} 
              required 
            />
            <button 
              type="button" 
              className="password-toggle" 
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>
        </label>
        <label>
          <span>Profile picture</span>
          <input type="file" accept="image/*" onChange={(event) => setProfilePicture(event.target.files?.[0] || null)} />
        </label>
        <button type="submit" className="solid-button" disabled={loading}>{loading ? "Creating account..." : "Signup"}</button>
        <a className="google-button" href={getGoogleAuthUrl("signup")}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="google-logo" />
          Continue with Google
        </a>
        <p className="muted-text">Already have an account? <Link to="/login">Login</Link></p>
      </form>
    </div>
  );
}
