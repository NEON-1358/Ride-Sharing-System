import React, { useEffect, useState } from "react";
import { createBooking, listNotifications, listRides, markNotificationsRead } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const initialFilters = { source: "", destination: "", dateFrom: "", dateTo: "", seats: "", page: 1, limit: 6 };

export default function Dashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [filters, setFilters] = useState(initialFilters);
  const [rides, setRides] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData(nextFilters = filters) {
    setLoading(true);
    try {
      const [rideResponse, notificationResponse] = await Promise.all([listRides(nextFilters), listNotifications()]);
      setRides(rideResponse.items || []);
      setPagination(rideResponse.pagination || { page: 1, totalPages: 1, total: 0 });
      setNotifications(notificationResponse || []);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  async function submitFilters(event) {
    event.preventDefault();
    const nextFilters = { ...filters, page: 1 };
    setFilters(nextFilters);
    await loadData(nextFilters);
  }

  async function changePage(nextPage) {
    const nextFilters = { ...filters, page: nextPage };
    setFilters(nextFilters);
    await loadData(nextFilters);
  }

  const [selectedSeats, setSelectedSeats] = useState({});

  async function handleBook(rideId) {
    const seats = selectedSeats[rideId] || 1;
    try {
      await createBooking({ rideId, seats });
      showToast("Ride booked successfully.");
      await loadData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  function updateSelectedSeats(rideId, value) {
    setSelectedSeats(current => ({ ...current, [rideId]: parseInt(value, 10) }));
  }

  async function handleReadNotifications() {
    await markNotificationsRead();
    await loadData();
  }

  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Find your next car-pool in a few taps.</h1>
          <p className="hero-copy">Search live rides, watch seat availability update, and keep your activity history in one place.</p>
        </div>
        <div className="stat-grid">
          <div className="stat-card"><span>Joined</span><strong>{new Date(user.joinedAt).toLocaleDateString()}</strong></div>
          <div className="stat-card"><span>Total rides</span><strong>{user.totalRidesParticipated}</strong></div>
          <div className="stat-card"><span>Rating</span><strong>{user.ratings.average.toFixed(1)} / 5</strong></div>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Search rides</h2>
              <p>Filter by route, date, and available seats.</p>
            </div>
          </div>
          <form className="filter-grid" onSubmit={submitFilters}>
            <input name="source" placeholder="Source" value={filters.source} onChange={updateFilter} />
            <input name="destination" placeholder="Destination" value={filters.destination} onChange={updateFilter} />
            <input name="dateFrom" type="date" value={filters.dateFrom} onChange={updateFilter} />
            <input name="dateTo" type="date" value={filters.dateTo} onChange={updateFilter} />
            <input name="seats" type="number" min="1" placeholder="Seats" value={filters.seats} onChange={updateFilter} />
            <button type="submit" className="solid-button">Apply filters</button>
          </form>
          {loading ? <p className="muted-text">Loading rides...</p> : null}
          <div className="card-list">
            {rides.map((ride) => (
              <article key={ride.id} className="ride-card">
                <div className="ride-head">
                  <div>
                    <h3>{ride.source} to {ride.destination}</h3>
                    <p>{new Date(ride.departureTime).toLocaleString()}</p>
                  </div>
                  <span className={`status-pill status-${ride.status.toLowerCase()}`}>{ride.status}</span>
                </div>
                <div className="ride-meta">
                  <span>{ride.availableSeats}/{ride.totalSeats} seats left</span>
                  <span>INR {ride.price}</span>
                  <span>{ride.creator?.name}</span>
                </div>
                <p className="ride-description">{ride.description || "No extra notes for this trip."}</p>
                <div className="ride-actions">
                  {ride.permissions.canBook && (
                    <div className="booking-controls" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select 
                        value={selectedSeats[ride.id] || 1} 
                        onChange={(e) => updateSelectedSeats(ride.id, e.target.value)}
                        style={{ width: 'auto', padding: '0.4rem' }}
                      >
                        {[...Array(ride.availableSeats)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1} seat{i > 0 ? 's' : ''}</option>
                        ))}
                      </select>
                      <button type="button" className="solid-button" onClick={() => handleBook(ride.id)}>
                        Book Now
                      </button>
                    </div>
                  )}
                  {!ride.permissions.canBook && (
                    <button type="button" className="solid-button" disabled>
                      {ride.permissions.hasBooked ? "Booked/Requested" : "Unavailable"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          <div className="pagination">
            <button type="button" className="ghost-button" disabled={pagination.page <= 1} onClick={() => changePage(pagination.page - 1)}>Previous</button>
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <button type="button" className="ghost-button" disabled={pagination.page >= pagination.totalPages} onClick={() => changePage(pagination.page + 1)}>Next</button>
          </div>
        </div>

        <aside className="panel">
          <div className="panel-heading">
            <div>
              <h2>Activity</h2>
              <p>Recent notifications and booking updates.</p>
            </div>
            <button type="button" className="ghost-button" onClick={handleReadNotifications}>Mark all read</button>
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? <p className="muted-text">No recent notifications yet.</p> : null}
            {notifications.map((notification) => (
              <article key={notification.id} className={`notification-item ${notification.readAt ? "read" : "unread"}`}>
                <strong>{notification.message}</strong>
                <span>{new Date(notification.createdAt).toLocaleString()}</span>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
