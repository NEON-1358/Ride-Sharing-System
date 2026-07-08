import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FaCarSide, FaCompass, FaIdBadge, FaListUl, FaRightFromBracket, FaShieldHalved, FaUserPlus } from "react-icons/fa6";

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
        <span className="brand-mark"><FaCarSide /></span>
        <span className="brand-text">CoRide</span>
      </Link>
      <nav className="nav">
        {isAuthenticated ? (
          <>
            <NavLink to="/dashboard"><FaCompass /> Dashboard</NavLink>
            <NavLink to="/my-rides"><FaListUl /> My Rides</NavLink>
            <NavLink to="/profile"><FaIdBadge /> Profile</NavLink>
            {user?.isAdmin ? <NavLink to="/admin"><FaShieldHalved /> Admin</NavLink> : null}
            <button type="button" className="icon-button" onClick={handleLogout} aria-label="Logout" title="Logout"><FaRightFromBracket /></button>
          </>
        ) : (
          <>
            <NavLink to="/">Home</NavLink>
            <NavLink to="/login">Login</NavLink>
            <Link to="/signup" className="solid-button nav-cta"><FaUserPlus /> Signup</Link>
          </>
        )}
      </nav>
    </header>
  );
}
