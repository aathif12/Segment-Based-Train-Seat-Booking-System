# ── Build stage ──────────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy dependency files first (better layer caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build the server binary with optimisations
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server ./cmd/server

# Build the seed binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /seed ./seed

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM alpine:3.19

# Install CA certificates for HTTPS and timezone data
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY --from=builder /server .
COPY --from=builder /seed .

EXPOSE 8080

CMD ["./server"]
