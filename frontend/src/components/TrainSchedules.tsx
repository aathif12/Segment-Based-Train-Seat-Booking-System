import React, { useState } from 'react'
import { Train, Clock, Users, Zap, Moon, Sun, ChevronRight, CheckCircle2 } from 'lucide-react'

// ── Real Sri Lanka Railways Schedules — Colombo Fort → Badulla ────────────────
export interface TrainSchedule {
  id: string
  number: string
  name: string
  type: 'Express' | 'Night Mail' | 'Intercity'
  departureTime: string   // 24h "HH:MM"
  arrivalTime: string
  durationHours: number
  durationMinutes: number
  totalSeats: number
  availableSeats: number
  classes: string[]
  runsDays: string[]      // 'Daily' or specific days
  isOvernight: boolean
  highlightColor: string
}

const TRAIN_SCHEDULES: TrainSchedule[] = [
  {
    id: 'podi-menike',
    number: '1005',
    name: 'Podi Menike',
    type: 'Express',
    departureTime: '05:55',
    arrivalTime: '15:27',
    durationHours: 9,
    durationMinutes: 32,
    totalSeats: 320,
    availableSeats: 87,
    classes: ['1st Class', '2nd Class', '3rd Class'],
    runsDays: ['Daily'],
    isOvernight: false,
    highlightColor: '#f5a623',
  },
  {
    id: 'udarata-menike',
    number: '1015',
    name: 'Udarata Menike',
    type: 'Intercity',
    departureTime: '08:30',
    arrivalTime: '18:22',
    durationHours: 9,
    durationMinutes: 52,
    totalSeats: 290,
    availableSeats: 142,
    classes: ['1st Class AC', '2nd Class', '3rd Class'],
    runsDays: ['Daily'],
    isOvernight: false,
    highlightColor: '#00c9a7',
  },
  {
    id: 'night-mail',
    number: '1041',
    name: 'Night Mail',
    type: 'Night Mail',
    departureTime: '20:15',
    arrivalTime: '07:10',
    durationHours: 10,
    durationMinutes: 55,
    totalSeats: 260,
    availableSeats: 33,
    classes: ['Sleeperette 2nd', '2nd Class', '3rd Class'],
    runsDays: ['Daily'],
    isOvernight: true,
    highlightColor: '#7c3aed',
  },
]

function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':')
  const h = parseInt(hStr, 10)
  const m = mStr
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m} ${ampm}`
}

function getAvailabilityLevel(available: number, total: number) {
  const ratio = available / total
  if (ratio > 0.4) return { label: 'Available', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' }
  if (ratio > 0.1) return { label: 'Filling Fast', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
  return { label: 'Almost Full', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
}

interface TrainSchedulesProps {
  selectedTrainId: string | null
  onSelect: (train: TrainSchedule) => void
}

const TrainSchedules: React.FC<TrainSchedulesProps> = ({ selectedTrainId, onSelect }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <section className="train-schedules-section">
      <div className="container">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="schedules-header fade-up">
          <div className="schedules-route-badge">
            <Train size={16} />
            <span>Colombo Fort</span>
            <span className="route-arrow">→</span>
            <span>Badulla</span>
          </div>
          <h2 className="schedules-title">Select Your Train</h2>
          <p className="schedules-subtitle">
            Choose from {TRAIN_SCHEDULES.length} daily scheduled departures on the scenic hill-country line
          </p>
        </div>

        {/* ── Cards Grid ──────────────────────────────────────── */}
        <div className="schedules-grid">
          {TRAIN_SCHEDULES.map((train, idx) => {
            const avail = getAvailabilityLevel(train.availableSeats, train.totalSeats)
            const isSelected = selectedTrainId === train.id
            const isHovered = hoveredId === train.id

            return (
              <button
                key={train.id}
                id={`train-card-${train.id}`}
                className={`train-card fade-up ${isSelected ? 'train-card--selected' : ''}`}
                style={{
                  animationDelay: `${idx * 0.1}s`,
                  '--card-accent': train.highlightColor,
                } as React.CSSProperties}
                onClick={() => onSelect(train)}
                onMouseEnter={() => setHoveredId(train.id)}
                onMouseLeave={() => setHoveredId(null)}
                aria-pressed={isSelected}
              >
                {/* Selected tick */}
                {isSelected && (
                  <div className="train-card__selected-badge">
                    <CheckCircle2 size={18} />
                    Selected
                  </div>
                )}

                {/* ── Top Row: Train Name + Type badge ───────── */}
                <div className="train-card__header">
                  <div className="train-card__icon" style={{ background: `${train.highlightColor}18`, color: train.highlightColor }}>
                    {train.isOvernight ? <Moon size={20} /> : train.type === 'Intercity' ? <Zap size={20} /> : <Sun size={20} />}
                  </div>
                  <div className="train-card__name-block">
                    <span className="train-card__number">#{train.number}</span>
                    <h3 className="train-card__name">{train.name}</h3>
                  </div>
                  <span className="train-card__type-badge" style={{ color: train.highlightColor, background: `${train.highlightColor}18`, border: `1px solid ${train.highlightColor}30` }}>
                    {train.type}
                  </span>
                </div>

                {/* ── Time Block ─────────────────────────────── */}
                <div className="train-card__time-block">
                  <div className="train-card__time-col">
                    <span className="train-card__time">{formatTime12h(train.departureTime)}</span>
                    <span className="train-card__station">Colombo Fort</span>
                  </div>
                  <div className="train-card__journey-line">
                    <div className="train-card__dot" style={{ background: train.highlightColor }} />
                    <div className="train-card__line" style={{ background: `linear-gradient(90deg, ${train.highlightColor}60, ${train.highlightColor}20)` }} />
                    <div className="train-card__duration">
                      <Clock size={11} />
                      {train.durationHours}h {train.durationMinutes}m
                    </div>
                    <div className="train-card__line" style={{ background: `linear-gradient(90deg, ${train.highlightColor}20, ${train.highlightColor}60)` }} />
                    <div className="train-card__dot" style={{ background: train.highlightColor }} />
                  </div>
                  <div className="train-card__time-col train-card__time-col--right">
                    <span className="train-card__time">{formatTime12h(train.arrivalTime)}</span>
                    <span className="train-card__station">Badulla{train.isOvernight ? ' (+1)' : ''}</span>
                  </div>
                </div>

                {/* ── Classes strip ──────────────────────────── */}
                <div className="train-card__classes">
                  {train.classes.map(cls => (
                    <span key={cls} className="train-card__class-pill">{cls}</span>
                  ))}
                </div>

                {/* ── Footer: seats + availability + CTA ────── */}
                <div className="train-card__footer">
                  <div className="train-card__seats">
                    <div className="train-card__seats-count">
                      <Users size={14} style={{ color: avail.color }} />
                      <span style={{ color: avail.color, fontWeight: 700 }}>{train.availableSeats}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>/ {train.totalSeats} seats</span>
                    </div>
                    <span
                      className="train-card__availability"
                      style={{ color: avail.color, background: avail.bg }}
                    >
                      {avail.label}
                    </span>
                  </div>

                  {/* Seat bar */}
                  <div className="train-card__seat-bar">
                    <div
                      className="train-card__seat-bar-fill"
                      style={{
                        width: `${(train.availableSeats / train.totalSeats) * 100}%`,
                        background: avail.color,
                      }}
                    />
                  </div>

                  <div className="train-card__cta">
                    <span className="train-card__days">{train.runsDays.join(', ')}</span>
                    <span className="train-card__select-btn" style={{ color: train.highlightColor }}>
                      {isSelected ? 'Selected ✓' : 'Select Train'}
                      {!isSelected && <ChevronRight size={14} />}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export { TRAIN_SCHEDULES }
export default TrainSchedules
