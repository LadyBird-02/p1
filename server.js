// server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const User = require('./models/User');
const Complaint = require('./models/Complaint');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== HARD-CODED CONFIG - REPLACE MONGO_URI =====
// Put your MongoDB Atlas connection string here (replace <user>, <pass>, <cluster> etc.)
const MONGO_URI = "mongodb+srv://123ad0061_db_user:Shivam123@cluster-10.pmpkblo.mongodb.net/?appName=Cluster-10";
// A short secret used for JWT; change for your project
const JWT_SECRET = "lab_secret_key_12345";
const PORT = 3000;
// =================================================

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB Atlas');

    // Create a default admin user if none exists (convenience for labs)
    const adminExists = await User.findOne({ role: 'admin' }).lean();
    if (!adminExists) {
      const hash = await bcrypt.hash('admin123', 10);
      await User.create({
        name: 'Default Admin',
        email: 'admin@example.com',
        phone: '0000000000',
        password: hash,
        role: 'admin'
      });
      console.log('Default admin created: admin@example.com / admin123');
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message || err);
  });

// ===== Helpers =====
function generateToken(user) {
  return jwt.sign({ id: user._id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ error: 'Admin only' });
}

// ===== Routes =====

// Register (role: 'user' or 'admin' from frontend)
app.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      phone,
      password: hashed,
      role: role === 'admin' ? 'admin' : 'user'
    });
    await user.save();
    const token = generateToken(user);
    return res.json({ token, role: user.role, name: user.name });
  } catch (e) {
    console.error('Register error', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Login (single /login used by both roles)
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const token = generateToken(user);
    return res.json({ token, role: user.role, name: user.name });
  } catch (e) {
    console.error('Login error', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Who am I
app.get('/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password').lean();
  res.json(user);
});

// Submit complaint (any authenticated user)
app.post('/complaint', authMiddleware, async (req, res) => {
  try {
    const { title, category, priority, description } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'Missing title/description' });

    const complaint = new Complaint({
      userId: req.user.id,
      userName: req.user.name,
      title,
      category,
      priority,
      description,
      status: 'Pending',
      updates: [{ status: 'Pending', date: new Date() }]
    });

    await complaint.save();
    return res.json({ message: 'Complaint submitted', complaint });
  } catch (e) {
    console.error('Submit complaint error', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get complaints (admin: all, user: only their complaints)
app.get('/complaints', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const all = await Complaint.find().sort({ createdAt: -1 }).lean();
      return res.json(all);
    } else {
      const mine = await Complaint.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
      return res.json(mine);
    }
  } catch (e) {
    console.error('Get complaints error', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update complaint status (admin only)
app.put('/complaint/:id/status', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Missing status' });
    const comp = await Complaint.findById(req.params.id);
    if (!comp) return res.status(404).json({ error: 'Complaint not found' });
    comp.status = status;
    comp.updates.push({ status, date: new Date() });
    await comp.save();
    return res.json({ message: 'Status updated', complaint: comp });
  } catch (e) {
    console.error('Update status error', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Serve index by default (public/index.html) - express.static covers this

app.listen(PORT, () => {
  console.log('Server running on port', PORT);
  console.log('Open http://localhost:' + PORT);
});