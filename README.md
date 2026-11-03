# KinoKadr

> **A full-stack cinema booking app built as a pet project.** Browse the movie lineup, pick a showtime, choose your seats, and save a booking for your next movie night.

KinoKadr is a responsive cinema website with a React frontend and an Express API. It includes a working booking flow and a Docker-based setup, while keeping the scope honest: bookings are demos, not paid tickets.

## What you can do

- Browse movies, ratings, genres, and showtimes for the next seven days.
- Search by movie title and filter by genre.
- View an interactive seat map with unavailable seats marked.
- Reserve up to eight seats and get a booking reference.
- Find saved bookings by email.
- Run the frontend and API together with Docker Compose.

## Tech stack

| Area | Technologies |
| --- | --- |
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Node.js, Express |
| Containers | Docker, Docker Compose, Nginx |
| CI/CD | GitHub Actions, Docker Hub |

## Run locally

**Requirements:** Node.js 20.19+ (or 22.12+) and npm.

1. Install dependencies:

   ```bash
   cd backend
   npm ci
   cd ../frontend
   npm ci
   ```

2. Start the API in one terminal:

   ```bash
   cd backend
   npm start
   ```

3. Start the frontend in a second terminal:

   ```bash
   cd frontend
   npm run dev
   ```

Open the Vite URL printed in the terminal. The development server proxies `/api` requests to `http://localhost:5000`.

## Run with Docker Compose

Build and start both services from the repository root:

```bash
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080). To stop the services, run `docker compose down`.

To pull the published Docker Hub images instead of building locally:

1. Copy `.env.example` to `.env` and set your Docker Hub username.
2. Sign in with `docker login`.
3. Run:

   ```bash
   docker compose pull
   docker compose up -d
   ```

The frontend is served by Nginx, which proxies `/api` to the backend container. Booking data persists in the `backend-data` Docker volume. Set `FRONTEND_PORT` in `.env` to change the host port (default `8080`).

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check API health |
| `GET` | `/api/movies?date=YYYY-MM-DD` | Get movies and showtimes for a date |
| `GET` | `/api/showtimes/:showtimeId/seats` | Get booked seats for a showtime |
| `POST` | `/api/bookings` | Create a booking |
| `GET` | `/api/bookings?email=name@example.com` | Find bookings by email |

## CI/CD

The GitHub Actions workflow runs on pull requests and pushes to `main`. It lints and builds the frontend, checks the backend, smoke-tests the API, validates Docker Compose, and builds both images. Successful pushes to `main` publish `latest` and commit-SHA tags to Docker Hub:

- `legendass/node-js-app-frontend`
- `legendass/node-js-app-backend`

To enable publishing in your own fork, add the `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` Actions secrets. Use a Docker Hub access token with write access, not your account password.

## Project structure

```text
backend/                 Express API and Dockerfile
frontend/                React application, Nginx config, and Dockerfile
.github/workflows/       CI/CD workflow
docker-compose.yml       Local and container orchestration
```

## Current limitations

This is a learning project and a functional demo, not a production ticketing service. It does not process payments or provide user accounts. Booking data is stored in a JSON file, and the movie catalog and showtimes are sample data. Poster images are loaded from TMDB's image CDN.
