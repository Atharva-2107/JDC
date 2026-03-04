import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import crashRoutes from './routes/crash.js';
import hospitalRoutes from './routes/hospitals.js';
import ambulanceRoutes from './routes/ambulances.js';
import authRoutes from './routes/auth.js';

dotenv.config();

// Debug: print what env vars dotenv loaded
console.log('\n📋 ENV Check:');
console.log('   SUPABASE_URL =', process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : '❌ NOT SET');
console.log('   SUPABASE_SERVICE_ROLE_KEY =', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set (' + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ' chars)' : '❌ NOT SET');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_URL.startsWith('http')) {
  console.error('\n❌ ERROR: SUPABASE_URL is not set or invalid in backend/.env');
  console.error('   Please add your Supabase project URL, e.g.:');
  console.error('   SUPABASE_URL=https://your-project-id.supabase.co\n');
  process.exit(1);
}

// Supabase server-side client (service role for admin access)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'] }));
app.use(express.json());

// Attach socket.io and supabase to req so routes can use them
app.use((req, _res, next) => {
  req.io = io;
  req.supabase = supabase;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/crash', crashRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/ambulances', ambulanceRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'CrashGuard API running', timestamp: new Date().toISOString() });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join_role', (role) => {
    socket.join(role);
    console.log(`Socket ${socket.id} joined room: ${role}`);
  });

  socket.on('ambulance_status_update', (data) => {
    io.to('hospital').emit('ambulance_update', data);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`\n🚨 CrashGuard Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready for real-time connections`);
  console.log(`🔗 Supabase connected\n`);
});
