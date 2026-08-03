import React, { useMemo } from 'react'
import { Train, TrainFront, CheckCircle2, Circle, XCircle } from 'lucide-react'
import type { AvailableSeat } from '../api/client'

interface SeatMapProps {
  seats: AvailableSeat[]
  selectedSeatId: number | null
  onSelect: (seat: AvailableSeat) => void
}

// Groups seats by coach name for the tab + grid layout.
const SeatMap: React.FC<SeatMapProps> = ({ seats, selectedSeatId, onSelect }) => {
  const [activeCoach, setActiveCoach] = React.useState<string | null>(null)

  const coachGroups = useMemo(() => {
    const groups: Record<string, AvailableSeat[]> = {}
    for (const seat of seats) {
      const name = seat.coach?.name ?? 'Unknown'
      if (!groups[name]) groups[name] = []
      groups[name].push(seat)
    }
    return groups
  }, [seats])

  const coachNames = Object.keys(coachGroups).sort()

  // Default to first coach tab.
  const current = activeCoach ?? coachNames[0] ?? null
  const currentSeats = current ? coachGroups[current] ?? [] : []

  if (coachNames.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon"><Train size={48} color="var(--color-text-muted)" /></div>
        <h3>No seats found</h3>
        <p>Try selecting a different route segment.</p>
      </div>
    )
  }

  const availableCount = currentSeats.filter(s => s.is_available).length

  return (
    <div className="fade-up">
      {/* Coach tabs */}
      <div className="seats-section-header">
        <div>
          <h2>Reserved Coaches</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Coach {current} — {availableCount} of {currentSeats.length} seats available
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
          <div className="coach-tabs">
            {coachNames.map(name => (
              <button
                key={name}
                className={`coach-tab${current === name ? ' active' : ''}`}
                onClick={() => setActiveCoach(name)}
              >
                Coach {name}
              </button>
            ))}
          </div>
          <div className="legend">
            <div className="legend-item">
              <div className="legend-dot available" />Available
            </div>
            <div className="legend-item">
              <div className="legend-dot selected" />Selected
            </div>
            <div className="legend-item">
              <div className="legend-dot booked" />Booked
            </div>
          </div>
        </div>
      </div>

      {/* Coach car visual */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {/* Coach header bar */}
        <div style={{
          padding: '14px 28px',
          background: 'rgba(245,166,35,0.05)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <TrainFront size={20} color="var(--color-primary)" />
          <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Coach {current}</span>
          <span className="badge badge-reserved">Reserved</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
            {currentSeats.length} seats total
          </span>
        </div>

        {/* Seat grid */}
        <div className="seat-map-grid">
          {currentSeats
            .sort((a, b) => parseInt(a.seat_number) - parseInt(b.seat_number))
            .map(seat => {
              const isSelected = seat.id === selectedSeatId
              const cls = seat.is_available
                ? isSelected ? 'seat-cell available selected' : 'seat-cell available'
                : 'seat-cell booked'

              return (
                <div
                  key={seat.id}
                  className={cls}
                  onClick={() => onSelect(seat)}
                  title={
                    seat.is_available
                      ? `Seat ${seat.seat_number} — LKR ${seat.fare.toLocaleString()}`
                      : `Seat ${seat.seat_number} — Booked (Click to Waitlist)`
                  }
                  role="button"
                  aria-label={`Seat ${seat.seat_number} ${seat.is_available ? 'available' : 'booked'}`}
                  aria-pressed={isSelected}
                >
                  <span className="seat-icon">
                    {seat.is_available ? (
                      isSelected ? <CheckCircle2 size={24} color="var(--color-primary)" /> : <Circle size={24} color="var(--color-text-muted)" />
                    ) : (
                      <XCircle size={24} color="var(--color-danger)" />
                    )}
                  </span>
                  <span>{seat.seat_number}</span>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}

export default SeatMap
