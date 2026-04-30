import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="topbar">
      <Link to={isAuthenticated ? "/dashboard" : "/"} className="brand">
        <span className="brand-mark">C</span>
        <span>CarPool Hub</span>
      </Link>
      <nav className="nav">
        {isAuthenticated ? (
          <>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/my-rides">My Rides</NavLink>
            <NavLink to="/profile">Profile</NavLink>
            {user?.isAdmin ? <NavLink to="/admin">Admin</NavLink> : null}
            <button type="button" className="ghost-button" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <NavLink to="/">Home</NavLink>
            <NavLink to="/login">Login</NavLink>
            <Link to="/signup" className="solid-button">Signup</Link>
          </>
        )}
      </nav>
    </header>
  );
}
