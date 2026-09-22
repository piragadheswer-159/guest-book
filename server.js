/**
 * Express Server for Guest Book & Visitor Log
 * Powered by MongoDB & Mongoose
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db.js');

const app = express();
const PORT = process.env.PORT || 5000;

// Simple in-memory session tokens store
const activeSessions = new Map();

// ---------------------------------------------------------------------------
// MIDDLEWARE
// ---------------------------------------------------------------------------
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging for API calls
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Serve frontend static files
app.use(express.static(__dirname));

// Simple auth token extraction middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const sessionUser = activeSessions.get(token);
    if (sessionUser) {
      req.user = sessionUser;
    }
  }
  next();
}

app.use(authMiddleware);

// ---------------------------------------------------------------------------
// REST API ENDPOINTS
// ---------------------------------------------------------------------------

// 1. Health check & Database Info
app.get('/api/health', async (req, res) => {
  try {
    const stats = await db.getStats();
    const dbInfo = db.getDatabaseInfo();
    res.json({
      status: 'ok',
      database: `${dbInfo.type} (${dbInfo.status})`,
      databaseType: dbInfo.type,
      databaseName: dbInfo.databaseName,
      host: dbInfo.host,
      port: dbInfo.port,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      stats
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 2. Aggregate Stats
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json({ success: true, ...stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. List Visitors (with search and purpose filters)
app.get('/api/visitors', async (req, res) => {
  try {
    const { search, purpose } = req.query;
    const visitors = await db.getAllVisitors({ search, purpose });
    res.json({
      success: true,
      count: visitors.length,
      data: visitors
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Get single visitor
app.get('/api/visitors/:id', async (req, res) => {
  try {
    const visitor = await db.getVisitorById(req.params.id);
    if (!visitor) {
      return res.status(404).json({ success: false, error: 'Visitor not found' });
    }
    res.json({ success: true, data: visitor });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Create new visitor
app.post('/api/visitors', async (req, res) => {
  try {
    const { name, phone, purpose, datetime } = req.body;

    // Validation
    const trimmedName = (name || '').trim();
    const trimmedPhone = (phone || '').trim();
    const cleanPhone = trimmedPhone.replace(/[^0-9]/g, '');

    if (!trimmedName || trimmedName.length < 2) {
      return res.status(400).json({ success: false, error: 'Full name must be at least 2 characters.' });
    }

    if (!trimmedPhone || cleanPhone.length < 7) {
      return res.status(400).json({ success: false, error: 'Valid phone number is required (min 7 digits).' });
    }

    if (!purpose) {
      return res.status(400).json({ success: false, error: 'Purpose of visit is required.' });
    }

    if (!datetime) {
      return res.status(400).json({ success: false, error: 'Visit date & time is required.' });
    }

    const newVisitor = await db.createVisitor({
      id: 'v-' + Date.now(),
      name: trimmedName,
      phone: trimmedPhone,
      purpose,
      datetime
    });

    res.status(201).json({
      success: true,
      message: 'Visitor checked in successfully',
      data: newVisitor
    });
  } catch (err) {
    console.error('Error creating visitor:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Update existing visitor
app.put('/api/visitors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, purpose, datetime } = req.body;

    const trimmedName = (name || '').trim();
    const trimmedPhone = (phone || '').trim();
    const cleanPhone = trimmedPhone.replace(/[^0-9]/g, '');

    if (!trimmedName || trimmedName.length < 2) {
      return res.status(400).json({ success: false, error: 'Full name must be at least 2 characters.' });
    }

    if (!trimmedPhone || cleanPhone.length < 7) {
      return res.status(400).json({ success: false, error: 'Valid phone number is required.' });
    }

    if (!purpose || !datetime) {
      return res.status(400).json({ success: false, error: 'Purpose and datetime are required.' });
    }

    const updated = await db.updateVisitor(id, {
      name: trimmedName,
      phone: trimmedPhone,
      purpose,
      datetime
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Visitor record not found.' });
    }

    res.json({
      success: true,
      message: 'Visitor record updated successfully',
      data: updated
    });
  } catch (err) {
    console.error('Error updating visitor:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Delete visitor
app.delete('/api/visitors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.getVisitorById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Visitor record not found.' });
    }

    const deleted = await db.deleteVisitor(id);
    if (!deleted) {
      return res.status(500).json({ success: false, error: 'Failed to delete record.' });
    }

    res.json({
      success: true,
      message: `${existing.name}'s record has been removed.`,
      deletedId: id
    });
  } catch (err) {
    console.error('Error deleting visitor:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Reset visitor records to demo seeds
app.post('/api/visitors/reset', async (req, res) => {
  try {
    const visitors = await db.resetVisitors();
    res.json({
      success: true,
      message: 'Visitor records reset to demonstration data.',
      data: visitors
    });
  } catch (err) {
    console.error('Error resetting visitors:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Auth: Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const identifier = req.body.identifier || req.body.email || req.body.username;
    const password = req.body.password;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Identifier and password are required.' });
    }

    const user = await db.authenticateUser(identifier, password);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials. Demo: admin / admin123' });
    }

    // Generate token
    const token = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    activeSessions.set(token, user);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Auth: Current User
app.get('/api/auth/me', (req, res) => {
  if (req.user) {
    res.json({ success: true, authenticated: true, user: req.user });
  } else {
    res.status(401).json({ success: false, authenticated: false, error: 'Not authenticated' });
  }
});

// 11. Auth: Logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    activeSessions.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// Catch-all route to serve index.html for frontend client routing if needed
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ---------------------------------------------------------------------------
// START SERVER
// ---------------------------------------------------------------------------
let server = null;
if (!process.env.VERCEL) {
  server = app.listen(PORT, () => {
    console.log('====================================================');
    console.log(` Guest Book Backend Server Running!`);
    console.log(` Local URL:   http://localhost:${PORT}`);
    console.log(` REST API:    http://localhost:${PORT}/api/health`);
    console.log(` Database:    MongoDB (${process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/guestbook'})`);
    console.log('====================================================');
  });
}

module.exports = app;

