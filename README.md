# Ball Knowledge Picks

A full-stack NBA pick'em web app. Users predict the winner of upcoming games, earn points for correct picks, follow their favourite teams, and compete with friends in groups with live leaderboards.

## Features

- **Pick'em:** pick a winner for any game before tip-off. You can change or remove a pick until the game starts.
- **Live game data:** games and results sync automatically from the [balldontlie](https://www.balldontlie.io/) API every hour.
- **Scoring and stats:** total score, global rank, accuracy, and charts on the Stats page.
- **Groups:** create or join groups, with leaderboards that update in real time over Socket.IO.
- **Teams and notifications:** follow teams and get notified about their games.
- **Admin panel:** manage data and trigger a manual sync (admin accounts only).
- **Exports:** download tables as CSV or PDF.

## Tech stack

| Layer    | Tech                                           |
| -------- | ---------------------------------------------- |
| Frontend | React, Vite, React Router, Chart.js / Recharts |
| Backend  | Node.js, Express, Socket.IO, JWT auth          |
| Database | PostgreSQL                                     |
| Data     | balldontlie NBA API                            |

## Project structure

```
BallKnowledgePicks/
├── client/      # React frontend (Vite)
├── server/      # Express API + Socket.IO
│   └── src/
│       └── routes/
└── database/    # schema.sql, sample_data.sql, views.sql
```

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [PostgreSQL](https://www.postgresql.org/) and pgAdmin
- A free API key from [balldontlie.io](https://www.balldontlie.io/)

## Setup

### 1. Install dependencies

```bash
cd server
npm install
cd ../client
npm install
```

### 2. Create the database

In pgAdmin, create an empty database called `sports_dashboard` (or any name, as long as it matches `PGDATABASE` in your `.env`).

### 3. Run the SQL files

With that database selected, open the Query Tool and run these **in order**:

1. `database/schema.sql`
2. `database/sample_data.sql`
3. `database/views.sql`

> ⚠️ `schema.sql` drops every table and `sample_data.sql` empties them, so running these again **resets all data**.

### 4. Configure environment variables

Copy `server/.env.example` to `server/.env` and fill it in:

| Variable                | What it is                                                            |
| ----------------------- | --------------------------------------------------------------------- |
| `PORT`                  | Backend port. **Keep this at `3000`**: the frontend proxy expects it. |
| `PGHOST` … `PGDATABASE` | Your local PostgreSQL connection details                              |
| `BASKETBALLAPI`         | Your balldontlie API key                                              |
| `JWT_SECRET`            | Any long random string (see the command in `.env.example`)            |

Never commit `server/.env`. It's already in `.gitignore`.

## Running the app

Run the backend and the frontend in two separate terminals:

```bash
# Terminal 1: backend (http://localhost:3000)
cd server
npm run dev
```

```bash
# Terminal 2: frontend (http://localhost:5173)
cd client
npm run dev
```

Then open **http://localhost:5173**.

> ⏳ **First startup is slow.** On launch, the server pulls the full NBA season from balldontlie. The free tier allows only 5 requests per minute, so this can take several minutes. Wait for `Seeded N games` in the server console before expecting games to show up.

## Accounts

- **Register** a new account from the sign-up page. This is the easiest way to start.
- **Sample users:** `sample_data.sql` adds 10 test users (e.g. `james.wilson@example.com`). They all share the password `password123`.
- **Admin access:** new accounts are regular users. To make one an admin, run this in pgAdmin:

  ```sql
  UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
  ```

  Then log out and back in to see the Admin tab.

## Authors

- Rayan Khalil
- Saayjon Ranjan
- Matthew Atu
- Noah Aguirre

Built for SOFE 3700U (Database Management Systems) at Ontario Tech University.
