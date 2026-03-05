# Docker Run Guide

## 1) Optional: create root `.env` overrides

Docker Compose reads environment variables from a root `.env` file. If you skip this, safe defaults from `docker-compose.yml` are used.

Example:

```env
POSTGRES_USER=todoapp
POSTGRES_PASSWORD=todoapp_password
POSTGRES_DB=todoapp
JWT_SECRET=replace-with-long-random-secret
SESSION_SECRET=replace-with-long-random-secret
CLIENT_URL=http://localhost:8080
```

## 2) Build and start everything

```bash
docker compose up --build -d
```

## 3) Initialize database schema (already handled automatically)

The server container runs `prisma db push` on startup, so tables are created automatically.

## 4) Open services

- App: http://localhost:8080
- API health: http://localhost:5000/api/health
- PostgreSQL: localhost:5433
- pgAdmin: http://localhost:5050

## 5) Useful commands

```bash
# View logs
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove DB volume (full reset)
docker compose down -v
```
