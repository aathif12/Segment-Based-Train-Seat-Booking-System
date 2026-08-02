import React, { useEffect, useState } from 'react'
import { Train, Search, MapPin, Ruler, Coins, CheckCircle2 } from 'lucide-react'
import { fetchStations, fetchAvailableSeats } from '../api/client'
import type { Station, AvailableSeat } from '../api/client'
import SeatMap from '../components/SeatMap'
import BookingModal from '../components/BookingModal'
import TrainSchedules, { TRAIN_SCHEDULES } from '../components/TrainSchedules'
import type { TrainSchedule } from '../components/TrainSchedules'
import type { ToastType } from '../components/Toast'

interface HomePageProps {
  addToast: (msg: string, type?: ToastType) => void
}

const HomePage: React.FC<HomePageProps> = ({ addToast }) => {
  const [stations, setStations] = useState<Station[]>([])
  const [fromId, setFromId] = useState<string>('')
  const [toId, setToId] = useState<string>('')
  const [travelDate, setTravelDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [seats, setSeats] = useState<AvailableSeat[]>([])
  const [loadingStations, setLoadingStations] = useState(true)
  const [loadingSeats, setLoadingSeats] = useState(false)
  const [selectedSeat, setSelectedSeat] = useState<AvailableSeat | null>(null)
  const [searched, setSearched] = useState(false)
  const [selectedTrain, setSelectedTrain] = useState<TrainSchedule | null>(null)

  useEffect(() => {
    fetchStations()
      .then(s => {
        setStations(s)
        if (s.length >= 2) {
          setFromId(String(s[0].id))
          setToId(String(s[s.length - 1].id))
        }
      })
      .catch(() => addToast('Failed to load stations', 'error'))
      .finally(() => setLoadingStations(false))
  }, [])

  const fromStation = stations.find(s => s.id === Number(fromId))
  const toStation = stations.find(s => s.id === Number(toId))

  const handleTrainSelect = (train: TrainSchedule) => {
    setSelectedTrain(train)
    // Scroll smoothly to the booking section
    setTimeout(() => {
      document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleSearch = async () => {
    if (!fromStation || !toStation) return
    if (fromStation.order_in_route >= toStation.order_in_route) {
      addToast('Destination must be after origin on the route', 'error')
      return
    }

    setLoadingSeats(true)
    setSeats([])
    setSearched(true)
    setSelectedSeat(null)
    try {
      const data = await fetchAvailableSeats(fromStation.order_in_route, toStation.order_in_route, travelDate)
      setSeats(data)
    } catch {
      addToast('Failed to fetch seat availability', 'error')
    } finally {
      setLoadingSeats(false)
    }
  }

  const handleBookingSuccess = () => {
    if (fromStation && toStation) {
      fetchAvailableSeats(fromStation.order_in_route, toStation.order_in_route, travelDate)
        .then(setSeats)
    }
  }

  return (
    <main>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="container">
          <div className="hero-eyebrow fade-in" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <Train size={18} /> Colombo Fort — Badulla Scenic Line
          </div>
          <h1 className="hero-title fade-up">
            Book Your Seat,<br />Pay for Your Journey
          </h1>
          <p className="hero-subtitle fade-up" style={{ animationDelay: '0.1s' }}>
            Segment-based reserved seating — one physical seat, multiple passengers,
            each paying only for the distance they actually travel.
          </p>
        </div>
      </section>

      {/* ── Train Schedule Selector ────────────────────────────────── */}
      <TrainSchedules
        selectedTrainId={selectedTrain?.id ?? null}
        onSelect={handleTrainSelect}
      />

      {/* ── Booking Section (seat search) ─────────────────────────── */}
      <section id="booking-section" className="booking-section">
        <div className="container">

          {/* Selected train banner */}
          {selectedTrain && (
            <div className="selected-train-banner fade-up" style={{ '--card-accent': selectedTrain.highlightColor } as React.CSSProperties}>
              <div className="selected-train-banner__left">
                <Train size={20} style={{ color: selectedTrain.highlightColor }} />
                <div>
                  <div className="selected-train-banner__label">Selected Train</div>
                  <div className="selected-train-banner__name">
                    #{selectedTrain.number} — {selectedTrain.name}
                    <span className="selected-train-banner__time">
                      {selectedTrain.departureTime} → {selectedTrain.arrivalTime}
                      {selectedTrain.isOvernight ? ' (+1)' : ''}
                    </span>
                  </div>
                </div>
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setSelectedTrain(null)}
              >
                Change
              </button>
            </div>
          )}

          {/* ── Search Card ───────────────────────────────────────── */}
          <div className="glass-card search-card fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="search-card__heading">
              <Search size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Select Segment &amp; Date</span>
            </div>

            {loadingStations ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                <div className="spinner spinner-lg" />
              </div>
            ) : (
              <div className="search-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="from-station">From</label>
                  <select
                    id="from-station"
                    className="form-select"
                    value={fromId}
                    onChange={e => setFromId(e.target.value)}
                  >
                    {stations.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="travel-date">Date</label>
                  <input
                    type="date"
                    id="travel-date"
                    className="form-input"
                    value={travelDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setTravelDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="to-station">To</label>
                  <select
                    id="to-station"
                    className="form-select"
                    value={toId}
                    onChange={e => setToId(e.target.value)}
                  >
                    {stations.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  id="btn-search-seats"
                  className="btn btn-primary btn-lg"
                  onClick={handleSearch}
                  disabled={loadingSeats || !fromId || !toId || !selectedTrain}
                  title={!selectedTrain ? 'Please select a train above first' : ''}
                >
                  {loadingSeats
                    ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Searching…</>
                    : <><Search size={18} style={{ marginRight: 8 }} /> Find Seats</>}
                </button>
              </div>
            )}

            {!selectedTrain && !loadingStations && (
              <div className="search-hint">
                <Train size={14} />
                <span>Please select a train above to continue</span>
              </div>
            )}

            {/* Segment info strip */}
            {fromStation && toStation && searched && (
              <div style={{
                marginTop: 20,
                padding: '12px 20px',
                background: 'rgba(245,166,35,0.05)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(245,166,35,0.12)',
                display: 'flex', gap: 24, flexWrap: 'wrap',
                fontSize: '0.88rem', color: 'var(--color-text-muted)'
              }}>
                <span><MapPin size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {fromStation.name} → {toStation.name} on {travelDate}</span>
                <span><Ruler size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> ~{Math.abs(toStation.distance_km - fromStation.distance_km)} km</span>
                <span><Coins size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> From LKR {(Math.abs(toStation.distance_km - fromStation.distance_km) * 3.5).toFixed(0)}</span>
                {seats.length > 0 && (
                  <span><CheckCircle2 size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', color: 'var(--color-success)' }} /> {seats.filter(s => s.is_available).length} seats available</span>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Seat Map Section ──────────────────────────────────────── */}
      {searched && (
        <section className="seats-section">
          <div className="container">
            {loadingSeats ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                <div className="spinner spinner-lg" />
              </div>
            ) : (
              <SeatMap
                seats={seats}
                selectedSeatId={selectedSeat?.id ?? null}
                onSelect={seat => setSelectedSeat(seat)}
              />
            )}
          </div>
        </section>
      )}

      {/* ── Booking Modal ─────────────────────────────────────────── */}
      {selectedSeat && fromStation && toStation && (
        <BookingModal
          seat={selectedSeat}
          fromStation={fromStation}
          toStation={toStation}
          travelDate={travelDate}
          onClose={() => setSelectedSeat(null)}
          onSuccess={handleBookingSuccess}
          addToast={addToast}
        />
      )}
    </main>
  )
}

export default HomePage
