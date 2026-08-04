import React, { useEffect, useState } from 'react'
import {
  Train, Search, MapPin, Ruler, Coins, CheckCircle2,
  ArrowRight, Calendar, ChevronDown, Sparkles
} from 'lucide-react'
import { fetchStations, fetchAvailableSeats, fetchTrainSchedules } from '../api/client'
import type { Station, AvailableSeat, TrainSchedule } from '../api/client'
import { parseNaturalLanguageQuery } from '../utils/nlp'
import SeatMap from '../components/SeatMap'
import BookingModal from '../components/BookingModal'
import TrainSchedules from '../components/TrainSchedules'
import { useTranslation } from 'react-i18next'
import type { ToastType } from '../components/Toast'

interface HomePageProps {
  addToast: (msg: string, type?: ToastType) => void
}

const HomePage: React.FC<HomePageProps> = ({ addToast }) => {
  const { t } = useTranslation()

  // ── Station / Search state ──────────────────────────────────────
  const [stations, setStations]             = useState<Station[]>([])
  const [fromId, setFromId]                 = useState<string>('')
  const [toId, setToId]                     = useState<string>('')
  const [travelDate, setTravelDate]         = useState<string>(new Date().toISOString().split('T')[0])
  const [loadingStations, setLoadingStations] = useState(true)
  const [searched, setSearched]             = useState(false)
  
  // ── NLP Search state ──────────────────────────────────────────
  const [nlpQuery, setNlpQuery]             = useState('')
  const [isParsing, setIsParsing]           = useState(false)

  // ── Train Schedule state ────────────────────────────────────────
  const [schedules, setSchedules]           = useState<TrainSchedule[]>([])
  const [loadingSchedules, setLoadingSchedules] = useState(false)
  const [scheduleError, setScheduleError]   = useState<string | null>(null)
  const [selectedTrain, setSelectedTrain]   = useState<TrainSchedule | null>(null)

  // ── Seat state ──────────────────────────────────────────────────
  const [seats, setSeats]                   = useState<AvailableSeat[]>([])
  const [loadingSeats, setLoadingSeats]     = useState(false)
  const [selectedSeat, setSelectedSeat]     = useState<AvailableSeat | null>(null)

  // Load stations once
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
  const toStation   = stations.find(s => s.id === Number(toId))

  const handleNlpSearch = async () => {
    if (!nlpQuery.trim() || stations.length === 0) return;
    
    setIsParsing(true);
    try {
      const parsed = await parseNaturalLanguageQuery(nlpQuery, stations);
      
      let updated = false;
      if (parsed.fromId) { setFromId(parsed.fromId); updated = true; }
      if (parsed.toId) { setToId(parsed.toId); updated = true; }
      if (parsed.date) { setTravelDate(parsed.date); updated = true; }

      if (updated) {
        addToast('Search fields auto-filled!', 'success');
        // Slight delay to allow React to update the state in the UI before searching
        setTimeout(() => {
          document.getElementById('btn-search-trains')?.click();
        }, 300);
      } else {
        addToast("Couldn't extract locations/dates. Please refine your query.", 'info');
      }
    } catch {
      addToast('Error understanding query', 'error');
    } finally {
      setIsParsing(false);
    }
  }

  // ── Step 1: Search → fetch schedules ───────────────────────────
  const handleSearch = async () => {
    if (!fromStation || !toStation) return
    if (fromStation.order_in_route >= toStation.order_in_route) {
      addToast('Destination must be after the origin on the route', 'error')
      return
    }

    setSearched(true)
    setSelectedTrain(null)
    setSeats([])
    setSelectedSeat(null)
    setScheduleError(null)
    setLoadingSchedules(true)

    try {
      const data = await fetchTrainSchedules(travelDate)
      setSchedules(data)
      if (data.length === 0) {
        addToast('No trains found for this date', 'info')
      }
    } catch {
      setScheduleError('Could not load train schedules. Please try again.')
      addToast('Failed to load train schedules', 'error')
    } finally {
      setLoadingSchedules(false)
      // Smooth-scroll into the results
      setTimeout(() => {
        document.getElementById('schedules-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }

  // ── Step 2: Select train → fetch seats ─────────────────────────
  const handleTrainSelect = async (train: TrainSchedule) => {
    setSelectedTrain(train)
    setSeats([])
    setSelectedSeat(null)
    setLoadingSeats(true)

    try {
      if (!fromStation || !toStation) return
      const data = await fetchAvailableSeats(fromStation.order_in_route, toStation.order_in_route, travelDate, train.id)
      setSeats(data)
      if (data.filter(s => s.is_available).length === 0) {
        addToast('No seats available - try waitlist after selecting a seat', 'info')
      }
    } catch {
      addToast('Failed to fetch seat availability', 'error')
    } finally {
      setLoadingSeats(false)
      setTimeout(() => {
        document.getElementById('seatmap-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
    }
  }

  const handleBookingSuccess = () => {
    if (fromStation && toStation && selectedTrain) {
      fetchAvailableSeats(fromStation.order_in_route, toStation.order_in_route, travelDate, selectedTrain.id)
        .then(setSeats)
      // Also refresh schedules to reflect updated seat count
      fetchTrainSchedules(travelDate).then(setSchedules).catch(() => {})
    }
  }

  const distanceKm = fromStation && toStation
    ? Math.abs(toStation.distance_km - fromStation.distance_km)
    : 0

  return (
    <main>

      {/* ═══════════════════════════════════════════════════════════
          HERO + SEARCH
      ═══════════════════════════════════════════════════════════ */}
      <section className="hero">
        <div className="container">
          <div className="hero-eyebrow fade-in">
            <Train size={16} />
            {t('home.routeInfo')}
          </div>

          <h1 className="hero-title fade-up" dangerouslySetInnerHTML={{ __html: t('home.heroTitle') }} />

          <p className="hero-subtitle fade-up" style={{ animationDelay: '0.1s' }}>
            {t('home.heroSubtitle')}
          </p>

          {/* ── Search Panel ─────────────────────────────────────── */}
          <div className="glass-card search-panel fade-up" style={{ animationDelay: '0.2s' }}>
            <div className="search-panel__heading">
              <Search size={16} style={{ color: 'var(--color-primary)' }} />
              <span>{t('home.findTrains')}</span>
            </div>

            {loadingStations ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                <div className="spinner spinner-lg" />
              </div>
            ) : (
              <>
                {/* ── NLP Magic Search ─────────────────────────────────── */}
                <div className="form-group fade-up" style={{ animationDelay: '0.3s', marginBottom: 24 }}>
                  <label className="form-label" htmlFor="nlp-search">
                    <Sparkles size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4, color: 'var(--color-primary)' }} />
                    {t('home.smartSearch')}
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      id="nlp-search"
                      className="form-input"
                      style={{ flex: 1 }}
                      placeholder={t('home.smartSearchPlaceholder')}
                      value={nlpQuery}
                      onChange={e => setNlpQuery(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleNlpSearch()
                      }}
                      disabled={isParsing}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={handleNlpSearch}
                      disabled={isParsing || !nlpQuery.trim()}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {isParsing ? <div className="spinner" style={{ width: 18, height: 18 }} /> : t('home.magicSearchBtn')}
                    </button>
                  </div>
                </div>
                
                <div className="search-divider" style={{ 
                  display: 'flex', alignItems: 'center', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 24 
                }}>
                  <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border)' }} />
                  <span style={{ padding: '0 12px', fontSize: 12, fontWeight: 500 }}>{t('home.orManualSearch')}</span>
                  <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border)' }} />
                </div>

                <div className="search-grid">
                  {/* From */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="from-station">
                      <MapPin size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} />
                      {t('home.from')}
                    </label>
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

                  {/* Date */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="travel-date">
                      <Calendar size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} />
                      {t('home.date')}
                    </label>
                    <input
                      type="date"
                      id="travel-date"
                      className="form-input"
                      value={travelDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => {
                        setTravelDate(e.target.value)
                        // Reset results when date changes
                        if (searched) {
                          setSearched(false)
                          setSchedules([])
                          setSelectedTrain(null)
                          setSeats([])
                        }
                      }}
                    />
                  </div>

                  {/* To */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="to-station">
                      <MapPin size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} />
                      {t('home.to')}
                    </label>
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

                  {/* Search Button */}
                  <button
                    id="btn-search-trains"
                    className="btn btn-primary btn-lg"
                    onClick={handleSearch}
                    disabled={loadingSchedules || !fromId || !toId}
                  >
                    {loadingSchedules
                      ? <><div className="spinner" style={{ width: 18, height: 18 }} /> {t('home.searching')}</>
                      : <><Search size={18} style={{ marginRight: 8 }} /> {t('home.searchTrains')}</>
                    }
                  </button>
                </div>

                {/* Journey info strip */}
                {fromStation && toStation && fromStation.id !== toStation.id && (
                  <div className="search-panel__info">
                    <span>
                      <MapPin size={13} style={{ display: 'inline', verticalAlign: 'text-bottom' }} />
                      {' '}{fromStation.name}
                      <ArrowRight size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', margin: '0 4px' }} />
                      {toStation.name}
                    </span>
                    {distanceKm > 0 && (
                      <>
                        <span>
                          <Ruler size={13} style={{ display: 'inline', verticalAlign: 'text-bottom' }} />
                          {' '}~{distanceKm.toFixed(0)} km
                        </span>
                        <span>
                          <Coins size={13} style={{ display: 'inline', verticalAlign: 'text-bottom' }} />
                          {' '}From LKR {(distanceKm * 3.5).toFixed(0)}
                        </span>
                      </>
                    )}
                    <span>
                      <Calendar size={13} style={{ display: 'inline', verticalAlign: 'text-bottom' }} />
                      {' '}{travelDate}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Scroll cue */}
          {searched && (
            <div className="scroll-cue fade-in">
              <ChevronDown size={20} />
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          STEP 2 - TRAIN SCHEDULE RESULTS
      ═══════════════════════════════════════════════════════════ */}
      {searched && (
        <section id="schedules-section" className="train-schedules-section">
          <div className="container">
            <div className="schedules-header fade-up">
              <div className="schedules-route-badge">
                <Train size={14} />
                {fromStation?.name} → {toStation?.name} · {travelDate}
              </div>
              <h2 className="schedules-title">{t('home.availableTrains')}</h2>
              {!loadingSchedules && schedules.length > 0 && (
                <p className="schedules-subtitle">
                  {t('home.trainsFound', { count: schedules.length })}
                </p>
              )}
            </div>

            <TrainSchedules
              schedules={schedules}
              loading={loadingSchedules}
              error={scheduleError}
              selectedId={selectedTrain?.id ?? null}
              travelDate={travelDate}
              onSelect={handleTrainSelect}
            />
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════
          STEP 3 - SEAT MAP
      ═══════════════════════════════════════════════════════════ */}
      {selectedTrain && (
        <section id="seatmap-section" className="seats-section">
          <div className="container">

            {/* Selected train context bar */}
            <div
              className="selected-train-banner fade-up"
              style={{ '--card-accent': selectedTrain.accent_color } as React.CSSProperties}
            >
              <div className="selected-train-banner__left">
                <Train size={20} style={{ color: selectedTrain.accent_color }} />
                <div>
                  <div className="selected-train-banner__label">Selected Train</div>
                  <div className="selected-train-banner__name">
                    #{selectedTrain.train_number} - {selectedTrain.train_name}
                    <span className="selected-train-banner__time">
                      {selectedTrain.departure_time} → {selectedTrain.arrival_time}
                      {selectedTrain.is_overnight ? ' (+1 day)' : ''}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {fromStation && toStation && (
                  <span className="selected-train-banner__segment">
                    <MapPin size={12} />
                    {fromStation.name} → {toStation.name}
                  </span>
                )}
                {seats.length > 0 && (
                  <span className="selected-train-banner__avail">
                    <CheckCircle2 size={12} />
                    {seats.filter(s => s.is_available).length} seats available
                  </span>
                )}
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => { setSelectedTrain(null); setSeats([]) }}
                >
                  Change Train
                </button>
              </div>
            </div>

            {/* Seat Map */}
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
      {selectedSeat && fromStation && toStation && selectedTrain && (
        <BookingModal
          seat={selectedSeat}
          fromStation={fromStation}
          toStation={toStation}
          travelDate={travelDate}
          trainScheduleId={selectedTrain.id}
          onClose={() => setSelectedSeat(null)}
          onSuccess={handleBookingSuccess}
          addToast={addToast}
        />
      )}
    </main>
  )
}

export default HomePage
