import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../utils/api';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('rider'); // rider = client
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    if (!name || !email || !password || !role) { alert('All fields are required.'); return; }
    register({ name, email: email.toLowerCase(), password, role })
      .then(() => {
        alert('Registration successful! Please log in.');
        navigate('/login');
      })
      .catch(err => alert(err.message || 'Registration failed'));
  }

  return (
    <main className="container form-page">
      <form className="form" onSubmit={handleSubmit}>
        <h2>Register</h2>
        <div className="form-group"><label>Full Name</label><input value={name} onChange={e=>setName(e.target.value)} required /></div>
        <div className="form-group"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
        <div className="form-group"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
        <div className="form-group">
          <label>Register as</label>
          <select value={role} onChange={e=>setRole(e.target.value)}>
            <option value="rider">Client</option>
            <option value="driver">Driver</option>
          </select>
        </div>
        <button className="btn">Create Account</button>
      </form>
    </main>
  );
}
