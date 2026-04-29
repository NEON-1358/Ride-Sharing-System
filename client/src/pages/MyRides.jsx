import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { acceptBooking, cancelBooking, createReview, createRide, deleteRide, listMyBookings, listRides, rejectBooking, updateRideStatus } from "../utils/api";
import { useToast } from "../context/ToastContext";
import ChatBox from "../components/ChatBox";

const createRideState = {
  source: "",
  destination: "",
  departureTime: "",
  totalSeats: 1,
  price: 0,
  description: "",
};

export default function MyRides() {
  const { showToast } = useToast();
  const [rideForm, setRideForm] = useState(createRideState);
  const [myRides, setMyRides] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [activeChat, setActiveChat] = useState(null);

  async function loadData() {
    const [ridesResponse, bookingsResponse] = await Promise.all([listRides({ mine: true, limit: 20 }), listMyBookings()]);
    setMyRides(ridesResponse.items || []);
    setMyBookings(bookingsResponse || []);
  }

  useEffect(() => {
    loadData().catch((error) => showToast(error.message, 'error'));
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setRideForm((current) => ({ ...current, [name]: value }));

    // Price Suggestion Logic
    if (name === "source" || name === "destination") {
      // Very basic mock suggestion: 5 rupees per km (assuming average city distance if inputs are non-empty)
      if (rideForm.source && rideForm.destination) {
        const suggestedPrice = Math.floor(Math.random() * (500 - 200) + 200); // Mock range
        // We could show this as a hint rather than auto-filling
      }
    }
  }

  async function handleCreateRide(event) {
    event.preventDefault();
    try {
      await createRide(rideForm);
      setRideForm(createRideState);
      showToast("Ride created successfully.");
      await loadData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function changeRideStatus(rideId, status) {
    try {
      await updateRideStatus(rideId, { status });
      showToast(`Ride marked as ${status}.`);
      await loadData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function handleDeleteRide(rideId) {
    try {
      const response = await deleteRide(rideId);
      showToast(response.message);
      await loadData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function handleCancelBooking(bookingId) {
    try {
      await cancelBooking(bookingId);
      showToast("Booking cancelled.");
      await loadData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function handleAcceptBooking(bookingId) {
    try {
      await acceptBooking(bookingId);
      showToast("Booking accepted.");
      await loadData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function handleRejectBooking(bookingId) {
    try {
      await rejectBooking(bookingId);
      showToast("Booking rejected.");
      await loadData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function handleReviewSubmit(event, rideId) {
    event.preventDefault();
    const draft = reviewDrafts[rideId] || { rating: 5, comment: "" };

    try {
      await createReview({ rideId, rating: Number(draft.rating), comment: draft.comment });
      showToast("Review submitted.");
      setReviewDrafts((current) => ({ ...current, [rideId]: { rating: 5, comment: "" } }));
      await loadData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  return (
    <div className="page-shell">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h1>Create a ride</h1>
            <p>Post a trip with clear details and live seat availability.</p>
          </div>
        </div>
        <form className="filter-grid" onSubmit={handleCreateRide}>
          <input name="source" placeholder="Source" value={rideForm.source} onChange={updateField} required />
          <input name="destination" placeholder="Destination" value={rideForm.destination} onChange={updateField} required />
          <input name="departureTime" type="datetime-local" value={rideForm.departureTime} onChange={updateField} required />
          <div className="input-group">
            <input name="totalSeats" type="number" min="1" value={rideForm.totalSeats} onChange={updateField} required />
            <small className="muted-text">Seats available</small>
          </div>
          <div className="input-group">
            <input name="price" type="number" min="0" value={rideForm.price} onChange={updateField} required />
            <small className="muted-text">Price per seat (Recommended: ₹250 - ₹500)</small>
          </div>
          <input name="description" placeholder="Description" value={rideForm.description} onChange={updateField} />
          <button type="submit" className="solid-button">Publish ride</button>
        </form>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Rides you created</h2>
              <p>Manage status, delete unused rides, or complete trips.</p>
            </div>
          </div>
          <div className="card-list">
            {myRides.length === 0 ? <p className="muted-text">You have not created any rides yet.</p> : null}
            {myRides.map((ride) => (
              <article key={ride.id} className="ride-card">
                <div className="ride-head">
                  <div>
                    <h3>{ride.source} to {ride.destination}</h3>
                    <p>{new Date(ride.departureTime).toLocaleString()}</p>
                  </div>
                  <span className={`status-pill status-${ride.status.toLowerCase()}`}>{ride.status}</span>
                </div>
                <p className="ride-description">{ride.description || "No description added."}</p>
                <div className="ride-meta">
                  <span>{ride.availableSeats}/{ride.totalSeats} seats left</span>
                  <span>{ride.passengerCount} confirmed seats</span>
                </div>
                {ride.passengers && ride.passengers.length > 0 && (
                  <div className="passenger-list">
                    <h4>Booking Requests</h4>
                    {ride.passengers.map((p) => (
                      <div key={p.id} className="passenger-item">
                        <span>
                          <Link to={`/profile/${p.user?.id}`} className="user-link">{p.user?.name}</Link>
                          {" "}({p.seats} seats) - <strong>{p.status}</strong>
                        </span>
                        <div className="passenger-actions">
                          {p.permissions?.canAccept && <button type="button" className="ghost-button" onClick={() => handleAcceptBooking(p.id)}>Accept</button>}
                          {p.permissions?.canReject && <button type="button" className="ghost-button" onClick={() => handleRejectBooking(p.id)}>Reject</button>}
                          {p.permissions?.canCancel && <button type="button" className="ghost-button" onClick={() => handleCancelBooking(p.id)}>Cancel</button>}
                          <button type="button" className="ghost-button" onClick={() => setActiveChat({ id: p.id, ownerId: ride.creator?.id, ownerName: ride.creator?.name, passengerId: p.user?.id })}>Chat</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="ride-actions">
                  {ride.permissions.canComplete ? <button type="button" className="solid-button" onClick={() => changeRideStatus(ride.id, "Completed")}>Mark completed</button> : null}
                  {ride.status !== "Cancelled" ? <button type="button" className="ghost-button" onClick={() => changeRideStatus(ride.id, "Cancelled")}>Cancel ride</button> : null}
                  <button type="button" className="ghost-button" onClick={() => handleDeleteRide(ride.id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        </div>


        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Your bookings</h2>
              <p>Track active, cancelled, and completed bookings.</p>
            </div>
          </div>
          <div className="booking-list">
            {myBookings.length === 0 ? <p className="muted-text">No bookings yet.</p> : null}
            {myBookings.map((booking) => (
              <article key={booking.id} className="booking-item">
                <div className="ride-head">
                  <div>
                    <h3>{booking.ride?.source} to {booking.ride?.destination}</h3>
                    <p>{new Date(booking.ride?.departureTime).toLocaleString()}</p>
                  </div>
                  <span className={`status-pill status-${booking.status.toLowerCase()}`}>{booking.status}</span>
                </div>
                <div className="ride-meta">
                  <span>{booking.seats} seat(s)</span>
                  <span>Driver: <Link to={`/profile/${booking.ride?.creator?.id}`} className="user-link">{booking.ride?.creator?.name}</Link></span>
                </div>
                <div className="ride-actions">
                  {["Pending", "Accepted", "Completed"].includes(booking.status) ? (
                    <button type="button" className="ghost-button" onClick={() => setActiveChat({ id: booking.id, ownerId: booking.ride?.creator?.id, ownerName: booking.ride?.creator?.name, passengerId: booking.user?.id })}>
                      Chat with Driver
                    </button>
                  ) : null}
                  {["Pending", "Accepted"].includes(booking.status) ? <button type="button" className="ghost-button" onClick={() => handleCancelBooking(booking.id)}>Cancel booking</button> : null}
                </div>
                {booking.status === "Completed" ? (
                  <form className="review-form" onSubmit={(event) => handleReviewSubmit(event, booking.ride.id)}>
                    <select
                      value={reviewDrafts[booking.ride.id]?.rating || 5}
                      onChange={(event) =>
                        setReviewDrafts((current) => ({
                          ...current,
                          [booking.ride.id]: { rating: event.target.value, comment: current[booking.ride.id]?.comment || "" },
                        }))
                      }
                    >
                      {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
                    </select>
                    <input
                      placeholder="Short comment"
                      value={reviewDrafts[booking.ride.id]?.comment || ""}
                      onChange={(event) =>
                        setReviewDrafts((current) => ({
                          ...current,
                          [booking.ride.id]: { rating: current[booking.ride.id]?.rating || 5, comment: event.target.value },
                        }))
                      }
                    />
                    <button type="submit" className="solid-button">Submit review</button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      {activeChat && (
        <ChatBox 
          bookingId={activeChat.id} 
          rideOwnerId={activeChat.ownerId} 
          rideOwnerName={activeChat.ownerName} 
          passengerId={activeChat.passengerId}
          onClose={() => setActiveChat(null)} 
        />
      )}
    </div>
  );
}
