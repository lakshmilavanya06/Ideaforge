# IdeaForge 🚀

A full-stack platform where anyone can anonymously post project ideas, get upvotes and comments from others, and find collaborators — built to connect people around ideas without the pressure of attaching your name to something unproven yet.

This started as a frontend-only prototype (HTML/CSS/JS with `localStorage`). It's now a real full-stack app: a SQL database with proper relationships, an authenticated REST API, and a deployment path to Oracle Cloud Infrastructure.

---

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (no framework — talks to the backend via `fetch`)
- **Backend:** Node.js + Express (REST API)
- **Database:** SQLite via `better-sqlite3` (see note below on why, and how to swap to MySQL/Postgres)
- **Auth:** JWT-based sessions, passwords hashed with bcrypt
- **Deployment target:** Oracle Cloud Infrastructure (OCI) free-tier compute instance

### Why SQLite, not MySQL/Postgres?

SQLite needs zero setup — the whole database is one file, no separate database server to install or configure. That makes this project easy for anyone (including an interviewer) to clone and run in two minutes. The SQL itself — schema design, joins, foreign keys, constraints — is standard SQL and transfers directly if you later point this at MySQL or Postgres; only `db.js`'s connection code would change, not the queries or your understanding of them.

---

## Project Structure

```
ideaforge/
├── backend/
│   ├── server.js          # Express app entry point
│   ├── db.js               # Database schema + connection
│   ├── routes/
│   │   ├── auth.js         # signup / login
│   │   └── ideas.js        # CRUD, voting, comments, search/filter
│   ├── middleware/
│   │   └── auth.js         # JWT verification
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── index.html            # Landing page
│   ├── idea.html             # Main app page (post/browse/vote/comment)
│   ├── login.html / signup.html
│   ├── topvotes.html         # Leaderboard
│   ├── css/
│   └── js/
├── SETUP_GUIDE.md
└── DEPLOY_OCI.md
```

---

## Database Schema

```
users      (id, username, email, password_hash, created_at)
ideas      (id, user_id → users.id, title, description, language, difficulty, is_anonymous, created_at)
votes      (id, idea_id → ideas.id, user_id → users.id, created_at)   UNIQUE(idea_id, user_id)
comments   (id, idea_id → ideas.id, user_id → users.id, text, created_at)
```
Important 
- `user_id` is nullable on `ideas` and `comments` — that's what makes true anonymous posting possible, not just a display trick.
- The `UNIQUE(idea_id, user_id)` constraint on `votes` is what actually prevents double-voting — it's enforced by the database itself, not just checked in application code.
- Indexes on `ideas.language` and `ideas.difficulty` speed up the filter feature on the dashboard.
- `GET /api/ideas` never sends the real `user_id` to the client, even for anonymous posts — it only sends a computed `is_mine` boolean (true only for the requester's own ideas, anonymous or not). Sending the raw `user_id` to everyone would let people correlate a user's "anonymous" posts with their real account the moment that user ever posted anything non-anonymously, defeating the whole point of the anonymity feature.

## API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | – | Create an account |
| POST | `/api/auth/login` | – | Log in, get a JWT |
| GET | `/api/ideas` | optional | List ideas (`?q=&language=&difficulty=&sort=top`) |
| POST | `/api/ideas` | optional | Post an idea (anonymous or attributed) |
| GET | `/api/ideas/:id` | – | Get one idea + its comments |
| POST | `/api/ideas/:id/vote` | required | Toggle your vote |
| POST | `/api/ideas/:id/comment` | optional | Add a comment |

---


