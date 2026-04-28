import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="page-shell">
      <section className="marketing-hero">
        <div>
          <p className="eyebrow">Production-style car-pooling</p>
          <h1>Commutes that feel coordinated, safe, and effortless.</h1>
          <p className="hero-copy">
            CarPool Hub helps commuters discover trusted rides, book seats, manage trip status, and review ride creators with a polished, real-world flow.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="solid-button">Create account</Link>
            <Link to="/login" className="ghost-button">Login</Link>
          </div>
        </div>
        <div className="feature-stack">
          <article className="feature-card">
            <h2>Unified access</h2>
            <p>One signup and one login flow, with both email/password and Google OAuth.</p>
          </article>
          <article className="feature-card">
            <h2>Smart booking rules</h2>
            <p>Duplicate bookings, over-booking, and invalid ride statuses are blocked by the backend.</p>
          </article>
          <article className="feature-card">
            <h2>Trust signals</h2>
            <p>Profile photos, joined date, ride history, and post-trip reviews give the app a real product feel.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
