# SmartWaste

Full-stack garbage collection, tracking and recycling platform built with the MERN stack
(MongoDB, Express, React, Node.js). Citizens book a pickup, a truck with enough capacity
gets matched automatically, the driver verifies collection with an OTP, and the waste
handover at the authorized yard is also OTP-verified so a driver can't just dump garbage
somewhere else. Recyclable waste gets turned into marketplace products that users can
redeem with the reward points they earned from recycling.

## Stack

- MongoDB + Mongoose
- Express / Node.js
- React (Vite) + React Router
- Leaflet / OpenStreetMap for the truck map
- Socket.IO for live status updates
- JWT auth, bcrypt password hashing

## Project structure

```
smartwaste/
├── server/     # Express API, MongoDB models, business logic
└── client/     # React frontend
```

## Running it locally

### 1. Backend

```
cd server
npm install
cp .env.example .env   # fill in your Mongo URI and JWT secret
npm run dev
```

Server runs on http://localhost:5000 by default.

Note: redeeming a product in the marketplace uses a MongoDB transaction (so points,
stock and the order all update together). This needs Mongo running as a replica set —
either use MongoDB Atlas, or run a local single-node replica set with
`mongod --replSet rs0` and then `rs.initiate()` once in the mongo shell.

Optional: seed some sample data (one admin, two drivers with trucks already assigned,
one yard, four marketplace products) so you can test the full flow immediately:

```
npm run seed
```

This creates:
- `admin@smartwaste.test` / `password123`
- `driver1@smartwaste.test` / `password123` (truck TS09AB1234)
- `driver2@smartwaste.test` / `password123` (truck TS09CD5678)

It's safe to run once — if it finds the admin account already exists it skips and does
nothing, so it won't create duplicates.

### 2. Frontend

```
cd client
npm install
cp .env.example .env   # points the socket.io client at your backend
npm run dev
```

Client runs on http://localhost:3000 and proxies /api requests to the backend.
Live updates (truck locations/capacity, OTP generated, garbage collected, truck full,
yard handover completed) come through Socket.IO — the pickup booking map and the
tracking page both listen for these and refresh automatically instead of you having to
reload the page.

### 3. Creating driver/admin accounts

If you didn't use the seed script: regular users can self-register from the app, but
Driver and Admin accounts are not open for public signup — they're created by an
existing admin. To bootstrap the very first admin, either:

- run `npm run seed` in `server/` (easiest), or
- temporarily insert one directly in MongoDB with a bcrypt-hashed password, or
- temporarily allow `role` in `authController.register`, create the admin account once,
  then revert the change.

Once you have an admin, use the Admin Dashboard → Users tab to create driver accounts,
then Trucks tab to add trucks and assign drivers to them.

## Core flow

```
User books pickup
   -> nearest available truck with enough capacity is auto-assigned
   -> driver accepts, drives over, marks arrived
   -> OTP sent to user, driver enters it to verify
   -> driver enters actual collected weight
   -> truck load updates, reward points credited to user
   -> once truck is full it stops appearing on the map and heads to the yard
   -> yard admin generates an OTP, driver enters it to confirm handover
   -> yard records received weight + waste breakdown, truck resets and becomes available
   -> admin lists recycled products in the marketplace
   -> users redeem products using their reward points
```

## Notes

- All weight/capacity/OTP checks are enforced on the backend, not just the frontend.
- OTPs are hashed before being stored, never saved in plain text, and expire after
  10-15 minutes.
- The UI is intentionally plain — functional forms, tables and cards, no animation
  libraries or unnecessary styling.
