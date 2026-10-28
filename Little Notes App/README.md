# Little Notes

## About

Little Notes is a responsive organizer for notes and small tasks. It pairs a React interface with an Express REST API and MySQL persistence. [Open the live app](https://ite314-ite387-little-notes.pages.dev/) or check its [live service status and uptime history](https://stats.uptimerobot.com/L7Zn8g5oG4).

The public deployment currently has no accounts, so all visitors share the same notes. Use disposable content only and do not enter private information.

The API health check returned `status: ok` and `database: connected` on October 24, 2026.

## Stack

- React with Vite
- Node.js and Express REST API
- MySQL / MariaDB

## Features

Create, read, edit, search, filter, sort, pin, archive, restore, and move notes to Trash. Notes are stored in MySQL through the Express API. The interface includes category labels, light/dark themes, responsive layouts, and loading, empty, validation, and error states. Pinned notes must be unpinned before they can be moved to Trash.

## Run locally

### 1. Start MySQL and prepare the schema

Start MySQL from XAMPP. In phpMyAdmin or a MySQL client, run these scripts in order:

1. `database/schema/001-create-schema.sql`
2. `database/seed/001-seed-categories.sql`

### 2. Configure and start the API

From the `Little Notes App` folder, open a terminal:

```powershell
Copy-Item backend/.env.example backend/.env
Set-Location backend
npm install
npm run dev
```

Edit `backend/.env` with the local database credentials before starting the API. Keep this file private; it is excluded from the package and Git.

### 3. Start the React frontend

Open a second terminal from the `Little Notes App` folder:

```powershell
Set-Location frontend
npm install
npm run dev
```

Open the local address Vite prints in the terminal. The Vite configuration forwards `/api` requests to the Express API on port `3001`.

### 4. Check the database connection

Open `http://localhost:3001/api/health`. A successful response reports `status: ok` and `database: connected`.

## Build the frontend

```powershell
Set-Location frontend
npm run build
```

## Documentation and database scripts

- Full setup, architecture, data dictionary, API, SQL examples, security, and recovery notes: `documentation/project-documentation.md`
- SQL scripts: `database/`

The application expects an existing MySQL/MariaDB server and local `.env` credentials. No credentials or database export are included.
