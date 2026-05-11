import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { acceptBooking, cancelBooking, createReview, createRide, deleteRide, listMyBookings, listRides, rejectBooking, updateRideStatus, updateRideLocation, SOCKET_BASE } from "../utils/api";
import { useToast } from "../context/ToastContext";
import ChatBox from "../components/ChatBox";
import { FaMapMarkerAlt, FaSearch, FaRegTimesCircle, FaCar } from "react-icons/fa";
import { io } from "socket.io-client";

const createRideState = {
  source: "",
  destination: "",
  departureTime: "",
  totalSeats: 1,
  price: 0,
  description: "",
  sourceCoords: null,
  destinationCoords: null,
};

export default function MyRides() {
  const { showToast } = useToast();
  const [rideForm, setRideForm] = useState(createRideState);
  const [myRides, setMyRides] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [activeChat, setActiveChat] = useState(null);
  const [suggestions, setSuggestions] = useState({ source: [], destination: [] });
  const [loadingSuggestions, setLoadingSuggestions] = useState({ source: false, destination: false });
  const [noResults, setNoResults] = useState({ source: false, destination: false });
  const [isValidating, setIsValidating] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(null);
  const [locationSocket, setLocationSocket] = useState(null);
  const dropdownRef = useRef(null);
  const abortControllerRef = useRef({ source: null, destination: null });
  const skipSearchRef = useRef({ source: false, destination: false });

  // Debounced price calculation
  useEffect(() => {
    if (rideForm.sourceCoords && rideForm.destinationCoords) {
      calculatePrice(rideForm.sourceCoords, rideForm.destinationCoords);
    } else {
      setEstimatedPrice(null);
    }
  }, [rideForm.sourceCoords, rideForm.destinationCoords]);

  async function calculatePrice(start, end) {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=false`
      );
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const distanceKm = data.routes[0].distance / 1000;
        const price = Math.round(distanceKm * 5); // ₹5 per km
        setEstimatedPrice(price);
        // Automatically update the price field if it's currently 0 or empty
        if (!rideForm.price || rideForm.price === 0) {
          setRideForm(prev => ({ ...prev, price }));
        }
      }
    } catch (error) {
      console.error("Price estimation error:", error);
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSuggestions({ source: [], destination: [] });
        setNoResults({ source: false, destination: false });
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      // Clean up abort controllers
      if (abortControllerRef.current.source) abortControllerRef.current.source.abort();
      if (abortControllerRef.current.destination) abortControllerRef.current.destination.abort();
    };
  }, []);

  // Debounced suggestion fetch
  useEffect(() => {
    if (skipSearchRef.current.source) {
      skipSearchRef.current.source = false;
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      if (rideForm.source.trim().length >= 3) {
        fetchSuggestions(rideForm.source, "source");
      } else {
        setSuggestions(prev => ({ ...prev, source: [] }));
        setNoResults(prev => ({ ...prev, source: false }));
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [rideForm.source]);

  useEffect(() => {
    if (skipSearchRef.current.destination) {
      skipSearchRef.current.destination = false;
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      if (rideForm.destination.trim().length >= 3) {
        fetchSuggestions(rideForm.destination, "destination");
      } else {
        setSuggestions(prev => ({ ...prev, destination: [] }));
        setNoResults(prev => ({ ...prev, destination: false }));
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [rideForm.destination]);

  async function fetchSuggestions(query, type) {
    // Cancel previous request for this type
    if (abortControllerRef.current[type]) {
      abortControllerRef.current[type].abort();
    }
    abortControllerRef.current[type] = new AbortController();

    setLoadingSuggestions(prev => ({ ...prev, [type]: true }));
    setNoResults(prev => ({ ...prev, [type]: false }));
    
    try {
      // Using Photon API (photon.komoot.io) which is much better for autocomplete/type-ahead
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8&location_bias_scale=0.5`;
      const response = await fetch(url, { signal: abortControllerRef.current[type].signal });
      
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      
      if (data && data.features) {
        // Map Photon features to our expected structure
        const mappedResults = data.features.map(f => {
          const p = f.properties;
          const name = p.name || "";
          const city = p.city || p.town || p.village || "";
          const state = p.state || "";
          const country = p.country || "";
          
          // Create a nice display name: "Name, City, State, Country"
          const parts = [name, city, state, country].filter(part => part && part.length > 0);
          const displayName = [...new Set(parts)].join(", "); // Remove duplicates and join
          
          return {
            display_name: displayName,
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            raw: p // keep original properties just in case
          };
        });

        // Filter to prioritize India results if any exist, or just show all
        const indiaResults = mappedResults.filter(r => r.display_name.toLowerCase().includes("india"));
        const finalResults = indiaResults.length > 0 ? indiaResults : mappedResults;

        setSuggestions(prev => ({ ...prev, [type]: finalResults }));
        setNoResults(prev => ({ ...prev, [type]: finalResults.length === 0 }));
      } else {
        setSuggestions(prev => ({ ...prev, [type]: [] }));
        setNoResults(prev => ({ ...prev, [type]: true }));
      }
    } catch (error) {
      if (error.name === 'AbortError') return; // Ignore aborted requests
      console.error("Suggestions error:", error);
      setSuggestions(prev => ({ ...prev, [type]: [] }));
      setNoResults(prev => ({ ...prev, [type]: true }));
    } finally {
      setLoadingSuggestions(prev => ({ ...prev, [type]: false }));
    }
  }

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

    // Real-time suggestions for source and destination are now handled by useEffect with debounce

    // Price Suggestion Logic
    if (name === "source" || name === "destination") {
      // Very basic mock suggestion: 5 rupees per km (assuming average city distance if inputs are non-empty)
      if (rideForm.source && rideForm.destination) {
        const suggestedPrice = Math.floor(Math.random() * (500 - 200) + 200); // Mock range
        // We could show this as a hint rather than auto-filling
      }
    }
  }

  useEffect(() => {
    const socketUrl = `${SOCKET_BASE}/location`;
    const s = io(socketUrl, { transports: ['websocket', 'polling'] });
    setLocationSocket(s);
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    let watchId = null;
    const inProgressRides = myRides.filter(r => r.status === "In Progress");

    if (inProgressRides.length > 0 && navigator.geolocation && locationSocket) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          inProgressRides.forEach(ride => {
            // Update API
            updateRideLocation(ride.id, latitude, longitude).catch(err => console.error("Location sync error:", err));
            // Update Socket
            locationSocket.emit("update_location", { rideId: ride.id, lat: latitude, lng: longitude });
          });
        },
        (error) => console.error("Geolocation error:", error),
        { enableHighAccuracy: true, distanceFilter: 50 } // Update every 50 meters
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [myRides, locationSocket]);

  async function handleCreateRide(event) {
    event.preventDefault();
    if (isValidating) return;

    // Frontend Validations
    const now = new Date();
    const departureDate = new Date(rideForm.departureTime);

    if (departureDate <= now) {
      return showToast("Departure time must be in the future.", "error");
    }

    if (rideForm.source.trim().length < 3 || rideForm.destination.trim().length < 3) {
      return showToast("Source and destination must be at least 3 characters.", "error");
    }

    // Verify locations exist in the real world
    setIsValidating(true);
    
    // If we already have coordinates from suggestions, we can skip verification fetch
    if (rideForm.sourceCoords && rideForm.destinationCoords) {
      // Proceed to create ride
    } else {
      showToast("Verifying locations with map...", "info");
      try {
        const [srcRes, destRes] = await Promise.all([
          fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(rideForm.source)}&limit=1&countrycodes=in`),
          fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(rideForm.destination)}&limit=1&countrycodes=in`)
        ]);
        const [srcData, destData] = await Promise.all([srcRes.json(), destRes.json()]);

        if (!srcData || srcData.length === 0) {
          setIsValidating(false);
          return showToast(`Location not found: '${rideForm.source}'. Please select a real address from the suggestions.`, "error");
        }
        if (!destData || destData.length === 0) {
          setIsValidating(false);
          return showToast(`Location not found: '${rideForm.destination}'. Please select a real address from the suggestions.`, "error");
        }

        // Update coords if they were missing
        setRideForm(prev => ({
          ...prev,
          sourceCoords: [parseFloat(srcData[0].lon), parseFloat(srcData[0].lat)],
          destinationCoords: [parseFloat(destData[0].lon), parseFloat(destData[0].lat)]
        }));
      } catch (err) {
        console.error("Verification error:", err);
        // Fallback: if geocoding is down, we let the server try to handle it
      }
    }

    if (rideForm.source.toLowerCase() === rideForm.destination.toLowerCase()) {
      setIsValidating(false);
      return showToast("Source and destination cannot be the same.", "error");
    }

    if (Number(rideForm.price) < 50) {
      setIsValidating(false);
      return showToast("Minimum price per seat is ₹50.", "error");
    }

    try {
      await createRide(rideForm);
      setRideForm(createRideState);
      showToast("Ride published successfully!");
      await loadData();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsValidating(false);
    }
  }

  async function changeRideStatus(rideId, status) {
    try {
      await updateRideStatus(rideId, status);
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

  function handleSelectSuggestion(suggestion, type) {
    const coords = [parseFloat(suggestion.lon), parseFloat(suggestion.lat)];
    skipSearchRef.current[type] = true;
    setRideForm(prev => ({ 
      ...prev, 
      [type]: suggestion.display_name,
      [`${type}Coords`]: coords
    }));
    setSuggestions(prev => ({ ...prev, [type]: [] }));
    setNoResults(prev => ({ ...prev, [type]: false }));
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
        <form className="filter-grid" onSubmit={handleCreateRide} ref={dropdownRef}>
          <div className="relative">
            <input name="source" placeholder="Source" value={rideForm.source} onChange={updateField} required autoComplete="off" />
            {(suggestions.source.length > 0 || loadingSuggestions.source || noResults.source) && (
              <div className="suggestions-dropdown">
                {loadingSuggestions.source ? (
                  <div className="suggestion-empty">
                    <FaSearch className="animate-pulse" />
                    <span>Searching for locations...</span>
                  </div>
                ) : noResults.source ? (
                  <div className="suggestion-empty">
                    <FaRegTimesCircle />
                    <span>No results found for "{rideForm.source}"</span>
                  </div>
                ) : (
                  suggestions.source.map((s, i) => (
                    <div key={i} className="suggestion-item" onClick={() => handleSelectSuggestion(s, 'source')}>
                      <FaMapMarkerAlt className="suggestion-icon" />
                      <span className="suggestion-text">{s.display_name}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="relative">
            <input name="destination" placeholder="Destination" value={rideForm.destination} onChange={updateField} required autoComplete="off" />
            {(suggestions.destination.length > 0 || loadingSuggestions.destination || noResults.destination) && (
              <div className="suggestions-dropdown">
                {loadingSuggestions.destination ? (
                  <div className="suggestion-empty">
                    <FaSearch className="animate-pulse" />
                    <span>Searching for locations...</span>
                  </div>
                ) : noResults.destination ? (
                  <div className="suggestion-empty">
                    <FaRegTimesCircle />
                    <span>No results found for "{rideForm.destination}"</span>
                  </div>
                ) : (
                  suggestions.destination.map((s, i) => (
                    <div key={i} className="suggestion-item" onClick={() => handleSelectSuggestion(s, 'destination')}>
                      <FaMapMarkerAlt className="suggestion-icon" />
                      <span className="suggestion-text">{s.display_name}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <input name="departureTime" type="datetime-local" value={rideForm.departureTime} onChange={updateField} required />
          <div className="input-group">
            <input name="totalSeats" type="number" min="1" value={rideForm.totalSeats} onChange={updateField} required />
            <small className="muted-text">Seats available</small>
          </div>
          <div className="input-group">
            <input name="price" type="number" min="0" value={rideForm.price} onChange={updateField} required />
            <small className="muted-text">
              Price per seat {estimatedPrice ? `(Suggested: ₹${estimatedPrice})` : "(Recommended: ₹250 - ₹500)"}
            </small>
          </div>
          <input name="description" placeholder="Description" value={rideForm.description} onChange={updateField} />
          <button type="submit" className="solid-button" disabled={isValidating}>
            {isValidating ? "Verifying..." : "Publish ride"}
          </button>
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
                          <button type="button" className="ghost-button" onClick={() => {
                            console.log("DRIVER CHAT OPEN:", {
                              bookingId: p.id,
                              ownerId: ride.creator?.id,
                              passengerId: p.user?.id
                            });
                            setActiveChat({ 
                              id: p.id, 
                              ownerId: ride.creator?.id, 
                              ownerName: ride.creator?.name, 
                              passengerId: p.user?.id 
                            });
                          }}>Chat</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="ride-actions">
                  {ride.permissions.canStart ? <button type="button" className="solid-button" onClick={() => changeRideStatus(ride.id, "In Progress")}>Start trip</button> : null}
                  {ride.permissions.canComplete ? <button type="button" className="solid-button" onClick={() => changeRideStatus(ride.id, "Completed")}>End trip & Complete</button> : null}
                  {!["Completed", "Cancelled"].includes(ride.status) ? <button type="button" className="ghost-button" onClick={() => changeRideStatus(ride.id, "Cancelled")}>Cancel ride</button> : null}
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
                  {booking.status === "Completed" && (
                    <span className="accent-text">Fare: ₹{booking.finalFare} ({booking.paymentStatus})</span>
                  )}
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
