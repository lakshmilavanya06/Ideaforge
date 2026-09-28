# Setup Guide — Run IdeaForge Locally

Follow these steps in order. Each one tells you what it does and why, so you can actually explain the project afterward — not just run it.

## 1. Install Node.js

You need Node.js version 18 or later.

Check what you have:
```bash
node --version
```
If it's missing or too old, download it from https://nodejs.org (the LTS version).

## 2. Install backend dependencies

```bash
cd backend
npm install
```
This reads `package.json` and installs Express (the web server framework), `better-sqlite3` (the database driver), `bcryptjs` (password hashing), `jsonwebtoken` (login sessions), and `cors`.

## 3. (Optional) Set up environment variables

```bash
cp .env.example .env
```
Open `.env` and change `JWT_SECRET` to any random string. This is the "key" used to sign login sessions — for local testing the default works fine, but you should always change it before deploying anywhere public.

## 4. Start the server

```bash
npm start
```
You should see:
```
IdeaForge server running at http://localhost:3000
```

The first time you run this, a new file `backend/ideaforge.db` is created automatically — that's your entire SQL database, as a single file. The `db.js` file defines the tables and creates them if they don't exist yet.

## 5. Open the app

Go to **http://localhost:3000** in your browser. This one server serves both the frontend pages and the API — you don't need to run anything separately.

Try this flow to confirm everything works:
1. Go to **Sign Up**, create an account.
2. You'll be logged in automatically and taken to the Ideas page.
3. Post an idea (try both with and without checking "post anonymously" if that option is visible).
4. Open a second private/incognito browser window, sign up as a different user, and vote/comment on the idea you posted. Confirm the vote count updates.
5. Try voting twice as the same user — it should toggle your vote off, not double-count it.
6. Check the **Top Votes** page — it should show the real idea you posted, sorted by votes, not sample data.
7. Use the search box and the language/difficulty filters on the Ideas page and confirm they narrow the results.

## 6. Inspect the database directly (optional, but good for interview prep)

Install a free tool like **DB Browser for SQLite** (https://sqlitebrowser.org) and open `backend/ideaforge.db`. You can look at the actual rows in `users`, `ideas`, `votes`, and `comments` — this is worth doing once so you can speak concretely about what's actually stored where.

## Troubleshooting

- **"Cannot find module" errors** → you skipped `npm install`, or ran `npm start` from the wrong folder. Make sure you're inside `backend/`.
- **"Port 3000 already in use"** → either another program is using that port, or a previous server is still running. Stop it, or change `PORT` in `.env`.
- **Database seems stuck with old data** → delete `backend/ideaforge.db` and restart the server; a fresh empty database will be created.

Once this works locally and you're comfortable with it, move on to `DEPLOY_OCI.md` to put it on Oracle Cloud.
