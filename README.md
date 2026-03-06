# CrashGuard (JDC) — Real-Time Crash Detection & Emergency Response System

A full-stack emergency response platform that detects vehicle crashes in real-time, dispatches ambulances, and manages hospital bed availability. Built with React + Vite (frontend), Express + Socket.io (backend), and Supabase (database & auth).

---

## Prerequisites

Before running this project, make sure the following are installed on your machine:

| Tool         | Version  | Download                                      |
| ------------ | -------- | --------------------------------------------- |
| **Node.js**  | v18+     | https://nodejs.org/                            |
| **npm**      | v9+      | Comes with Node.js                             |
| **Git**      | Latest   | https://git-scm.com/                           |

You will also need a **Supabase** project. Create one at [supabase.com](https://supabase.com) (free tier works).

---

## Project Structure

```
JDC/
├── frontend/          # React + Vite (port 5173)
├── backend/           # Express + Socket.io (port 3001)
├── supabase_schema.sql  # Database schema to run in Supabase SQL Editor
├── package.json       # Root dependencies
└── README.md
```

---

## Dependencies

### Frontend (`frontend/package.json`)

| Package                 | Purpose                          |
| ----------------------- | -------------------------------- |
| `react` (v19)           | UI framework                     |
| `react-dom` (v19)       | DOM rendering                    |
| `react-router-dom` (v7) | Client-side routing              |
| `@supabase/supabase-js` | Supabase client (auth + DB)      |
| `socket.io-client`      | Real-time WebSocket connection   |
| `axios`                 | HTTP requests                    |
| `recharts`              | Dashboard charts & analytics     |
| `leaflet`               | Map rendering engine             |
| `react-leaflet`         | React bindings for Leaflet maps  |
| `lucide-react`          | Icon library                     |
| `react-hot-toast`       | Toast notifications              |
| `date-fns`              | Date formatting utilities        |

**Dev Dependencies:**

| Package                       | Purpose                    |
| ----------------------------- | -------------------------- |
| `vite` (v8 beta)              | Build tool / dev server    |
| `@vitejs/plugin-react`        | React support for Vite     |
| `eslint` + plugins            | Code linting               |
| `@types/react`, `@types/react-dom` | TypeScript type hints |

### Backend (`backend/package.json`)

| Package                 | Purpose                              |
| ----------------------- | ------------------------------------ |
| `express` (v5)          | HTTP server framework                |
| `@supabase/supabase-js` | Supabase client (auth + DB)          |
| `socket.io`             | Real-time WebSocket server           |
| `cors`                  | Cross-origin request handling        |
| `dotenv`                | Environment variable loading         |
| `bcryptjs`              | Password hashing                     |
| `jsonwebtoken`          | JWT token generation & verification  |
| `uuid`                  | Unique ID generation                 |

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Atharva-2107/JDC.git
cd JDC
```

### 2. Set Up Supabase Database

1. Go to your Supabase project → **SQL Editor**
2. Copy the contents of `supabase_schema.sql` and run it
3. This creates the `profiles`, `crashes`, `hospitals`, `ambulances` tables with RLS policies, triggers, and seed data

### 3. Configure Environment Variables

**Backend** — Create `backend/.env`:

```env
PORT=3001
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

**Frontend** — Create `frontend/.env`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> Get these values from your Supabase project → **Settings → API**.

### 4. Install Dependencies

```bash
# Root dependencies
npm install

# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 5. Run the Application

Open **two terminals**:

**Terminal 1 — Backend (Express + Socket.io):**

```bash
cd backend
npm run dev
```

Server starts on `http://localhost:3001`

**Terminal 2 — Frontend (React + Vite):**

```bash
cd frontend
npm run dev
```

App opens on `http://localhost:5173`

---

## Routes

| URL                          | Page                    |
| ---------------------------- | ----------------------- |
| `http://localhost:5173/`     | Landing Page            |
| `http://localhost:5173/login` | Sign In                 |
| `http://localhost:5173/signup`| Sign Up                 |
| `http://localhost:5173/hospital` | Hospital Dashboard   |
| `http://localhost:5173/ambulance` | Ambulance Dashboard |

---

## Tech Stack

- **Frontend:** React 19, Vite 8, React Router 7, Recharts, Leaflet, Socket.io Client
- **Backend:** Express 5, Socket.io, Node.js
- **Database & Auth:** Supabase (PostgreSQL + Auth + Realtime)
- **Maps:** Leaflet + OpenStreetMap