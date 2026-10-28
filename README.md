# Little Notes

A calm, responsive space for capturing notes and keeping small tasks organized. Little Notes combines a React interface with an Express API and a MySQL database, with a soft pastel visual style and paper-plane artwork.

## Live app

[Open Little Notes](https://ite314-ite387-little-notes.pages.dev/)

Check the [live service status and uptime history](https://stats.uptimerobot.com/L7Zn8g5oG4).

The deployed app is connected to its API and database. It currently has no accounts: all visitors share the same notes, so use disposable demo content and do not enter private information.

## Features

- Create, edit, search, sort, categorize, and pin notes.
- Archive notes, restore them, or move them to Trash.
- Choose a light or dark theme.
- Use the responsive interface on desktop and mobile screens.
- Store notes persistently in MySQL through a JSON REST API.

## Technology

- **Frontend:** React, Vite
- **API:** Node.js, Express
- **Database:** MySQL / MariaDB
- **Deployment:** Cloudflare Pages, Render, and Aiven MySQL

## Repository layout

- [`Little Notes App/`](Little%20Notes%20App/) — application source, database scripts, and documentation.
- [`Little Notes App/README.md`](Little%20Notes%20App/README.md) — local setup and run instructions.
- [`Little Notes App/documentation/project-documentation.md`](Little%20Notes%20App/documentation/project-documentation.md) — architecture, data model, API, and operational notes.

## Project status

The app is deployed and was confirmed working end to end on October 24, 2026. The API health check returned `status: ok` and `database: connected`.
