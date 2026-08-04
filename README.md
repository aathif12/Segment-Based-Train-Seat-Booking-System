# Ceylon Railways  Segment-Based Seat Booking System

> Booking system for Sri Lanka's Colombo Fort–Badulla scenic railway line that lets a single reserved seat be independently booked by multiple passengers on non-overlapping legs of the same journey.

---

## Running the Project

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
- **120 bookable reserved seats** in total.

*(Note: The number of coaches, seats, and stations are fully configurable via the seed script, enabling easy future expansions as requested by the department).*

---

## Core Design Decisions & Alternatives Considered

### 1. Segment Overlap Detection
**The Problem:** Given an existing set of bookings on a seat, how do we determine if the seat is available for a new `[start, end)` request?
**Decision:** Store station positions as an integer `order_in_route` (0 to 14) and use mathematical overlap checking. Two intervals `[S₁, E₁)` and `[S₂, E₂)` overlap if and only if `MAX(S₁, S₂) < MIN(E₁, E₂)`.
**Alternatives & Reasoning:** 
- *Why not use station IDs?* Station IDs have no inherent ordering semantics. Using an integer order makes overlap checks a simple numeric range comparison, avoiding joins or complex subqueries. 
- *Why strict inequality?* Adjacent bookings (e.g., Fort→Kandy then Kandy→Badulla) evaluate `MAX < MIN` as false, correctly permitting segment resale.

### 2. Concurrency Control: Handling Simultaneous Bookings
**The Problem:** Two users simultaneously request the same seat for the same segment. Both read "available", both try to insert  creating a duplicate booking (phantom read).
**Alternatives Considered:**
- *Application-level mutex (`sync.Mutex`):* Rejected because it only works within a single process, breaking if we deploy multiple backend replicas.
- *Redis distributed lock:* Rejected as it adds a new infrastructure dependency for a problem the database already solves natively.
- *SERIALIZABLE isolation level:* Rejected because it causes excessive transaction aborts and retry storms under load.
**Decision (`SELECT ... FOR UPDATE`):**
Inside a PostgreSQL transaction, we acquire an exclusive row-level lock on the `seats` row using `SELECT * FROM seats WHERE id = $1 FOR UPDATE`. Any concurrent transaction attempting the same seat blocks until the first completes. We re-check availability *after* locking to ensure exactly one winner emerges. This guarantees correctness without extra infrastructure.

### 3. Fare Logic
**Decision:** `fare = max(MinimumFare, |distance_to - distance_from| × BaseRatePerKm)`
This directly addresses the business problem: a passenger booking Colombo Fort → Kandy pays exactly for the distance traveled, not the full Badulla fare. The system dynamically allows the remaining Kandy → Badulla segment to be resold.

---

## Extra Credit Features

### 1. Natural Language "Smart Search" (In branch `feature/nlp-search`)
**Problem:** Users shouldn't have to navigate dropdown menus if they just want to type their request.
**Solution:** Implemented a "Magic Search" input that parses queries like "I need a train from Colombo to Badulla tomorrow". It uses a heuristic NLP parser (with the architecture set up to easily plug in an LLM API like Wit.ai or HuggingFace) to auto-fill the origin, destination, and date fields.

### 2. Multi-Language Support / i18n (In branch `feature/i18n`)
**Problem:** Sri Lanka has multiple official languages; a booking system should be accessible to everyone.
**Solution:** Integrated `react-i18next` to dynamically switch the UI between English, Tamil (தமிழ்), and Sinhala (සිංහල) without page reloads, making the platform genuinely usable in a real-world local setting.

### 3. Seat Map Visualization
**Problem:** A plain list of available seat numbers is hard to scan.  
**Solution:** Built an interactive grid view grouped by coach, with colour-coded availability (green = available, red = booked). It visually demonstrates the segment-booking concept and makes seat selection intuitive.

### 4. Waitlisting
**Problem:** When a segment is fully booked, passengers have no recourse.  
**Solution:** A `waitlist_entries` table queues passengers per seat per segment. A background Go routine processes cancellations and automatically promotes the earliest matching waitlist entry to a confirmed booking, all within a transaction.

### 5. Admin Dashboard
**Problem:** The department lacks visibility into occupancy or revenue patterns.  
**Solution:** Added `/api/admin/occupancy` and `/api/admin/revenue` endpoints to report per-coach booking percentages and revenue by station pair, demonstrating the financial impact of segment-based resale.

### 6. Booking Conflict UX
**Problem:** A seat can be taken while a user is filling out the booking form.
**Solution:** `SEGMENT_CONFLICT` API errors surface a clear toast message and automatically refresh the seat map, giving the user immediate visual feedback to choose another seat.

---

## Challenges

1. **Correctly handling adjacent segments:** The overlap formula `MAX(S₁,S₂) < MIN(E₁,E₂)` relies on strict inequality. Getting this right was critical  an off-by-one or using `<=` would either accidentally allow double-booking or incorrectly block adjacent (non-overlapping) bookings.
2. **Seeder idempotency in Docker:** The seeder runs automatically on boot. Using `ON CONFLICT DO UPDATE` (upsert) ensured re-running the docker containers doesn't create duplicate stations or seats, keeping the development loop robust.
3. **Go module pathing:** Setting up the multi-stage Docker build to maximize layer caching meant ensuring `go mod download` paths were completely consistent across all files.

---

## API Reference (Abridged)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/stations` | All stations in route order |
| `GET` | `/api/seats/available` | Available seats for segment |
| `POST` | `/api/bookings` | Create a booking (`FOR UPDATE`) |
| `POST` | `/api/bookings/waitlist` | Join waitlist for a booked segment |
