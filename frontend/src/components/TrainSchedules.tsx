import React from 'react'
import { Train, Clock, Users, Zap, Moon, Sun, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react'
import type { TrainSchedule } from '../api/client'

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function getAvailability(available: number, total: number) {
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
  onSelect: (schedule: TrainSchedule) => void
}

const TrainSchedules: React.FC<TrainSchedulesProps> = ({
  schedules, loading, error, selectedId, onSelect,
}) => {
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

  return (
    <div className="schedules-grid">
      {schedules.map((s, idx) => {
        const avail = getAvailability(s.available_seats, s.total_seats)
        const isSelected = selectedId === s.id
        const classList = s.classes.split(',').map(c => c.trim()).filter(Boolean)

        return (
          <button
            key={s.id}
            id={`train-card-${s.id}`}
            className={`train-card fade-up ${isSelected ? 'train-card--selected' : ''}`}
            style={{
              animationDelay: `${idx * 0.08}s`,
              '--card-accent': s.accent_color,
            } as React.CSSProperties}
            onClick={() => onSelect(s)}
            aria-pressed={isSelected}
          >
            {isSelected && (
              <div className="train-card__selected-badge">
                <CheckCircle2 size={14} /> Selected
              </div>
            )}

            {/* ── Header ───────────────────────────────────────── */}
            <div className="train-card__header">
              <div
                className="train-card__icon"
                style={{ background: `${s.accent_color}18`, color: s.accent_color }}
              >
                {getTrainIcon(s)}
              </div>
              <div className="train-card__name-block">
                <span className="train-card__number">#{s.train_number}</span>
                <h3 className="train-card__name">{s.train_name}</h3>
              </div>
              <span
                className="train-card__type-badge"
                style={{
                  color: s.accent_color,
                  background: `${s.accent_color}18`,
                  border: `1px solid ${s.accent_color}30`,
                }}
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
                <div className="train-card__dot" style={{ background: s.accent_color }} />
                <div className="train-card__line" style={{ background: `linear-gradient(90deg,${s.accent_color}60,${s.accent_color}20)` }} />
                <div className="train-card__duration">
                  <Clock size={11} />
                  {s.duration_hours}h {s.duration_mins}m
                </div>
                <div className="train-card__line" style={{ background: `linear-gradient(90deg,${s.accent_color}20,${s.accent_color}60)` }} />
                <div className="train-card__dot" style={{ background: s.accent_color }} />
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
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default TrainSchedules
