// db.js
// Sets up the SQLite database and defines the schema.
//
// We use SQLite instead of MySQL/Postgres for this project because it needs
// zero setup (no separate database server to install/configure) - the whole
// database is a single file. The SQL itself (tables, keys, constraints,
// joins) is standard SQL, so everything you learn here transfers directly
// to MySQL/Postgres if you switch later. This is a very common real-world
// choice for small-to-medium apps.

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'ideaforge.db'));

// Enforce foreign key constraints (SQLite has this off by default)
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------
// SCHEMA
// ---------------------------------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS ideas (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER,              -- nullable: NULL means posted anonymously
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    language    TEXT,                 -- e.g. JavaScript, Python (used for filtering)
    difficulty  TEXT,                 -- e.g. Beginner, Intermediate, Advanced
    is_anonymous INTEGER DEFAULT 1,   -- 1 = show as "Anonymous", 0 = show username
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS votes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    idea_id    INTEGER NOT NULL,
    user_id    INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (idea_id, user_id)          -- <-- this is what stops double-voting
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    idea_id    INTEGER NOT NULL,
    user_id    INTEGER,               -- nullable for anonymous comments
    text       TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );
`);

// A couple of indexes for the search/filter feature on the dashboard.
// Without these, filtering gets slow once you have a lot of ideas -
// this is a genuine "why did you add this" talking point for interviews.
db.exec(`CREATE INDEX IF NOT EXISTS idx_ideas_language ON ideas(language);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_ideas_difficulty ON ideas(difficulty);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_votes_idea ON votes(idea_id);`);

module.exports = db;
