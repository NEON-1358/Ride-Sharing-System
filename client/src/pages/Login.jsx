import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getGoogleAuthUrl } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { FaEye, FaEyeSlash } from "react-icons/fa6";

export default function Login() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      await login({ email, password });
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell auth-shell">
      <form className="panel auth-panel" onSubmit={handleSubmit}>
        <p className="eyebrow">Welcome back</p>
        <h1>Login to your account</h1>
        <p className="muted-text">Use the same login for riders and ride creators.</p>
        <label>
          <span>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          <span>Password</span>
          <div className="password-input-wrapper">
            <input 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={(event) => setPassword(event.target.value)} 
              required 
            />
            <button 
              type="button" 
              className="password-toggle" 
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </label>
        <button type="submit" className="solid-button" disabled={loading}>{loading ? "Signing in..." : "Login"}</button>
        <a className="google-button" href={getGoogleAuthUrl("login")}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="google-logo" />
          Continue with Google
        </a>
        <p className="muted-text">New here? <Link to="/signup">Create an account</Link></p>
      </form>
    </div>
  );
}
