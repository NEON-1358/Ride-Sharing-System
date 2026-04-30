import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createBooking, listNotifications, listRides, markNotificationsRead } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import MapComponent from "../components/MapComponent";
import { FaCircle, FaSquare, FaClock, FaUser } from "react-icons/fa";

const initialFilters = { source: "", destination: "", dateFrom: "", dateTo: "", seats: "", page: 1, limit: 6 };

export default function Dashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [filters, setFilters] = useState(initialFilters);
  const [rides, setRides] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState([22.9734, 78.6569]); // Center of India
  const [mapZoom, setMapZoom] = useState(5);
  const [markers, setMarkers] = useState([]);
  const [activeField, setActiveField] = useState('source'); // 'source' or 'destination'

  async function getCoordinates(query) {
    if (!query) return null;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
    return null;
  }

  async function getAddress(lat, lon) {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await response.json();
      if (data && data.display_name) {
        // Return a shorter version of the address if possible
        const parts = data.display_name.split(',');
        return parts.slice(0, 3).join(',').trim();
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
    }
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }

  async function handleMapClick(latlng) {
    const address = await getAddress(latlng.lat, latlng.lng);
    
    setFilters(current => ({
      ...current,
      [activeField]: address
    }));

    setMarkers(current => {
      const otherField = activeField === 'source' ? 'destination' : 'source';
      const otherMarker = current.find(m => m.type === otherField);
      const newMarkers = [{ 
        position: [latlng.lat, latlng.lng], 
        popup: `${activeField === 'source' ? 'Pickup' : 'Drop-off'}: ${address}`,
        type: activeField
      }];
      if (otherMarker) newMarkers.push(otherMarker);
      return newMarkers;
    });

    // Auto-switch to destination if we just set source
    if (activeField === 'source') {
      setActiveField('destination');
    }
  }

  async function loadData(nextFilters = filters) {
    setLoading(true);
    try {
      const [rideResponse, notificationResponse] = await Promise.all([listRides(nextFilters), listNotifications()]);
      setRides(rideResponse.items || []);
      setPagination(rideResponse.pagination || { page: 1, totalPages: 1, total: 0 });
      setNotifications(notificationResponse || []);
      
      // If we have rides, maybe center the map on the first one's source?
      // For now just keep it static or update based on search
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
    
    // Update map markers based on source and destination
    const newMarkers = [];
    if (filters.source) {
      const sourceCoords = await getCoordinates(filters.source);
      if (sourceCoords) newMarkers.push({ position: sourceCoords, popup: `Pickup: ${filters.source}`, type: 'source' });
    }
    if (filters.destination) {
      const destCoords = await getCoordinates(filters.destination);
      if (destCoords) newMarkers.push({ position: destCoords, popup: `Drop-off: ${filters.destination}`, type: 'destination' });
    }
    setMarkers(newMarkers);

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
      <section className="uber-container">
        <div className="uber-sidebar">
          <div className="panel uber-form-panel">
            <h1>Find a trip</h1>
            <form className="uber-form" onSubmit={submitFilters}>
              <div className="uber-input-group">
                <div className="uber-icon-column">
                  <FaCircle className="icon-pickup" />
                  <div className="icon-line"></div>
                  <FaSquare className="icon-dropoff" />
                </div>
                <div className="uber-fields">
                  <input 
                    name="source" 
                    placeholder="Pick-up location" 
                    value={filters.source} 
                    onChange={updateFilter} 
                    onFocus={() => setActiveField('source')}
                    className={activeField === 'source' ? 'active-input' : ''}
                  />
                  <input 
                    name="destination" 
                    placeholder="Drop-off location" 
                    value={filters.destination} 
                    onChange={updateFilter} 
                    onFocus={() => setActiveField('destination')}
                    className={activeField === 'destination' ? 'active-input' : ''}
                  />
                </div>
              </div>

              <div className="map-hint">
                {activeField === 'source' ? '📍 Click map to set Pickup' : '🏁 Click map to set Drop-off'}
              </div>

              <div className="uber-select-group">
                <div className="uber-select-item">
                  <FaClock />
                  <select name="dateFrom" onChange={updateFilter}>
                    <option value="">Pick up now</option>
                    {/* Add more options or a date picker here if needed */}
                  </select>
                </div>
                <div className="uber-select-item">
                  <FaUser />
                  <select name="seats" value={filters.seats} onChange={updateFilter}>
                    <option value="1">For me (1)</option>
                    <option value="2">2 passengers</option>
                    <option value="3">3 passengers</option>
                    <option value="4">4 passengers</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="uber-search-button">Search</button>
            </form>
          </div>
          
          <div className="uber-results">
            {loading ? <p className="muted-text">Searching rides...</p> : null}
            {!loading && rides.length === 0 ? <p className="muted-text">No rides found for this route.</p> : null}
            {rides.map((ride) => (
              <article key={ride.id} className="ride-card compact">
                <div className="ride-info">
                  <h3>{ride.source} to {ride.destination}</h3>
                  <p className="ride-time">{new Date(ride.departureTime).toLocaleString()}</p>
                  <div className="ride-meta">
                    <span>{ride.availableSeats} seats • INR {ride.price}</span>
                    <Link to={`/profile/${ride.creator?.id}`} className="user-link">{ride.creator?.name}</Link>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="solid-button mini" 
                  onClick={() => handleBook(ride.id)}
                  disabled={!ride.permissions.canBook}
                >
                  {ride.permissions.hasBooked ? "Booked" : "Book"}
                </button>
              </article>
            ))}
          </div>
        </div>

        <div className="uber-map-container">
          <MapComponent 
            center={mapCenter} 
            zoom={mapZoom} 
            markers={markers} 
            onMapClick={handleMapClick} 
          />
        </div>
      </section>

      {/* Keep original hero section for stats or remove if preferred */}
      <section className="hero-panel stats-only">
        <div className="stat-grid">
          <div className="stat-card"><span>Joined</span><strong>{new Date(user.joinedAt).toLocaleDateString()}</strong></div>
          <div className="stat-card"><span>Total rides</span><strong>{user.totalRidesParticipated}</strong></div>
          <div className="stat-card"><span>Rating</span><strong>{user.ratings.average.toFixed(1)} / 5</strong></div>
        </div>
      </section>
    </div>
  );
}
