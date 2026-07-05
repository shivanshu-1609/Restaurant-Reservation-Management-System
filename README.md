# Restaurant Reservation Management System

Full-stack assignment implementation using React, Express, MongoDB, and JWT authentication.

## Submission Links

- GitHub repository: [Restaurant-Reservation-Management-System](https://github.com/shivanshu-1609/Restaurant-Reservation-Management-System)
- Live deployment: [To be added after deployment]

## Features

- Customer registration, login, reservation creation, reservation history, and cancellation.
- Admin registration using a private admin code.
- Admin reservation list with optional date filtering.
- Admin update/cancel controls for any reservation.
- Admin table management with create, edit, activate/deactivate behavior.
- Automatic table assignment based on capacity and availability.
- Centralized API validation and error responses.

## Tech Stack

- Frontend: React with Vite
- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- Authentication: JWT
- Tests: Vitest, Supertest, mongodb-memory-server

## Local Setup

1. Install dependencies.

   ```bash
   pnpm install
   ```

2. Create the backend environment file.

   ```powershell
   Copy-Item server/.env.example server/.env
   ```

3. Update `server/.env`.

   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://127.0.0.1:27017/restaurant-reservations
   JWT_SECRET=replace-with-a-long-random-secret
   JWT_EXPIRES_IN=7d
   CLIENT_ORIGIN=http://localhost:5173
   ADMIN_REGISTRATION_CODE=replace-with-private-admin-code
   ```

4. Start MongoDB locally or use a MongoDB Atlas connection string.

5. Run the app.

   ```bash
   pnpm dev
   ```

6. Open the frontend at `http://localhost:5173`.

## Admin Access

There are two supported ways to create an admin:

- Register through the UI and enter the value from `ADMIN_REGISTRATION_CODE`.
- Seed an admin automatically by adding these variables to `server/.env`:

  ```env
  SEED_ADMIN_NAME=Restaurant Admin
  SEED_ADMIN_EMAIL=admin@example.com
  SEED_ADMIN_PASSWORD=Admin12345
  ```

The app does not hard-code admin credentials.

## Reservation And Availability Logic

The system assumes a single restaurant with seeded tables:

- Two 2-seat tables
- Three 4-seat tables
- Two 6-seat tables
- One 8-seat table

When a customer creates a reservation, the backend:

1. Validates the date, time slot, party size, and notes.
2. Rejects dates in the past.
3. Finds active tables with enough capacity.
4. Sorts those tables by capacity and table number.
5. Removes tables already booked for the same date and time slot.
6. Assigns the smallest available table that fits the party.
7. Returns `409 Conflict` if no suitable table is available.

Cancelled reservations are ignored by the availability check. A MongoDB unique partial index on `table + reservationDate + timeSlot` for active reservations protects against double booking if two requests race at the same time.

## Role-Based Access

Customers can:

- Create reservations.
- View their own reservations.
- Cancel their own reservations.

Admins can:

- View all reservations.
- Filter reservations by date.
- Update any active reservation.
- Cancel any active reservation.
- Add and update tables.
- Deactivate tables.

Protected endpoints require a `Bearer` token. Admin endpoints also require the `admin` role.

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/reservations/my`
- `POST /api/reservations`
- `PATCH /api/reservations/:id/cancel`
- `GET /api/admin/reservations?date=YYYY-MM-DD`
- `PATCH /api/admin/reservations/:id`
- `PATCH /api/admin/reservations/:id/cancel`
- `GET /api/admin/tables`
- `POST /api/admin/tables`
- `PATCH /api/admin/tables/:id`
- `DELETE /api/admin/tables/:id`

## Testing

Run backend tests:

```bash
pnpm test
```

The test suite uses an in-memory MongoDB instance and covers table assignment, capacity conflicts, occupied-slot conflicts, role restrictions, and customer cancellation.

## Deployment

The project can be deployed as a single Render web service that serves the built React app from Express.

1. Create a MongoDB Atlas cluster and copy its connection string.
2. Push this project to GitHub.
3. In Render, create a web service from the repo or use `render.yaml`.
4. Set these environment variables:

   ```env
   NODE_ENV=production
   MONGODB_URI=<your MongoDB Atlas connection string>
   JWT_SECRET=<long random production secret>
   JWT_EXPIRES_IN=7d
   CLIENT_ORIGIN=<your Render app URL>
   ADMIN_REGISTRATION_CODE=<private admin registration code>
   ```

5. Use these commands if configuring manually:

   ```bash
   corepack enable && pnpm install --frozen-lockfile=false && pnpm --filter client build
   pnpm --filter server start
   ```

For separate frontend and backend deployments, set `VITE_API_URL` in the frontend deployment to the backend public URL.

## Assumptions

- A reservation occupies one predefined 30-minute time slot.
- Each reservation is assigned exactly one table.
- Tables can be deactivated, but existing active reservations are not automatically cancelled.
- Payments, notifications, real-time updates, and waitlists are out of scope.

## Known Limitations

- Time slots are fixed in code.
- The app does not support combining multiple tables for large parties.
- Admins cannot restore cancelled reservations; they should create or update an active reservation instead.
- Deployment requires external MongoDB credentials and platform account access.

## Future Improvements

- Configurable restaurant hours and slot duration.
- Email confirmations and cancellation notices.
- Waitlist support.
- Reservation search by guest name or email.
- Audit history for admin changes.
