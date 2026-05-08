import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { createBooking, listNotifications, listRides, markNotificationsRead } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import MapComponent from "../components/MapComponent";
import { FaCircle, FaSquare, FaClock, FaUser, FaMapMarkerAlt, FaSearch, FaRegTimesCircle, FaCar } from "react-icons/fa";
import { io } from "socket.io-client";

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
  const [liveMarkers, setLiveMarkers] = useState({});
  const [route, setRoute] = useState([]);
  const [activeField, setActiveField] = useState('source'); // 'source' or 'destination'

  useEffect(() => {
    const socketUrl = `${window.location.protocol}//${window.location.hostname}:3000/location`;
    const s = io(socketUrl, { transports: ['websocket', 'polling'] });

    s.on('location_updated', (data) => {
      setLiveMarkers(prev => ({
        ...prev,
        [data.rideId]: { position: [data.lat, data.lng], type: 'live_car' }
      }));
    });

    // Join tracking for all in-progress rides we see
    rides.forEach(ride => {
      if (ride.status === "In Progress") {
        s.emit('join_ride_tracking', ride.id);
      }
    });

    return () => s.disconnect();
  }, [rides]);

  const allMarkers = [
    ...markers,
    ...Object.values(liveMarkers)
  ];

  async function fetchRoute(startCoords, endCoords) {
    if (!startCoords || !endCoords) return;
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startCoords[1]},${startCoords[0]};${endCoords[1]},${endCoords[0]}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRoute(coords);
      }
    } catch (error) {
      console.error("Routing error:", error);
    }
  }

  useEffect(() => {
    const sourceMarker = markers.find(m => m.type === 'source');
    const destMarker = markers.find(m => m.type === 'destination');
    if (sourceMarker && destMarker) {
      fetchRoute(sourceMarker.position, destMarker.position);
    } else {
      setRoute([]);
    }
  }, [markers]);
  const [suggestions, setSuggestions] = useState({ source: [], destination: [] });
  const [loadingSuggestions, setLoadingSuggestions] = useState({ source: false, destination: false });
  const [noResults, setNoResults] = useState({ source: false, destination: false });
  const dropdownRef = useRef(null);
  const abortControllerRef = useRef({ source: null, destination: null });
  const skipSearchRef = useRef({ source: false, destination: false });

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
      if (filters.source.trim().length >= 3) {
        fetchSuggestions(filters.source, "source");
      } else {
        setSuggestions(prev => ({ ...prev, source: [] }));
        setNoResults(prev => ({ ...prev, source: false }));
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [filters.source]);

  useEffect(() => {
    if (skipSearchRef.current.destination) {
      skipSearchRef.current.destination = false;
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      if (filters.destination.trim().length >= 3) {
        fetchSuggestions(filters.destination, "destination");
      } else {
        setSuggestions(prev => ({ ...prev, destination: [] }));
        setNoResults(prev => ({ ...prev, destination: false }));
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [filters.destination]);

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

  function handleSelectSuggestion(suggestion, type) {
     skipSearchRef.current[type] = true;
     setFilters(prev => ({ ...prev, [type]: suggestion.display_name }));
     setSuggestions(prev => ({ ...prev, [type]: [] }));
     setNoResults(prev => ({ ...prev, [type]: false }));
    
    // Also update map marker
    const coords = [parseFloat(suggestion.lat), parseFloat(suggestion.lon)];
    setMarkers(current => {
      const otherField = type === 'source' ? 'destination' : 'source';
      const otherMarker = current.find(m => m.type === otherField);
      const newMarkers = [{ 
        position: coords, 
        popup: `${type === 'source' ? 'Pickup' : 'Drop-off'}: ${suggestion.display_name}`,
        type: type
      }];
      if (otherMarker) newMarkers.push(otherMarker);
      return newMarkers;
    });

    if (type === 'source') {
      setActiveField('destination');
    }
  }

  async function getCoordinates(query) {
    if (!query) return null;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=in`);
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

    // Live Tracking Sync for "In Progress" rides
    const interval = setInterval(() => {
      loadData(filters);
    }, 15000); // Sync every 15 seconds

    return () => clearInterval(interval);
  }, [filters]);

  useEffect(() => {
    // Show rides on map
    const rideMarkers = rides.map(ride => ({
      position: ride.currentLocation ? [ride.currentLocation[1], ride.currentLocation[0]] : null,
      popup: `Ride: ${ride.source} to ${ride.destination} (${ride.status})`,
      type: ride.status === "In Progress" ? 'active_ride' : 'ride'
    })).filter(m => m.position);
    
    setMarkers(rideMarkers);
  }, [rides]);

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  async function submitFilters(event) {
    event.preventDefault();
    const nextFilters = { ...filters, page: 1 };
    setFilters(nextFilters);
    
    // Update map markers based on source and destination
    const [sourceCoords, destCoords] = await Promise.all([
      nextFilters.source ? getCoordinates(nextFilters.source) : null,
      nextFilters.destination ? getCoordinates(nextFilters.destination) : null
    ]);

    const newMarkers = [];
    if (sourceCoords) newMarkers.push({ position: sourceCoords, popup: `Pickup: ${nextFilters.source}`, type: 'source' });
    if (destCoords) newMarkers.push({ position: destCoords, popup: `Drop-off: ${nextFilters.destination}`, type: 'destination' });
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
            <form className="uber-form" onSubmit={submitFilters} ref={dropdownRef}>
              <div className="uber-input-group">
                <div className="uber-icon-column">
                  <FaCircle className="icon-pickup" />
                  <div className="icon-line"></div>
                  <FaSquare className="icon-dropoff" />
                </div>
                <div className="uber-fields">
                  <div className="relative">
                    <input 
                      name="source" 
                      placeholder="Pick-up location" 
                      value={filters.source} 
                      onChange={updateFilter} 
                      onFocus={() => setActiveField('source')}
                      className={activeField === 'source' ? 'active-input' : ''}
                      autoComplete="off"
                    />
                    {(suggestions.source.length > 0 || loadingSuggestions.source || noResults.source) && activeField === 'source' && (
                      <div className="suggestions-dropdown">
                        {loadingSuggestions.source ? (
                          <div className="suggestion-empty">
                            <FaSearch className="animate-pulse" />
                            <span>Searching...</span>
                          </div>
                        ) : noResults.source ? (
                          <div className="suggestion-empty">
                            <FaRegTimesCircle />
                            <span>No results for "{filters.source}"</span>
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
                    <input 
                      name="destination" 
                      placeholder="Drop-off location" 
                      value={filters.destination} 
                      onChange={updateFilter} 
                      onFocus={() => setActiveField('destination')}
                      className={activeField === 'destination' ? 'active-input' : ''}
                      autoComplete="off"
                    />
                    {(suggestions.destination.length > 0 || loadingSuggestions.destination || noResults.destination) && activeField === 'destination' && (
                      <div className="suggestions-dropdown">
                        {loadingSuggestions.destination ? (
                          <div className="suggestion-empty">
                            <FaSearch className="animate-pulse" />
                            <span>Searching...</span>
                          </div>
                        ) : noResults.destination ? (
                          <div className="suggestion-empty">
                            <FaRegTimesCircle />
                            <span>No results for "{filters.destination}"</span>
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
            markers={allMarkers} 
            route={route}
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
