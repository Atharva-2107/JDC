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
import gpsLocationRoutes from './routes/gpsLocations.js';
import incidentRoutes from './routes/incident.js';
import emergencyRoutes from './routes/emergency.js';
import deviceRoutes from './routes/devices.js';

dotenv.config();

console.log('\n📋 ENV Check:');
console.log('   SUPABASE_URL =', process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 40) + '...' : '❌ NOT SET');
console.log('   SUPABASE_SERVICE_ROLE_KEY =', process.env.SUPABASE_SERVICE_ROLE_KEY ? `✅ Set (${process.env.SUPABASE_SERVICE_ROLE_KEY.length} chars)` : '❌ NOT SET');
console.log('   TWILIO_ACCOUNT_SID =', process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '⚠️  Not set (emergency SMS disabled)');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_URL.startsWith('http')) {
  console.error('\n❌ SUPABASE_URL is not set or invalid in backend/.env');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();
const httpServer = createServer(app);

// BUG FIX #4: Support dynamic CORS origins via ALLOWED_ORIGINS env var
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// ── Hardware devices (ESP32) don't send an Origin header.
//    Allow /api/crash and /api/health from any source so the ESP32
//    can always reach the backend regardless of network origin.
app.use('/api/crash', cors({ origin: '*' }));
app.use('/api/health', cors({ origin: '*' }));

// Attach io and supabase to every request
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
app.use('/api/gps-locations', gpsLocationRoutes);
app.use('/api/incident', incidentRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/devices', deviceRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'JDC CrashGuard API running',
    timestamp: new Date().toISOString(),
    twilio: !!process.env.TWILIO_ACCOUNT_SID,
  });
});

// Seed demo data (safe to run multiple times — uses upsert logic)
app.post('/api/seed', async (req, res) => {
  try {
    const demoCrashes = [
      { lat: 19.0760, lng: 72.8777, severity: 'high', device_id: 'vehicle_001', location: 'Andheri West, Mumbai', status: 'active', victims: 2, notes: 'Auto-detected by ESP32 crash sensor', is_demo: true },
      { lat: 19.0330, lng: 73.0297, severity: 'high', device_id: 'vehicle_002', location: 'Thane, Maharashtra', status: 'responding', victims: 1, notes: 'Auto-detected by ESP32 crash sensor', is_demo: true },
      { lat: 19.2183, lng: 72.9781, severity: 'medium', device_id: 'vehicle_003', location: 'Bhiwandi, Maharashtra', status: 'active', victims: 1, notes: 'Minor collision detected', is_demo: true },
      { lat: 19.1136, lng: 72.8697, severity: 'high', device_id: 'vehicle_001', location: 'Borivali, Mumbai', status: 'resolved', victims: 3, notes: 'Multi-vehicle collision', is_demo: true },
    ];

    const { data: crashData, error: crashErr } = await supabase.from('crashes').insert(demoCrashes).select();
    if (crashErr) console.error('Crash seed error:', crashErr);

    const demoGps = [
      { device_id: 'vehicle_001', latitude: 19.0760, longitude: 72.8777, accuracy: 1.2, satellites: 8 },
      { device_id: 'vehicle_002', latitude: 19.2183, longitude: 72.9781, accuracy: 0.9, satellites: 10 },
    ];
    const { error: gpsErr } = await supabase.from('gps_locations').insert(demoGps);
    if (gpsErr) console.warn('GPS seed warning (table may not exist):', gpsErr.message);

    // Emit to all connected clients
    (crashData || []).forEach(c => {
      io.emit('new_crash', {
        id: c.id, lat: c.lat, lng: c.lng, severity: c.severity,
        deviceId: c.device_id, location: c.location, timestamp: c.created_at,
        status: c.status, victims: c.victims, notes: c.notes, is_demo: true,
      });
    });

    console.log(`✅ Seeded ${crashData?.length || 0} demo crashes`);
    res.json({ success: true, message: `Seeded ${crashData?.length || 0} crashes`, crashes: crashData?.length || 0 });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ success: false, message: 'Seed failed' });
  }
});

// Socket.io connections
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('join_role', (role) => {
    socket.join(role);
    console.log(`   Socket ${socket.id} joined room: ${role}`);
  });

  socket.on('ambulance_status_update', (data) => {
    io.to('hospital').emit('ambulance_update', data);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  // Print all LAN IPs — use the correct one in your ESP32 BACKEND_CRASH_URL
  import('os').then(({ networkInterfaces }) => {
    const nets = networkInterfaces();
    const lanIps = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) lanIps.push(net.address);
      }
    }
    console.log(`\n🚨 JDC CrashGuard Server → http://localhost:${PORT}`);
    if (lanIps.length) {
      console.log(`\n📡 ── ESP32 / Phone LAN access ──`);
      lanIps.forEach(ip => console.log(`   http://${ip}:${PORT}/api/crash  ← use this IP in ESP32`));
    }
    console.log(`\n📡 Socket.io ready`);
    console.log(`🔗 Supabase connected`);
    console.log(`🌍 CORS allowed origins: ${allowedOrigins.join(', ')}\n`);
  });
});


