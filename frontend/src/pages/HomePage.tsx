import React, { useEffect, useState } from 'react'
import { Train, Search, MapPin, Ruler, Coins, CheckCircle2 } from 'lucide-react'
import { fetchStations, fetchAvailableSeats } from '../api/client'
import type { Station, AvailableSeat } from '../api/client'
import SeatMap from '../components/SeatMap'
import BookingModal from '../components/BookingModal'
import type { ToastType } from '../components/Toast'

interface HomePageProps {
  addToast: (msg: string, type?: ToastType) => void
}

const HomePage: React.FC<HomePageProps> = ({ addToast }) => {
  const [stations, setStations] = useState<Station[]>([])
  const [fromId, setFromId] = useState<string>('')
  const [toId, setToId] = useState<string>('')
  const [seats, setSeats] = useState<AvailableSeat[]>([])
  const [loadingStations, setLoadingStations] = useState(true)
  const [loadingSeats, setLoadingSeats] = useState(false)
  const [selectedSeat, setSelectedSeat] = useState<AvailableSeat | null>(null)
  const [searched, setSearched] = useState(false)

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
      const data = await fetchAvailableSeats(fromStation.order_in_route, toStation.order_in_route)
      setSeats(data)
    } catch {
      addToast('Failed to fetch seat availability', 'error')
    } finally {
      setLoadingSeats(false)
    }
  }

  const handleBookingSuccess = () => {
    // Re-fetch availability after booking
    if (fromStation && toStation) {
      fetchAvailableSeats(fromStation.order_in_route, toStation.order_in_route)
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

          {/* ── Search Card ─────────────────────────────────────── */}
          <div className="glass-card search-card fade-up" style={{ animationDelay: '0.2s' }}>
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
                  disabled={loadingSeats || !fromId || !toId}
                >
                  {loadingSeats
                    ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Searching…</>
                    : <><Search size={18} style={{ marginRight: 8 }} /> Find Seats</>}
                </button>
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
                <span><MapPin size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {fromStation.name} → {toStation.name}</span>
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

      {/* ── Seat Map Section ───────────────────────────────────────── */}
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

      {/* ── Booking Modal ──────────────────────────────────────────── */}
      {selectedSeat && fromStation && toStation && (
        <BookingModal
          seat={selectedSeat}
          fromStation={fromStation}
          toStation={toStation}
          onClose={() => setSelectedSeat(null)}
          onSuccess={handleBookingSuccess}
          addToast={addToast}
        />
      )}
    </main>
  )
}

export default HomePage
