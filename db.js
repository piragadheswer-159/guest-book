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
// 3. CONNECTION INITIALIZATION
// ---------------------------------------------------------------------------
async function connectDB() {
  try {
    console.log(`[MongoDB] Connecting to ${MONGODB_URI} ...`);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('[MongoDB] Connected successfully to database!');
    await seedDefaultData();
    return true;
  } catch (err) {
    console.error('[MongoDB] Connection error:', err.message);
    return false;
  }
}

// Auto connect
connectDB();

// ---------------------------------------------------------------------------
// 4. VISITOR OPERATIONS
// ---------------------------------------------------------------------------
async function getAllVisitors(filter = {}) {
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
}

async function getVisitorById(id) {
  const visitor = await Visitor.findOne({ id }).lean();
  if (!visitor) return null;
  delete visitor._id;
  delete visitor.__v;
  return visitor;
}

async function createVisitor({ id, name, phone, purpose, datetime }) {
  const visitorId = id || 'v-' + Date.now();
  const newVisitor = new Visitor({
    id: visitorId,
    name,
    phone,
    purpose,
    datetime
  });
  await newVisitor.save();
  return getVisitorById(visitorId);
}

async function updateVisitor(id, { name, phone, purpose, datetime }) {
  const updated = await Visitor.findOneAndUpdate(
    { id },
    { name, phone, purpose, datetime },
    { new: true }
  ).lean();

  if (!updated) return null;
  delete updated._id;
  delete updated.__v;
  return updated;
}

async function deleteVisitor(id) {
  const res = await Visitor.deleteOne({ id });
  return res.deletedCount > 0;
}

async function resetVisitors() {
  await Visitor.deleteMany({});
  await Visitor.insertMany(SEED_VISITORS);
  return getAllVisitors();
}

async function getStats() {
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
}

// ---------------------------------------------------------------------------
// 5. AUTH OPERATIONS
// ---------------------------------------------------------------------------
async function authenticateUser(identifier, password) {
  const cleanId = (identifier || '').trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ username: cleanId }, { email: cleanId }]
  });

  if (!user) {
    return null;
  }

  const isValid = verifyPassword(password, user.password_hash, user.salt);
  if (!isValid) {
    return null;
  }

  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role
  };
}

function isConnected() {
  return mongoose.connection.readyState === 1;
}

function getDatabaseInfo() {
  return {
    type: 'MongoDB',
    status: isConnected() ? 'connected' : 'connecting/disconnected',
    databaseName: mongoose.connection.name || 'guestbook',
    host: mongoose.connection.host || '127.0.0.1',
    port: mongoose.connection.port || 27017
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
