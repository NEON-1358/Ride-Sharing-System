# 🚗 Ride-Sharing System

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![OSRM](https://img.shields.io/badge/OSRM-3D9970?style=for-the-badge&logo=openstreetmap&logoColor=white)](http://project-osrm.org/)

A premium, Uber-like full-stack ride-sharing platform built with modern technologies. Features include real-time location tracking, smart price estimation, and professional map routing.

---

## ✨ Standout Features

### 🗺️ Smart Map System
- **Instant Location Search**: Real-time "type-ahead" suggestions powered by Photon search engine.
- **Professional Routing**: Uses OSRM to calculate and display the **actual shortest road route** between two points.
- **Live Trip Tracking**: Passengers see a moving car icon on the map as the driver progresses.

### 💰 Intelligent Pricing
- **Dynamic Price Estimation**: Automatically suggests a fair price (₹5 per km) based on the calculated route distance.
- **Transparent Suggestions**: Drivers see the recommended price as a hint and can still set their own rates.

### 💬 Enhanced Chat System
- **Typing Indicators**: See when the other person is typing, just like WhatsApp.
- **Real-Time Delivery**: Instant message sync across all devices using Socket.io.
- **Message History**: Persistent chat history stored in the database.

---

## 🚀 Project Workflow

### 1. User Onboarding
- **Registration**: Sign up as Driver or Passenger with secure JWT auth.
- **Social Login**: Quick Google OAuth for one-tap access.
- **Trust & Verification**: Built-in email, phone, and government ID verification badges.

### 2. The Ride Lifecycle
- **Create a Ride**: Drivers set source/destination and get automatic price suggestions.
- **Discover Rides**: Passengers search with smart filters on the beautiful Uber-style dashboard.
- **Book & Approve**: Request seats, get instant approval, and receive real-time status updates.
- **Track & Complete**: Monitor live location during the trip and leave a review afterward.

---

## 🛠️ Tech Stack

### Frontend
- **React 18** with **Vite** for blazing-fast development
- **Leaflet.js** for interactive maps with custom car markers
- **Socket.io-client** for real-time communication
- **Tailwind-inspired custom styling** for a premium UI

### Backend
- **Node.js/Express** with **Mongoose** ORM
- **MongoDB Atlas** cloud database for high availability
- **Socket.io** for WebSocket-based live updates
- **Passport.js** for secure authentication

### External APIs
- **Photon**: Lightning-fast location search & autocomplete
- **OSRM**: Professional routing engine for accurate distance calculations
- **Nominatim**: Reverse geocoding for map interactions

---

## 🏗️ Project Structure

```
/
├── client/              # Frontend
│   ├── src/
│   │   ├── components/  # MapComponent, ChatBox, Header
│   │   ├── pages/       # Dashboard, MyRides, Profile
│   │   └── context/     # Auth, Toast, and global state
│   └── package.json
├── server/              # Backend
│   ├── src/
│   │   ├── controllers/ # Ride, Booking, Auth, Chat
│   │   ├── models/      # Mongoose schemas
│   │   ├── routes/      # REST API endpoints
│   │   └── app.js       # Express + Socket.io setup
│   └── server.js        # Entry point
└── package.json         # Monorepo root
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v16+
- [MongoDB](https://www.mongodb.com/cloud/atlas) (we recommend Atlas for cloud hosting)

### 1. Install Dependencies
```bash
npm run install-all
```

### 2. Configure Environment
Add your cloud database and API keys to `server/.env`:
```env
MONGO_URI=mongodb+srv://yourUsername:password@cluster0.mongodb.net/rideshare
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...
```

### 3. Launch the App
```bash
# Run both client and server
npm run dev

# Or separately
npm run server  # Backend (Port 3000)
npm run client  # Frontend (Port 5173)
```

---

## 📱 Screenshots & Highlights

| Feature | Description |
| :--- | :--- |
| **Dashboard** | Beautiful Uber-style layout with map search |
| **Live Tracking** | Car icon follows the driver's real-time GPS position |
| **Price Suggestion** | Calculates fair pricing based on actual road distance |
| **Typing Indicators** | Modern chat experience for rider-driver coordination |

---

## 🤝 The Team

| Name | Role |
| :--- | :--- |
| **Nishchal** | Project Lead & Full-Stack Developer |
| **Ishani** | Frontend Dev |
| **Lakshay** | Backend Dev |
| **Hiten** | UI/UX Design |

---

## 📝 License
This project is a student assignment showcasing modern full-stack development. All rights reserved.

---

*Built with ❤️ for seamless carpooling experiences!*
