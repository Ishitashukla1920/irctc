
# Railway Management System

This is a Railway Management System that allows users to book trains, view their bookings, and manage trains (admin only).

## Features

- **User Features:**
  - Book a seat on a train.
  - View all bookings.
  - Cancel a booking.

- **Admin Features:**
  - Add new trains.
  - Update existing trains.
  - Delete trains.
  - View all bookings.

## Installation

### Prerequisites
- Node.js
- Supabase account
- Express.js
- React.js
- Axios (for API calls)

### Steps to Set Up

1. Clone the repository:
    ```bash
    git clone <repository-url>
    ```

2. Install the required dependencies:
    ```bash
    cd backend
    npm install
    cd ../frontend
    npm install
    ```

3. Configure the Supabase project in `config/database.js` file:
   - Set up your Supabase account and create a new project.
   - Update the database connection string and API keys.

4. Start the backend server:
    ```bash
    cd backend
    npm start
    ```

5. Start the frontend development server:
    ```bash
    cd frontend
    npm start
    ```

6. Open your browser and visit `http://localhost:3000` to start using the system.

## Admin Credentials

- **Email:** admin@gmail.com
- **Password:** admin123
- **Admin API Key:** `9a7c6b5e4d3f2a1b8c7d6e5f4a3b2c1d`

Use these credentials to log in as an admin and manage the trains and bookings.

## API Endpoints

### User API
1. **GET /api/trains** - Get all trains.
2. **GET /api/trains/:id** - Get train by ID.
3. **POST /api/bookings** - Create a new booking.
4. **GET /api/bookings/my-bookings** - Get user's bookings.


### Admin API
1. **POST /api/trains** - Add a new train (Admin only).
2. **PUT /api/trains/:id** - Update train details (Admin only).
3. **DELETE /api/trains/:id** - Delete a train (Admin only).

## Environment Variables
- **JWT_SECRET** - Secret key for JWT token authentication.
- **ADMIN_API_KEY** - API key for Admin access.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
