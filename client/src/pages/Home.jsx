import React from "react";
import { Link } from "react-router-dom";
import { FaCalendarCheck, FaComments, FaLocationDot, FaRoute, FaShieldHeart } from "react-icons/fa6";

export default function Home() {
  return (
    <div className="home-page">
      <section className="marketing-hero">
        <div className="hero-content">
          <p className="eyebrow">Shared rides, cleaner coordination</p>
          <h1>CoRide</h1>
          <p className="hero-copy">
            Plan a shared trip, reserve a seat, chat with the driver, and follow every booking from request to arrival.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="solid-button">Start riding</Link>
            <Link to="/login" className="ghost-button">Login</Link>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="route-card">
            <div className="route-line"><span></span><i></i><span></span></div>
            <div>
              <strong>Indore Junction</strong>
              <small>Today, 8:30 AM</small>
            </div>
            <div>
              <strong>Vijay Nagar</strong>
              <small>3 seats available</small>
            </div>
          </div>
          <div className="driver-card">
            <span>AK</span>
            <div>
              <strong>Aarav Kumar</strong>
              <small>4.8 rating - verified driver</small>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-band">
        <div className="feature-stack">
          <article className="feature-card">
            <FaLocationDot />
            <h2>Route-first search</h2>
            <p>Search with live location suggestions and inspect trips on an interactive map.</p>
          </article>
          <article className="feature-card">
            <FaCalendarCheck />
            <h2>Booking control</h2>
            <p>Drivers accept requests, riders track status, and completed trips can be reviewed.</p>
          </article>
          <article className="feature-card">
            <FaRoute />
            <h2>Trip management</h2>
            <p>Create rides with seats, fares, status updates, and live location support.</p>
          </article>
          <article className="feature-card">
            <FaShieldHeart />
            <h2>Trust signals</h2>
            <p>Profiles, ratings, ride history, and private booking chat keep each ride accountable.</p>
          </article>
          <article className="feature-card feature-wide">
            <FaComments />
            <h2>Built for real coordination</h2>
            <p>Notifications, chat, booking states, and driver tools sit in one focused ride-sharing workspace.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
