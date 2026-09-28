// server.js
// Entry point for the IdeaForge backend API.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const ideasRoutes = require('./routes/ideas');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/ideas', ideasRoutes);

// Health check - useful once this is deployed on OCI, to confirm the
// server is actually up.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'IdeaForge API is running.' });
});

// Serve the frontend (HTML/CSS/JS) directly from this same server, so the
// whole app is one thing to deploy and run.
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.listen(PORT, () => {
  console.log(`IdeaForge server running at http://localhost:${PORT}`);
});
