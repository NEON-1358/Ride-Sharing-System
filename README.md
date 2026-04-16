# Ride-Sharing System

This is a full-stack ride-sharing application featuring a Node.js/Express backend and a React/Vite frontend. It supports two user roles (Driver and Client) with distinct functionalities, JWT-based authentication, and real-time data interaction for booking and managing rides.

## Features

*   **User Authentication**: Secure registration and login for both drivers and clients using JWT.
*   **Dual Roles**:
    *   **Clients**: Can view, search, book, and cancel rides. They are prevented from booking multiple concurrent rides.
    *   **Drivers**: Can create rides, view booking requests from clients (with contact info), and accept, reject, or cancel bookings. They can also cancel their own rides, which cascades to all related bookings.
*   **Dynamic Ride Management**:
    *   Available rides are automatically filtered to hide past or full (0 seats) rides.
    *   Seat availability is automatically decremented on booking acceptance and incremented on cancellation.
*   **Interactive Frontend**: Built with React and Vite, providing a responsive user experience.

## Project Structure

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

*   Node.js (v14 or higher)
*   npm (v6 or higher)

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/NKD-25/Ride-Sharing-System.git
    ```

2.  **Backend Setup:**
    - Navigate to the project root directory.
    - Install dependencies: `npm install`
    - Run the dev server: `npm run dev` (starts on `http://localhost:3000`)

3.  **Frontend Setup:**
    - Navigate to the `public` directory: `cd public`
    - Install dependencies: `npm install`
    - Run the dev server: `npm run dev` (starts on `http://localhost:5173`)

## Usage

1.  **Register an Account**: Open the frontend (`http://localhost:5173`) and register as either a **Driver** or a **Client**.
2.  **Driver Flow**:
    - Log in as a Driver.
    - Create a new ride by filling out the form.
    - View incoming booking requests and either **Accept** or **Reject** them.
    - Cancel your own rides if needed.
3.  **Client Flow**:
    - Log in as a Client.
    - Search for available rides.
    - Book a ride and wait for the driver to accept.
    - Cancel your booking at any time.

```
/
├── data/                 # JSON files for data storage (users, rides, bookings)
├── public/               # React/Vite frontend application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/        # Home, Login, Register pages
│   │   └── utils/        # API client and auth helpers
│   ├── package.json      # Frontend dependencies
│   └── vite.config.js
├── src/                  # Node.js backend source
│   ├── controllers/      # API logic for auth, rides, bookings
│   ├── middleware/       # JWT authentication middleware
│   ├── routes/           # API route definitions
│   └── utils/            # Filesystem utilities
├── package.json          # Backend dependencies
├── server.js             # Backend entry point
└── README.md             # This file
```

## Backend Setup

The backend is a Node.js server using Express.

1.  **Navigate to the project root directory:**
    ```sh
    cd Ride-Sharing-System
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Run the development server:**
    This command uses `nodemon` to automatically restart the server on file changes.
    ```sh
    npm run dev
    ```
    The server will start on `http://localhost:3000` by default.

    *Note*: If port 3000 is in use, you can specify a different port:
    ```sh
    # For PowerShell
    $env:PORT=3001; npm run dev

    # For bash/zsh
    PORT=3001 npm run dev
    ```

### API Endpoints

*   `POST /api/auth/register` - Register a new user (client or driver).
*   `POST /api/auth/login` - Log in and receive a JWT.
*   `GET /api/rides` - Get a list of available (not past, not full) rides.
*   `POST /api/rides` - Create a new ride (driver only).
*   `DELETE /api/rides/:id` - Cancel an entire ride and its bookings (driver only).
*   `POST /api/bookings` - Book a ride (client only).
*   `PUT /api/bookings/:id` - Update booking status (accept/reject) (driver only).
*   `PUT /api/bookings/:id/cancel` - Cancel a booking (client only).
*   `GET /api/bookings/driver` - Get booking requests for the logged-in driver.
*   `GET /api/bookings/rider` - Get bookings for the logged-in client.

## Frontend Setup

The frontend is a React application built with Vite.

1.  **Navigate to the `public` directory:**
    ```sh
    cd public
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Run the development server:**
    ```sh
    npm run dev
    ```
    The frontend will be available at `http://localhost:5173`.

    *Note*: If you encounter a PowerShell script execution error on Windows, run this command once in PowerShell (with administrator rights if needed):
    ```powershell
    Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
    ```

## Team Members

*   **Nishchal**: Project Lead / Data Engineer
*   **Ishani**: Frontend Developer
*   **Lakshay**: Backend Developer
*   **Hiten**: UI/UX Designer
