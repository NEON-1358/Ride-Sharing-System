import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CreateRide() {
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    departureTime: '',
    seatsAvailable: 3,
    price: 10
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return alert('You must be logged in as a driver!');

    try {
      const res = await fetch('http://localhost:3000/api/rides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert('Ride created successfully!');
        navigate('/rides');
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to create ride. Ensure you are registered as a Driver.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-box">
        <div className="auth-header">
          <h2>Post a Ride</h2>
          <p>Share your journey across the neural net.</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Origin</label>
            <input type="text" name="origin" className="form-control" value={formData.origin} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Destination</label>
            <input type="text" name="destination" className="form-control" value={formData.destination} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Departure Time</label>
            <input type="datetime-local" name="departureTime" className="form-control" value={formData.departureTime} onChange={handleChange} required />
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Seats</label>
              <input type="number" name="seatsAvailable" className="form-control" min="1" max="8" value={formData.seatsAvailable} onChange={handleChange} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Price</label>
              <input type="number" name="price" className="form-control" min="0" value={formData.price} onChange={handleChange} required />
            </div>
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%' }}>
            Deploy Route
          </button>
        </form>
      </div>
    </div>
  );
}
