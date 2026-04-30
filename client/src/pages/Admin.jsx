import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listAdminOverview } from "../utils/api";
import { useToast } from "../context/ToastContext";

export default function Admin() {
  const { showToast } = useToast();
  const [data, setData] = useState({ users: [], rides: [], bookings: [] });

  useEffect(() => {
    listAdminOverview().then(setData).catch((err) => showToast(err.message, 'error'));
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
        <div className="admin-grid">
          <div>
            <h2>Users</h2>
            {data.users.map((user) => <div key={user.id} className="admin-row"><Link to={`/profile/${user.id}`} className="user-link">{user.name}</Link> • {user.email}</div>)}
          </div>
          <div>
            <h2>Rides</h2>
            {data.rides.map((ride) => <div key={ride.id} className="admin-row">{ride.source} to {ride.destination} • {ride.status}</div>)}
          </div>
          <div>
            <h2>Bookings</h2>
            {data.bookings.map((booking) => <div key={booking.id} className="admin-row"><Link to={`/profile/${booking.user?.id}`} className="user-link">{booking.user?.name}</Link> • {booking.ride?.source} to {booking.ride?.destination} • {booking.status}</div>)}
          </div>
        </div>
      </section>
    </div>
  );
}
