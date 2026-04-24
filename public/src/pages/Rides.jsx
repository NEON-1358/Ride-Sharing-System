import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';

export default function Rides() {
  const { showToast } = useToast();
  const [rides, setRides] = useState([]);
  
  useEffect(() => {
    fetchRides();
  }, []);

  const fetchRides = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/rides');
      if (res.ok) {
        const data = await res.json();
        setRides(data);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const bookRide = async (rideId) => {
    const token = localStorage.getItem('token');
    if (!token) return showToast('Please login first!', 'error');
    
    try {
      const res = await fetch('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rideId, seatsNeeded: 1 })
      });
      if (res.ok) showToast('Ride booked successfully!');
      else showToast('Failed to book ride', 'error');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="page-container">
      <h2 style={{ color: 'var(--primary)', marginBottom: '30px' }}>Available Quantum Rides</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {rides.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No rides available currently. The network is quiet.</p>
        ) : (
          rides.map(ride => (
            <div key={ride._id || ride.id} className="ride-card">
              <h3 style={{ marginBottom: '10px' }}>{ride.origin} ➔ {ride.destination}</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '5px' }}>Date: {new Date(ride.departureTime).toLocaleString()}</p>
              <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>Seats Available: <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{ride.seatsAvailable}</span></p>
              <button className="btn-primary" onClick={() => bookRide(ride._id || ride.id)}>
                Book Connection
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
