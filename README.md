## Setup

1. Install dependencies:
   ```
   cd server
   npm install
   cd ../client
   npm install
   ```
2. Copy `server/.env.example` to `server/.env` and fill in your database settings.
3. In pgAdmin, run `db/schema.sql`, then `db/sample_data.sql`, then `db/views.sql`.

## Running the app

- Backend: `cd server` → `npm run dev` (http://localhost:3000)
- Frontend: `cd client` → `npm run dev` (http://localhost:5173)