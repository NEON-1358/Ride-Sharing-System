/*
  storage.js - ported utilities from the original common.js
  Provides simple localStorage-backed helpers used by pages.
*/

export function getUsers() {
  const raw = localStorage.getItem('users');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') return Object.values(parsed);
    return [];
  } catch (err) {
    console.error('getUsers parse error:', err, raw);
    return [];
  }
}
export function saveUsers(users) {
  const toSave = Array.isArray(users) ? users : (users ? [users] : []);
  localStorage.setItem('users', JSON.stringify(toSave));
}

export function getDrivers() {
  const raw = localStorage.getItem('drivers');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') return Object.values(parsed);
    return [];
  } catch (err) {
    console.error('getDrivers parse error:', err, raw);
    return [];
  }
}
export function saveDrivers(drivers) {
  const toSave = Array.isArray(drivers) ? drivers : (drivers ? [drivers] : []);
  localStorage.setItem('drivers', JSON.stringify(toSave));
}

export function getRides() {
  const raw = localStorage.getItem('rides');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') return Object.values(parsed);
    return [];
  } catch (err) {
    console.error('getRides parse error:', err, raw);
    return [];
  }
}
export function saveRides(rides) {
  const toSave = Array.isArray(rides) ? rides : (rides ? [rides] : []);
  localStorage.setItem('rides', JSON.stringify(toSave));
}

export function generateId(prefix = 'r') {
  return prefix + Date.now() + Math.floor(Math.random() * 1000);
}

export function seatsLeft(ride) {
  const total = Number(ride.seats || 0);
  const booked = (ride.bookings || []).reduce((s, b) => s + (Number(b.qty || b.seats || 1) || 0), 0);
  return Math.max(0, total - booked);
}

export function setCurrentUser(user) {
  localStorage.setItem('currentUser', JSON.stringify(user));
}
export function getCurrentUser() {
  const raw = localStorage.getItem('currentUser');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('getCurrentUser parse error:', err);
    return null;
  }
}
export function logout() {
  localStorage.removeItem('currentUser');
}

// CRUD operations for rides used by the React components
export function createRide(data) {
  const current = getCurrentUser();
  if (!current) return false;
  const rides = getRides();
  const ride = {
    id: generateId('ride'),
    driverEmail: current.email,
    from: data.from || '',
    to: data.to || '',
    date: data.date || '',
    time: data.time || '',
    seats: Number(data.seats || 0),
    price: Number(data.price || 0),
    notes: data.notes || '',
    pickup: data.pickup || '',
    bookings: [],
    createdAt: Date.now()
  };
  rides.push(ride);
  saveRides(rides);
  return ride;
}

export function updateRide(id, data) {
  const rides = getRides();
  const ride = rides.find(r => r.id === id);
  if (!ride) return false;
  const bookedSum = (ride.bookings || []).reduce((s, b) => s + (Number(b.qty || b.seats || 1) || 0), 0);
  if (data.seats && Number(data.seats) < bookedSum) return false;
  Object.assign(ride, data);
  saveRides(rides);
  return true;
}

export function deleteRideById(id) {
  const rides = getRides();
  const idx = rides.findIndex(r => r.id === id);
  if (idx === -1) return false;
  rides.splice(idx, 1);
  saveRides(rides);
  return true;
}

export function bookRide(id, qty = 1) {
  const current = getCurrentUser();
  if (!current) throw new Error('not logged in');
  const rides = getRides();
  const ride = rides.find(r => r.id === id);
  if (!ride) throw new Error('ride not found');
  if (ride.driverEmail === current.email) throw new Error('cannot book own ride');
  if ((ride.bookings || []).some(b => b.email === current.email)) throw new Error('already booked');
  const left = seatsLeft(ride);
  if (qty > left) throw new Error('not enough seats');
  ride.bookings = ride.bookings || [];
  ride.bookings.push({ email: current.email, name: current.firstName + (current.lastName ? ' ' + current.lastName : ''), qty, bookedAt: Date.now() });
  saveRides(rides);
  return true;
}

export function cancelBooking(rideId) {
  const current = getCurrentUser();
  if (!current) throw new Error('not logged in');
  const rides = getRides();
  const ride = rides.find(r => r.id === rideId);
  if (!ride) throw new Error('ride not found');
  const idx = (ride.bookings || []).findIndex(b => b.email === current.email);
  if (idx === -1) throw new Error('no booking');
  ride.bookings.splice(idx, 1);
  saveRides(rides);
  return true;
}

export function seedDemoRides() {
  if (getRides().length > 0) return;
  const demoDriverEmail = 'demo@driver.local';
  const drivers = getDrivers();
  if (!drivers.find(d => d.email === demoDriverEmail)) {
    drivers.push({ name: 'Demo Driver', email: demoDriverEmail, phone: '9999999999', license: 'DEMO123', vehicle: 'Demo Car' });
    saveDrivers(drivers);
  }
  const sample = [
    { id: generateId('ride'), driverEmail: demoDriverEmail, from: 'Downtown', to: 'Airport', date: new Date(Date.now() + 86400000).toISOString().slice(0,10), time: '09:00', seats: 3, price: 350, notes: 'No smoking', pickup: 'Central Bus Stop', bookings: [], createdAt: Date.now() - 5000 },
    { id: generateId('ride'), driverEmail: demoDriverEmail, from: 'College', to: 'Mall', date: new Date(Date.now() + 172800000).toISOString().slice(0,10), time: '18:30', seats: 2, price: 100, notes: 'Evening ride', pickup: 'North Gate', bookings: [], createdAt: Date.now() - 4000 }
  ];
  saveRides(sample);
}
