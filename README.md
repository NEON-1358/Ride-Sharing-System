# 🚗 Ride-Sharing System

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

A modern, full-stack ride-sharing platform that connects drivers with passengers. Built with a focus on seamless user experience, real-time updates, and robust booking management.

---

## 🚀 Project Workflow

### 1. User Onboarding
- **Registration**: Users sign up as either a **Driver** or a **Passenger**.
- **Social Integration**: Seamless login via **Google OAuth 2.0**.
- **Verification**: Built-in verification flow for **Email**, **Phone**, and **Government ID** to ensure trust.

### 2. The Ride Lifecycle
- **Creation**: Drivers publish rides specifying route (Source/Destination), departure time, price, and total seats.
- **Discovery**: Passengers use the **Dashboard** to search for rides with advanced filters (Route, Date, Seats).
- **Booking**: Passengers request seats; the system prevents double-booking and validates seat availability.
- **Approval**: Drivers review requests on their **My Rides** page and can **Accept** or **Reject**.
- **Execution**: The system tracks the ride status from *Pending* to *Accepted* to *Completed* or *Cancelled*.

### 3. Real-Time Feedback
- **Notifications**: Users receive instant alerts for booking requests, status updates, and cancellations.
- **Toast System**: Modern, non-intrusive popup notifications for all actions.
- **Seat Sync**: Atomic database operations ensure that available seats are always accurate across all users' views.

---

## ✨ Key Features

### 👤 User Roles & Auth
- **Secure Authentication**: JWT-based login and registration with role-based access control (RBAC).
- **Profile Management**: Users can update their personal details and track their ride history/ratings.
- **Trust System**: Verification badges for verified email, phone, and ID.

### 🚘 Driver Capabilities
- **Ride Dashboard**: Manage all created rides in one place.
- **Request Management**: Detailed view of passenger requests including seat counts and status.
- **Ride Control**: Ability to mark rides as completed or cancel them (with automatic passenger notification).

### 🎫 Passenger Experience
- **Smart Dashboard**: Paginated ride listings with real-time seat availability.
- **Booking History**: Track the status of all requested and past bookings.
- **Review System**: Rate drivers and leave comments after completing a trip.

### 🛡️ Admin Features
- **Centralized Overview**: Admins can monitor all users, rides, and bookings in the system for moderation.

---

## 🛠️ Technical Highlights
- **Atomic Database Operations**: Uses MongoDB's `$inc` operator for race-condition-free seat management.
- **Custom Toast System**: A React Context-based notification system with smooth animations.
- **Responsive Design**: Clean, modern UI that works across desktop and mobile devices.
- **Clean Architecture**: Separation of concerns with dedicated controllers, routes, and middleware.

---

## 🏗️ Project Architecture

```bash
/
├── src/                  # 🟢 Backend (Node.js/Express)
│   ├── controllers-mongo/# Business Logic (Admin, Auth, Booking, Notification, Review, Ride, Verify)
│   ├── models/           # Mongoose Schemas (User, Ride, Booking, Notification, Review)
│   ├── routes/           # API Endpoints
│   ├── middleware/       # Auth & Role-based Access Logic
│   └── app.js            # Express Configuration
├── public/               # 🔵 Frontend (React/Vite)
│   ├── src/
│   │   ├── components/   # Reusable UI (Header, ProtectedRoute)
│   │   ├── pages/        # Dashboard, MyRides, CreateRide, Profile, Admin, etc.
│   │   ├── context/      # Global State (AuthContext, ToastContext)
│   │   └── style.css     # Global Styles & Animations
│   └── index.html
├── data/                 # Local Storage & Uploads
└── server.js             # Backend Entry Point
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas)

### 1. Clone the Repository
```bash
git clone https://github.com/NKD-25/Ride-Sharing-System.git
cd Ride-Sharing-System
```

### 2. Backend Setup
```bash
# Install dependencies
npm install

# Configure Environment Variables (.env)
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret

# Start the server
npm run dev
```

### 3. Frontend Setup
```bash
cd public
npm install
npm run dev
```
Visit `http://localhost:5173` to start using the app!

---

## 🤝 The Team

| Name | Role |
| :--- | :--- |
| **Nishchal** | Project Lead / Data Engineer |
| **Ishani** | Frontend Developer |
| **Lakshay** | Backend Developer |
| **Hiten** | UI/UX Designer |

---

## 📝 License
This project is part of a student assignment. All rights reserved.

---
*Built with ❤️ by the Ride-Sharing Team*
