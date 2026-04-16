import React, { useEffect, useState } from "react";
import { listAdminOverview } from "../utils/api";

export default function Admin() {
  const [data, setData] = useState({ users: [], rides: [], bookings: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    listAdminOverview().then(setData).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="page-shell">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h1>Admin overview</h1>
            <p>Simple validation view for users, rides, and bookings.</p>
          </div>
        </div>
        {error ? <div className="flash-message error">{error}</div> : null}
        <div className="admin-grid">
          <div>
            <h2>Users</h2>
            {data.users.map((user) => <div key={user.id} className="admin-row">{user.name} • {user.email}</div>)}
          </div>
          <div>
            <h2>Rides</h2>
            {data.rides.map((ride) => <div key={ride.id} className="admin-row">{ride.source} to {ride.destination} • {ride.status}</div>)}
          </div>
          <div>
            <h2>Bookings</h2>
            {data.bookings.map((booking) => <div key={booking.id} className="admin-row">{booking.user?.name} • {booking.ride?.source} to {booking.ride?.destination} • {booking.status}</div>)}
          </div>
        </div>
      </section>
    </div>
  );
}
