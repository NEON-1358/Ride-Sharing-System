import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { googleAuthUrl } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login({ email, password });
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
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
        {error ? <div className="flash-message error">{error}</div> : null}
        <label>
          <span>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <button type="submit" className="solid-button" disabled={loading}>{loading ? "Signing in..." : "Login"}</button>
        <a className="google-button" href={googleAuthUrl}>Continue with Google</a>
        <p className="muted-text">New here? <Link to="/signup">Create an account</Link></p>
      </form>
    </div>
  );
}
