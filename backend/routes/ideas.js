// routes/ideas.js
// Everything related to ideas: posting, listing/searching/filtering,
// voting, and commenting.

const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// A short, non-explicit list is enough for a demo profanity filter.
// (Deliberately kept mild - swap for a proper moderation library/API
// for anything beyond a resume project.)
const BLOCKED_WORDS = ['stupid', 'idiot', 'dumb', 'hate', 'useless', 'trash', 'garbage'];

// Word-boundary regexes, built once. Using \b instead of a plain
// substring check matters: a naive text.includes('dumb') also matches
// "dumbbell", includes('garbage') also matches "garbageman", and so on.
// \b only matches at the edges of whole words.
const BLOCKED_WORD_PATTERNS = BLOCKED_WORDS.map(
  word => new RegExp(`\\b${word}\\b`, 'i')
);

function containsBlockedWord(text) {
  return BLOCKED_WORD_PATTERNS.some(pattern => pattern.test(text));
}

// ---------------------------------------------------------------------
// GET /api/ideas  - list ideas, with optional search + filters + sorting
// Query params: q (search text), language, difficulty, sort=top|new
// ---------------------------------------------------------------------
router.get('/', optionalAuth, (req, res) => {
  const { q, language, difficulty, sort } = req.query;

  let sql = `
    SELECT
      ideas.id, ideas.user_id, ideas.title, ideas.description, ideas.language,
      ideas.difficulty, ideas.is_anonymous, ideas.created_at,
      CASE WHEN ideas.is_anonymous = 1 THEN 'Anonymous' ELSE users.username END AS author,
      (SELECT COUNT(*) FROM votes WHERE votes.idea_id = ideas.id) AS vote_count,
      (SELECT COUNT(*) FROM comments WHERE comments.idea_id = ideas.id) AS comment_count
    FROM ideas
    LEFT JOIN users ON ideas.user_id = users.id
    WHERE 1 = 1
  `;
  // NOTE: ideas.user_id is selected here only so this route can compute
  // "is_mine" below - it is stripped from every row before the response
  // is sent (see the .map() near the end of this handler), so an
  // anonymous post's real author is never exposed to anyone but the
  // author themselves. Returning the raw user_id to everyone would let
  // people correlate a user's anonymous posts with their real account
  // the moment that user ever posts anything non-anonymously.
  const params = [];

  if (q) {
    sql += ' AND (ideas.title LIKE ? OR ideas.description LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  if (language) {
    sql += ' AND ideas.language = ?';
    params.push(language);
  }
  if (difficulty) {
    sql += ' AND ideas.difficulty = ?';
    params.push(difficulty);
  }

  sql += sort === 'top'
    ? ' ORDER BY vote_count DESC, ideas.created_at DESC'
    : ' ORDER BY ideas.created_at DESC';

  const ideas = db.prepare(sql).all(...params);

  // Let the frontend know if the current user has already voted on each idea,
  // and which ideas are their own (including their own anonymous ones) -
  // then strip the internal user_id so it's never sent to the client.
  const votedSet = req.user
    ? new Set(db.prepare('SELECT idea_id FROM votes WHERE user_id = ?').all(req.user.id).map(r => r.idea_id))
    : new Set();

  const sanitized = ideas.map(idea => {
    const { user_id, ...rest } = idea;
    return {
      ...rest,
      voted_by_me: votedSet.has(idea.id),
      is_mine: !!(req.user && user_id === req.user.id)
    };
  });

  res.json(sanitized);
});

// ---------------------------------------------------------------------
// POST /api/ideas  - create a new idea (works anonymously or logged in)
// ---------------------------------------------------------------------
router.post('/', optionalAuth, (req, res) => {
  const { title, description, language, difficulty, postAnonymously } = req.body;

  const TITLE_MAX = 150;
  const DESCRIPTION_MAX = 3000;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required.' });
  }
  if (title.length > TITLE_MAX) {
    return res.status(400).json({ error: `Title must be ${TITLE_MAX} characters or fewer.` });
  }
  if (description.length > DESCRIPTION_MAX) {
    return res.status(400).json({ error: `Description must be ${DESCRIPTION_MAX} characters or fewer.` });
  }
  if (containsBlockedWord(title) || containsBlockedWord(description)) {
    return res.status(400).json({ error: 'Please keep your idea respectful and constructive.' });
  }

  const isAnonymous = postAnonymously === false && req.user ? 0 : 1;
  const userId = req.user ? req.user.id : null;

  const result = db.prepare(`
    INSERT INTO ideas (user_id, title, description, language, difficulty, is_anonymous)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, title, description, language || null, difficulty || null, isAnonymous);

  const idea = db.prepare('SELECT * FROM ideas WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(idea);
});

// ---------------------------------------------------------------------
// GET /api/ideas/:id  - a single idea plus its comments
// ---------------------------------------------------------------------
router.get('/:id', (req, res) => {
  const idea = db.prepare(`
    SELECT ideas.*,
      CASE WHEN ideas.is_anonymous = 1 THEN 'Anonymous' ELSE users.username END AS author,
      (SELECT COUNT(*) FROM votes WHERE votes.idea_id = ideas.id) AS vote_count
    FROM ideas LEFT JOIN users ON ideas.user_id = users.id
    WHERE ideas.id = ?
  `).get(req.params.id);

  if (!idea) return res.status(404).json({ error: 'Idea not found.' });

  const comments = db.prepare(`
    SELECT comments.id, comments.text, comments.created_at,
      COALESCE(users.username, 'Anonymous') AS author
    FROM comments LEFT JOIN users ON comments.user_id = users.id
    WHERE comments.idea_id = ?
    ORDER BY comments.created_at ASC
  `).all(req.params.id);

  res.json({ ...idea, comments });
});

// ---------------------------------------------------------------------
// POST /api/ideas/:id/vote  - toggle a vote (must be logged in)
// The UNIQUE(idea_id, user_id) constraint in the DB is what actually
// guarantees one vote per user - this route just handles the toggle.
// ---------------------------------------------------------------------
router.post('/:id/vote', requireAuth, (req, res) => {
  const ideaId = req.params.id;
  const idea = db.prepare('SELECT id FROM ideas WHERE id = ?').get(ideaId);
  if (!idea) return res.status(404).json({ error: 'Idea not found.' });

  const existingVote = db.prepare('SELECT id FROM votes WHERE idea_id = ? AND user_id = ?')
    .get(ideaId, req.user.id);

  if (existingVote) {
    db.prepare('DELETE FROM votes WHERE id = ?').run(existingVote.id);
  } else {
    db.prepare('INSERT INTO votes (idea_id, user_id) VALUES (?, ?)').run(ideaId, req.user.id);
  }

  const voteCount = db.prepare('SELECT COUNT(*) AS c FROM votes WHERE idea_id = ?').get(ideaId).c;
  res.json({ vote_count: voteCount, voted_by_me: !existingVote });
});

// ---------------------------------------------------------------------
// POST /api/ideas/:id/comment  - add a comment (works anonymously too)
// ---------------------------------------------------------------------
router.post('/:id/comment', optionalAuth, (req, res) => {
  const { text } = req.body;
  const COMMENT_MAX = 500;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Comment text is required.' });
  }
  if (text.length > COMMENT_MAX) {
    return res.status(400).json({ error: `Comments must be ${COMMENT_MAX} characters or fewer.` });
  }
  if (containsBlockedWord(text)) {
    return res.status(400).json({ error: 'Please keep comments respectful and constructive.' });
  }

  const idea = db.prepare('SELECT id FROM ideas WHERE id = ?').get(req.params.id);
  if (!idea) return res.status(404).json({ error: 'Idea not found.' });

  const userId = req.user ? req.user.id : null;
  const result = db.prepare('INSERT INTO comments (idea_id, user_id, text) VALUES (?, ?, ?)')
    .run(req.params.id, userId, text.trim());

  const comment = db.prepare(`
    SELECT comments.id, comments.text, comments.created_at,
      COALESCE(users.username, 'Anonymous') AS author
    FROM comments LEFT JOIN users ON comments.user_id = users.id
    WHERE comments.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(comment);
});

module.exports = router;
