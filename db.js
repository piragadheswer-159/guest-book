/**
 * Database Module for Guest Book & Visitor Log
 * Powered by MongoDB & Mongoose
 */

const mongoose = require('mongoose');
const crypto = require('node:crypto');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/guestbook';

// ---------------------------------------------------------------------------
// 1. SCHEMAS & MODELS
// ---------------------------------------------------------------------------
const visitorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  purpose: { type: String, required: true, trim: true },
  datetime: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
}, {
  toJSON: {
    transform: (doc, ret) => {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  salt: { type: String, required: true },
  role: { type: String, default: 'Staff' },
  created_at: { type: Date, default: Date.now }
}, {
  toJSON: {
    transform: (doc, ret) => {
      delete ret._id;
      delete ret.__v;
      delete ret.password_hash;
      delete ret.salt;
      return ret;
    }
  }
});

const Visitor = mongoose.model('Visitor', visitorSchema);
const User = mongoose.model('User', userSchema);

// ---------------------------------------------------------------------------
// 2. SEED DEMO DATA
// ---------------------------------------------------------------------------
const SEED_VISITORS = [
  {
    id: 'v-1',
    name: 'Pavithra V',
    phone: '9876543210',
    purpose: 'Project Discussion',
    datetime: '2025-09-20T10:15'
  },
  {
    id: 'v-2',
    name: 'Keerthana S',
    phone: '9123456789',
    purpose: 'Meeting',
    datetime: '2025-09-20T11:20'
  },
  {
    id: 'v-3',
    name: 'Arun Kumar',
    phone: '9988776655',
    purpose: 'Interview',
    datetime: '2025-09-19T14:45'
  },
  {
    id: 'v-4',
    name: 'Sneha R',
    phone: '9345678901',
    purpose: 'Workshop',
    datetime: '2025-09-19T11:30'
  },
  {
    id: 'v-5',
    name: 'Vignesh P',
    phone: '8765432109',
    purpose: 'Delivery',
    datetime: '2025-09-18T16:10'
  }
];

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const checkHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return checkHash === hash;
}

async function seedDefaultData() {
  try {
    const visitorCount = await Visitor.countDocuments();
    if (visitorCount === 0) {
      await Visitor.insertMany(SEED_VISITORS);
      console.log(`[MongoDB] Seeded ${SEED_VISITORS.length} default visitor logs into MongoDB collection.`);
    }

    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const { hash, salt } = hashPassword('admin123');
      await User.create({
        username: 'admin',
        email: 'admin@guestbook.io',
        password_hash: hash,
        salt: salt,
        role: 'Staff'
      });
      console.log('[MongoDB] Seeded default admin user into MongoDB.');
    }
  } catch (err) {
    console.error('[MongoDB] Error checking/seeding demo data:', err.message);
  }
}

// ---------------------------------------------------------------------------
let inMemoryVisitors = JSON.parse(JSON.stringify(SEED_VISITORS));

// ---------------------------------------------------------------------------
// 3. CONNECTION INITIALIZATION
// ---------------------------------------------------------------------------
async function connectDB() {
  if (process.env.VERCEL && !process.env.MONGODB_URI) {
    console.log('[Database] Running on Vercel with In-Memory Store (Add MONGODB_URI env for MongoDB Atlas)');
    return false;
  }
  try {
    console.log(`[MongoDB] Connecting to ${MONGODB_URI} ...`);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000
    });
    console.log('[MongoDB] Connected successfully to database!');
    await seedDefaultData();
    return true;
  } catch (err) {
    console.error('[MongoDB] Connection notice:', err.message, '- Using in-memory store fallback.');
    return false;
  }
}

// Auto connect
connectDB();

// ---------------------------------------------------------------------------
// 4. VISITOR OPERATIONS (With MongoDB & In-Memory Fallback)
// ---------------------------------------------------------------------------
async function getAllVisitors(filter = {}) {
  if (isConnected()) {
    try {
      const query = {};
      if (filter.purpose && filter.purpose !== 'ALL') {
        query.purpose = filter.purpose;
      }
      if (filter.search && filter.search.trim()) {
        const term = filter.search.trim();
        const regex = new RegExp(term, 'i');
        query.$or = [
          { name: regex },
          { phone: regex },
          { purpose: regex }
        ];
      }
      const visitors = await Visitor.find(query).sort({ datetime: -1, created_at: -1 }).lean();
      return visitors.map(v => {
        delete v._id;
        delete v.__v;
        return v;
      });
    } catch (err) {
      console.warn('MongoDB query notice, using in-memory store:', err.message);
    }
  }

  // Fallback to in-memory store
  let list = [...inMemoryVisitors];
  if (filter.purpose && filter.purpose !== 'ALL') {
    list = list.filter(v => v.purpose === filter.purpose);
  }
  if (filter.search && filter.search.trim()) {
    const term = filter.search.trim().toLowerCase();
    list = list.filter(v =>
      (v.name && v.name.toLowerCase().includes(term)) ||
      (v.phone && v.phone.includes(term)) ||
      (v.purpose && v.purpose.toLowerCase().includes(term))
    );
  }
  return list.sort((a, b) => (b.datetime || '').localeCompare(a.datetime || ''));
}

async function getVisitorById(id) {
  if (isConnected()) {
    try {
      const visitor = await Visitor.findOne({ id }).lean();
      if (visitor) {
        delete visitor._id;
        delete visitor.__v;
        return visitor;
      }
    } catch (err) {}
  }
  return inMemoryVisitors.find(v => v.id === id) || null;
}

async function createVisitor({ id, name, phone, purpose, datetime }) {
  const visitorId = id || 'v-' + Date.now();
  const newRecord = {
    id: visitorId,
    name,
    phone,
    purpose,
    datetime,
    created_at: new Date()
  };

  if (isConnected()) {
    try {
      const newVisitor = new Visitor(newRecord);
      await newVisitor.save();
      return getVisitorById(visitorId);
    } catch (err) {
      console.warn('MongoDB insert notice, saving in-memory:', err.message);
    }
  }

  inMemoryVisitors.unshift(newRecord);
  return newRecord;
}

async function updateVisitor(id, { name, phone, purpose, datetime }) {
  if (isConnected()) {
    try {
      const updated = await Visitor.findOneAndUpdate(
        { id },
        { name, phone, purpose, datetime },
        { new: true }
      ).lean();
      if (updated) {
        delete updated._id;
        delete updated.__v;
        return updated;
      }
    } catch (err) {}
  }

  const idx = inMemoryVisitors.findIndex(v => v.id === id);
  if (idx !== -1) {
    inMemoryVisitors[idx] = { ...inMemoryVisitors[idx], name, phone, purpose, datetime };
    return inMemoryVisitors[idx];
  }
  return null;
}

async function deleteVisitor(id) {
  if (isConnected()) {
    try {
      const res = await Visitor.deleteOne({ id });
      if (res.deletedCount > 0) return true;
    } catch (err) {}
  }

  const prevLen = inMemoryVisitors.length;
  inMemoryVisitors = inMemoryVisitors.filter(v => v.id !== id);
  return inMemoryVisitors.length < prevLen;
}

async function resetVisitors() {
  if (isConnected()) {
    try {
      await Visitor.deleteMany({});
      await Visitor.insertMany(SEED_VISITORS);
    } catch (err) {}
  }
  inMemoryVisitors = JSON.parse(JSON.stringify(SEED_VISITORS));
  return getAllVisitors();
}

async function getStats() {
  if (isConnected()) {
    try {
      const total = await Visitor.countDocuments();
      const todayStr = new Date().toISOString().slice(0, 10);
      const today = await Visitor.countDocuments({
        $or: [
          { datetime: { $regex: '^' + todayStr } },
          { datetime: { $regex: '^2025-09-20' } }
        ]
      });
      const distinctPurposes = (await Visitor.distinct('purpose')).length;
      return {
        totalVisitors: total,
        todayVisitors: today,
        distinctPurposes: distinctPurposes
      };
    } catch (err) {}
  }

  const total = inMemoryVisitors.length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const today = inMemoryVisitors.filter(v => (v.datetime || '').startsWith(todayStr) || (v.datetime || '').startsWith('2025-09-20')).length;
  const purposes = new Set(inMemoryVisitors.map(v => v.purpose));
  return {
    totalVisitors: total,
    todayVisitors: today,
    distinctPurposes: purposes.size
  };
}

// ---------------------------------------------------------------------------
// 5. AUTH OPERATIONS
// ---------------------------------------------------------------------------
async function authenticateUser(identifier, password) {
  const cleanId = (identifier || '').trim().toLowerCase();

  if (isConnected()) {
    try {
      const user = await User.findOne({
        $or: [{ username: cleanId }, { email: cleanId }]
      });
      if (user) {
        const isValid = verifyPassword(password, user.password_hash, user.salt);
        if (isValid) {
          return {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role
          };
        }
      }
    } catch (err) {}
  }

  // Demo user fallback (admin / admin123)
  if ((cleanId === 'admin' || cleanId === 'admin@guestbook.io') && password === 'admin123') {
    return {
      id: 'admin-fallback-1',
      username: 'admin',
      email: 'admin@guestbook.io',
      role: 'Staff'
    };
  }

  return null;
}

function isConnected() {
  return mongoose.connection.readyState === 1;
}

function getDatabaseInfo() {
  const connected = isConnected();
  return {
    type: connected ? 'MongoDB' : 'In-Memory (Live)',
    status: connected ? 'connected' : 'in-memory-active',
    databaseName: connected ? (mongoose.connection.name || 'guestbook') : 'guestbook-demo',
    host: connected ? (mongoose.connection.host || '127.0.0.1') : 'cloud-instance',
    port: connected ? (mongoose.connection.port || 27017) : 0
  };
}

module.exports = {
  mongoose,
  connectDB,
  isConnected,
  getDatabaseInfo,
  getAllVisitors,
  getVisitorById,
  createVisitor,
  updateVisitor,
  deleteVisitor,
  resetVisitors,
  getStats,
  authenticateUser,
  SEED_VISITORS
};
