import React, { useEffect, useState } from 'react'
import {
  Train, Clock, Users, Zap, Moon, Sun,
  ChevronRight, CheckCircle2, AlertCircle, Lock, AlertTriangle,
} from 'lucide-react'
import type { TrainSchedule } from '../api/client'

// ── Booking Cutoff Helpers ────────────────────────────────────────────────────

const TODAY = (): string => new Date().toLocaleDateString('en-CA') // "YYYY-MM-DD" in local tz

/**
 * How many minutes remain until the booking cutoff (departure − 30 min).
 * Returns:
 *   Infinity  → future date or today but plenty of time
 *   > 0       → minutes remaining before cutoff
 *   <= 0      → booking already closed
 */
function minutesToCutoff(departureTime: string, travelDate: string, now: Date): number {
  if (travelDate !== TODAY()) return Infinity

  const [hStr, mStr] = departureTime.split(':')
  const departure = new Date(now)
  departure.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0)

  const cutoffMs = departure.getTime() - 30 * 60 * 1000 // 30 min before departure
  return Math.floor((cutoffMs - now.getTime()) / 60000)
}

function getBookingStatus(departureTime: string, travelDate: string, now: Date) {
  const mins = minutesToCutoff(departureTime, travelDate, now)

  if (mins <= 0) {
    // Already past cutoff — check if train has fully departed
    const [hStr, mStr] = departureTime.split(':')
    if (travelDate === TODAY()) {
      const dep = new Date(now)
      dep.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0)
      const minsAfterDep = Math.floor((now.getTime() - dep.getTime()) / 60000)
      if (minsAfterDep >= 0) {
        return { closed: true, warn: false, label: 'Departed', sublabel: `${minsAfterDep}m ago` }
      }
    }
    return { closed: true, warn: false, label: 'Booking Closed', sublabel: 'Cutoff passed' }
  }

  if (mins <= 60) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    const timeStr = h > 0 ? `${h}h ${m}m` : `${m} min`
    return { closed: false, warn: true, label: 'Closes Soon', sublabel: `Closes in ${timeStr}` }
  }

  return { closed: false, warn: false, label: null, sublabel: null }
}

// ── Misc Helpers ──────────────────────────────────────────────────────────────

function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':')
  const h = parseInt(hStr, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${mStr} ${ampm}`
}

function getTrainIcon(schedule: TrainSchedule) {
  if (schedule.is_overnight) return <Moon size={20} />
  if (schedule.train_type === 'Intercity') return <Zap size={20} />
  return <Sun size={20} />
}

function getSeatAvailability(available: number, total: number) {
  const ratio = total > 0 ? available / total : 0
  if (ratio > 0.4) return { label: 'Available',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)' }
  if (ratio > 0.1) return { label: 'Filling Fast', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
  return             { label: 'Almost Full',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TrainSchedulesProps {
  schedules: TrainSchedule[]
  loading: boolean
  error: string | null
  selectedId: number | null
  travelDate: string
  onSelect: (schedule: TrainSchedule) => void
}

const TrainSchedules: React.FC<TrainSchedulesProps> = ({
  schedules, loading, error, selectedId, travelDate, onSelect,
}) => {
  // Live clock — ticks every 30 s so cutoff badges stay accurate
  const [now, setNow] = useState<Date>(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  if (loading) {
    return (
      <div className="schedules-state">
        <div className="spinner spinner-lg" />
        <p>Loading train schedules…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="schedules-state schedules-state--error">
        <AlertCircle size={32} />
        <p>{error}</p>
      </div>
    )
  }

  if (schedules.length === 0) {
    return (
      <div className="schedules-state">
        <Train size={32} />
        <p>No trains available for this date.</p>
      </div>
    )
  }

  const isToday = travelDate === TODAY()

  return (
    <>
      {/* Live-clock notice when viewing today */}
      {isToday && (
        <div className="booking-cutoff-notice fade-up">
          <Clock size={14} />
          <span>
            Booking closes <strong>30 minutes before departure</strong>.
          </span>
        </div>
      )}

      <div className="schedules-grid">
        {schedules.map((s, idx) => {
          const avail = getSeatAvailability(s.available_seats, s.total_seats)
          const booking = getBookingStatus(s.departure_time, travelDate, now)
          const isSelected = selectedId === s.id
          const classList = s.classes.split(',').map(c => c.trim()).filter(Boolean)

          return (
            <button
              key={s.id}
              id={`train-card-${s.id}`}
              className={[
                'train-card fade-up',
                isSelected ? 'train-card--selected' : '',
                booking.closed ? 'train-card--closed' : '',
                booking.warn   ? 'train-card--warn'   : '',
              ].join(' ')}
              style={{
                animationDelay: `${idx * 0.08}s`,
                '--card-accent': booking.closed ? '#4a5568' : s.accent_color,
              } as React.CSSProperties}
              onClick={() => !booking.closed && onSelect(s)}
              disabled={booking.closed}
              aria-pressed={isSelected}
              aria-disabled={booking.closed}
            >
              {/* ── Status overlay badges ──────────────────────── */}
              {booking.closed && (
                <div className="train-card__status-overlay train-card__status-overlay--closed">
                  <Lock size={14} />
                  <span>{booking.label}</span>
                  {booking.sublabel && <span className="train-card__status-sub">{booking.sublabel}</span>}
                </div>
              )}

              {!booking.closed && booking.warn && (
                <div className="train-card__status-overlay train-card__status-overlay--warn">
                  <AlertTriangle size={13} />
                  <span>{booking.sublabel}</span>
                </div>
              )}

              {/* The selected badge was removed from here because it overlapped with the warning badge and is redundant (shown in footer). */}

              {/* ── Header ───────────────────────────────────────── */}
              <div className="train-card__header">
                <div
                  className="train-card__icon"
                  style={{
                    background: booking.closed ? 'rgba(255,255,255,0.04)' : `${s.accent_color}18`,
                    color:      booking.closed ? 'var(--color-text-faint)' : s.accent_color,
                  }}
                >
                  {getTrainIcon(s)}
                </div>
                <div className="train-card__name-block">
                  <span className="train-card__number">#{s.train_number}</span>
                  <h3 className="train-card__name">{s.train_name}</h3>
                </div>
                <span
                  className="train-card__type-badge"
                  style={booking.closed
                    ? { color: 'var(--color-text-faint)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }
                    : { color: s.accent_color, background: `${s.accent_color}18`, border: `1px solid ${s.accent_color}30` }
                  }
                >
                  {s.train_type}
                </span>
              </div>

              {/* ── Time Row ─────────────────────────────────────── */}
              <div className="train-card__time-block">
                <div className="train-card__time-col">
                  <span className="train-card__time">{formatTime12h(s.departure_time)}</span>
                  <span className="train-card__station">Colombo Fort</span>
                </div>
                <div className="train-card__journey-line">
                  <div className="train-card__dot" style={{ background: booking.closed ? 'var(--color-text-faint)' : s.accent_color }} />
                  <div className="train-card__line" style={{ background: booking.closed ? 'rgba(255,255,255,0.06)' : `linear-gradient(90deg,${s.accent_color}60,${s.accent_color}20)` }} />
                  <div className="train-card__duration">
                    <Clock size={11} />
                    {s.duration_hours}h {s.duration_mins}m
                  </div>
                  <div className="train-card__line" style={{ background: booking.closed ? 'rgba(255,255,255,0.06)' : `linear-gradient(90deg,${s.accent_color}20,${s.accent_color}60)` }} />
                  <div className="train-card__dot" style={{ background: booking.closed ? 'var(--color-text-faint)' : s.accent_color }} />
                </div>
                <div className="train-card__time-col train-card__time-col--right">
                  <span className="train-card__time">{formatTime12h(s.arrival_time)}</span>
                  <span className="train-card__station">Badulla{s.is_overnight ? ' (+1)' : ''}</span>
                </div>
              </div>

              {/* ── Class Pills ──────────────────────────────────── */}
              <div className="train-card__classes">
                {classList.map(cls => (
                  <span key={cls} className="train-card__class-pill">{cls}</span>
                ))}
              </div>

              {/* ── Footer ───────────────────────────────────────── */}
              <div className="train-card__footer">
                {booking.closed ? (
                  <div className="train-card__closed-msg">
                    <Lock size={13} />
                    Booking window closed — no new reservations accepted
                  </div>
                ) : (
                  <>
                    <div className="train-card__seats">
                      <div className="train-card__seats-count">
                        <Users size={14} style={{ color: avail.color }} />
                        <span style={{ color: avail.color, fontWeight: 700 }}>{s.available_seats}</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>/ {s.total_seats} seats</span>
                      </div>
                      <span
                        className="train-card__availability"
                        style={{ color: avail.color, background: avail.bg }}
                      >
                        {avail.label}
                      </span>
                    </div>

                    <div className="train-card__seat-bar">
                      <div
                        className="train-card__seat-bar-fill"
                        style={{
                          width: `${s.total_seats > 0 ? (s.available_seats / s.total_seats) * 100 : 0}%`,
                          background: avail.color,
                        }}
                      />
                    </div>

                    <div className="train-card__cta">
                      <span className="train-card__days">{s.runs_days}</span>
                      <span className="train-card__select-btn" style={{ color: s.accent_color }}>
                        {isSelected ? 'Selected ✓' : 'Select Train'}
                        {!isSelected && <ChevronRight size={14} />}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </>
  )
}

export default TrainSchedules
