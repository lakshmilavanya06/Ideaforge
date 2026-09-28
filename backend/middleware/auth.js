// middleware/auth.js
// Checks the JWT sent by the frontend (in the Authorization header) and
// attaches the logged-in user's info to req.user.
//
// "requireAuth" blocks the request if there's no valid token (used for
// routes that need a logged-in user, like voting).
//
// "optionalAuth" reads the token if present but doesn't block the request
// if it's missing (used for routes anonymous users can still access, like
// posting an idea anonymously).

const jwt = require('jsonwebtoken');

const DEFAULT_JWT_SECRET = 'dev-secret-change-this-in-production';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;

if (JWT_SECRET === DEFAULT_JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    // A publicly-known secret would let anyone forge a valid login token.
    // Refuse to start rather than silently run insecurely in production.
    console.error(
      '\nFATAL: JWT_SECRET is not set and NODE_ENV=production.\n' +
      'Refusing to start with the default secret, since anyone who reads\n' +
      'this source code could forge login tokens. Set a real JWT_SECRET\n' +
      'in your .env file (see .env.example) and restart.\n'
    );
    process.exit(1);
  } else {
    console.warn(
      '\nWARNING: Using the default JWT_SECRET. This is fine for local ' +
      'development, but you must set a real, random JWT_SECRET in .env ' +
      'before deploying this anywhere public (see .env.example).\n'
    );
  }
}

function getTokenFromHeader(req) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7);
}

function requireAuth(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) {
    return res.status(401).json({ error: 'Login required for this action.' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

function optionalAuth(req, res, next) {
  const token = getTokenFromHeader(req);
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      req.user = null;
    }
  }
  next();
}

module.exports = { requireAuth, optionalAuth, JWT_SECRET };
