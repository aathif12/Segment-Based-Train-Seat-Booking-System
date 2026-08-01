# LFS Railway — Segment-Based Seat Booking System

> Booking system for Sri Lanka's Colombo Fort–Badulla scenic railway line that lets a single reserved seat be independently booked by multiple passengers on non-overlapping legs of the same journey.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Core Design Decisions](#core-design-decisions)
- [API Reference](#api-reference)
- [Extra Credit Features](#extra-credit-features)
- [Challenges](#challenges)
- [Development Setup (Without Docker)](#development-setup-without-docker)

---

## Quick Start

**Prerequisites:** Docker & Docker Compose installed.

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/lfs-railway.git
cd lfs-railway

# 2. Create your environment file
cp .env.example .env
# Open .env and set a strong POSTGRES_PASSWORD

# 3. Start everything (database, backend, seeder, frontend)
docker-compose up --build

# 4. Open the app
#    Frontend:  http://localhost:4000
#    Backend:   http://localhost:8080/api
```

On the first boot the `seeder` service runs automatically and populates:
- **15 stations** from Colombo Fort to Badulla (real stops with approximate distances)
- **8 coaches** (3 reserved A/B/C with 40 seats each; 5 unreserved D–H)
- **120 bookable reserved seats** in total

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  React + Vite Frontend  (nginx :3000)            │
│  • Seat map visualization                        │
│  • Booking flow with conflict handling           │
│  • Admin dashboard                               │
└────────────────────┬────────────────────────────┘
                     │ HTTP /api/*
┌────────────────────▼────────────────────────────┐
│  Go + Gin Backend  (:8080)                       │
│  • Gin HTTP router                               │
│  • GORM ORM                                      │
│  • Booking service with SELECT FOR UPDATE        │
│  • Fare calculation service                      │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│  PostgreSQL 15                                   │
│  • Row-level locking (concurrency control)       │
│  • stations, coaches, seats, bookings, waitlist  │
└─────────────────────────────────────────────────┘
```

**Tech stack:**
| Layer | Technology | Reason |
|-------|-----------|--------|
| Backend | Go 1.22 + Gin | Fast, strongly typed, great concurrency model |
| ORM | GORM | Mature Go ORM; native transaction + locking API |
| Database | PostgreSQL 15 | Strong transactional guarantees, row-level locking |
| Frontend | React 18 + Vite | Best DX for SPA, fast HMR in development |
| Serving | nginx | Efficient static file serving + API proxy |
| Infra | Docker Compose | Single-command reproducible setup |

---

## Core Design Decisions

### 1. Segment Overlap Detection

The central question is: *given an existing set of bookings on a seat, is the seat available for a new `[start, end)` request?*

Two intervals `[S₁, E₁)` and `[S₂, E₂)` overlap if and only if:
```
MAX(S₁, S₂) < MIN(E₁, E₂)
```

Equivalently in SQL:
```sql
SELECT 1 FROM bookings
WHERE seat_id = $1
  AND status = 'CONFIRMED'
  AND start_station_order < $end_new   -- existing starts before new end
  AND end_station_order > $start_new   -- existing ends after new start
LIMIT 1;
```

**Why not use `<>` on station IDs?** Station IDs have no ordering semantics. Using the integer `order_in_route` column makes overlap checks a simple range comparison — no joins, no subqueries.

**Adjacent bookings** (e.g. Fort→Kandy then Kandy→Badulla) satisfy `MAX < MIN` as false (they are equal), so they are correctly allowed and is the key enabler of segment resale.

### 2. Concurrency Control: `SELECT FOR UPDATE`

**The problem:** Two users simultaneously request the same seat for the same segment. Both read "available", both try to insert — creating a duplicate booking (phantom read).

**Rejected alternatives:**
- **Application-level mutex (sync.Mutex):** Only works within a single process; breaks with multiple backend replicas.
- **Redis distributed lock:** Adds an infrastructure dependency for a problem the database already solves correctly.
- **SERIALIZABLE isolation:** Correct, but causes excessive transaction aborts and retry storms under load.

**Chosen approach: `SELECT ... FOR UPDATE`**

```go
tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&seat, seatID)
```

Inside a transaction, we acquire an exclusive row-level lock on the `seats` row. Any concurrent transaction attempting the same seat will block at this line until we commit or rollback. After acquiring the lock, we re-check for overlapping bookings — the check is now serialised, so exactly one winner emerges.

This is correct, efficient, and requires no extra infrastructure.

### 3. Database Schema — `order_in_route` as the Segment Key

Stations carry an integer `order_in_route` (0 = Fort, 14 = Badulla). Bookings store `start_station_order` and `end_station_order` — not foreign keys to stations — because:
- Overlap detection needs numeric comparison, not equality.
- It avoids joining to the stations table in the hot path (booking creation).
- `start_station_id` / `end_station_id` FKs are still stored for display purposes (station names).

### 4. Configurability

No coach or seat counts are hardcoded. They live in the seed script and are configurable there. The schema supports any number of coaches, seat counts per coach, and stations — you add to the seed and re-run; no code changes are needed.

### 5. Fare Logic

```
fare = max(MinimumFare, |distance_to - distance_from| × BaseRatePerKm)
```

- `distance_km` per station is seeded from real approximate cumulative distances from Colombo Fort.
- `BaseRatePerKm` (LKR 3.50) is a named constant in `services/fare.go` — one change updates all fares.
- The minimum fare (LKR 50) ensures very short segments are still economically viable.
- This directly addresses the problem statement: a Colombo Fort → Kandy passenger pays ~LKR 424 instead of the full ~LKR 1,022 to Badulla.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness probe |
| `GET` | `/api/stations` | All stations in route order |
| `GET` | `/api/seats/available?from_order=0&to_order=5` | Available reserved seats for segment |
| `POST` | `/api/bookings` | Create a booking (transactional, `FOR UPDATE`) |
| `GET` | `/api/bookings/:id` | Booking detail |
| `DELETE` | `/api/bookings/:id` | Cancel a confirmed booking |
| `POST` | `/api/bookings/waitlist` | Join waitlist for a booked segment |
| `GET` | `/api/admin/occupancy` | Coach occupancy stats |
| `GET` | `/api/admin/revenue` | Revenue by station pair |

**Booking request body:**
```json
{
  "seat_id": 1,
  "passenger_name": "Aathavan Kandeepan",
  "passenger_email": "aathavan@example.com",
  "start_station_id": 1,
  "end_station_id": 6
}
```

**Conflict response (409):**
```json
{
  "error": "This seat is already booked for an overlapping segment.",
  "code": "SEGMENT_CONFLICT"
}
```

---

## Extra Credit Features

### Seat Map Visualization
**Problem:** A plain list of seat numbers is hard to scan.  
**Solution:** An interactive grid view grouped by coach, with colour-coded availability (green = available, red = booked, gold = selected). Switching coach tabs lets passengers compare options quickly.

### Waitlist
**Problem:** When a segment is fully booked, passengers have no recourse.  
**Solution:** A `waitlist_entries` table queues passengers per seat per segment. When a booking is cancelled, a background Go goroutine checks for the earliest matching waitlist entry within the freed segment range and promotes it to a confirmed booking — all inside a database transaction to prevent races.

### Admin Dashboard
**Problem:** The department has no visibility into occupancy or revenue patterns.  
**Solution:** `/api/admin/occupancy` returns per-coach booking counts with occupancy percentages; `/api/admin/revenue` returns total revenue grouped by station pair, enabling the department to see which legs are most profitable.

### Booking Conflict UX
**Problem:** In a concurrent system, a seat can be taken between the user seeing "available" and completing the form.  
**Solution:** `SEGMENT_CONFLICT` errors from the API surface a clear toast message, automatically refresh the seat map, and close the modal — giving the user immediate visual feedback and a fresh view to choose an alternative seat.

---

## Challenges

1. **Correctly handling adjacent segments:** The overlap formula `MAX(S₁,S₂) < MIN(E₁,E₂)` uses strict inequality, so `[0,5)` and `[5,10)` correctly do *not* overlap. Getting this right was critical — an off-by-one here would either double-book or leave gaps.

2. **Seeder idempotency:** The seeder uses `ON CONFLICT DO UPDATE` (upsert) so re-running it doesn't create duplicate stations or seats. This makes the development loop clean.

3. **Go module path in Docker:** The multi-stage Docker build requires `go mod download` before copying source to maximise layer caching. Getting the module path (`github.com/lfs-railway/backend`) consistent across all files was a common early mistake to watch for.

---

## Development Setup (Without Docker)

**Prerequisites:** Go 1.22+, Node 22+, PostgreSQL 15+

```bash
# --- Backend ---
cd backend
cp ../.env.example .env          # set DATABASE_URL
go mod tidy
go run ./cmd/server              # starts on :8080

# In a separate terminal — seed data
go run ./seed

# --- Frontend ---
cd frontend
npm install
npm run dev                      # starts on :5173 (proxies /api → :8080)
```

**Run tests:**
```bash
cd backend
# Requires a running database with seeded data
go test ./internal/services/... -run TestConcurrentBooking -v
```
