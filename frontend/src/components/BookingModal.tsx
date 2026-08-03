import React, { useState } from 'react'
import { CheckCircle2, Ticket, LogIn, AlertTriangle } from 'lucide-react'
import type { AvailableSeat, BookingRequest, Station } from '../api/client'
import { createBooking, addToWaitlist } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import type { ToastType } from './Toast'

interface BookingModalProps {
  seat: AvailableSeat
  fromStation: Station
  toStation: Station
  travelDate: string
  trainScheduleId: number
  onClose: () => void
  onSuccess: () => void
  addToast: (msg: string, type?: ToastType) => void
}

const BookingModal: React.FC<BookingModalProps> = ({
  seat, fromStation, toStation, travelDate, trainScheduleId, onClose, onSuccess, addToast
}) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState('')
  const [nic, setNic] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [bookingId, setBookingId] = useState<number | null>(null)

  const handleBook = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !nic.trim()) {
      addToast('Please fill in all fields', 'error')
      return
    }

    setLoading(true)
    try {
      const req: BookingRequest = {
        seat_id: seat.id,
        passenger_name: name.trim(),
        passenger_email: email.trim(),
        passenger_phone: phone.trim(),
        passenger_nic: nic.trim(),
        travel_date: travelDate,
        start_station_id: fromStation.id,
        end_station_id: toStation.id,
        train_schedule_id: trainScheduleId,
      }
      const result = await createBooking(req)
      setBookingId(result.data.id)
      setConfirmed(true)
      addToast('Booking confirmed!', 'success')
    } catch (err: any) {
      const code = err?.response?.data?.code
      const message = err?.response?.data?.error ?? 'Booking failed. Please try again.'

      if (code === 'SEGMENT_CONFLICT') {
        addToast('This seat was just booked by someone else. Please choose another.', 'error')
        onSuccess() // Refresh availability
        onClose()
      } else {
        addToast(message, 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleWaitlist = async () => {
    if (!user) {
      addToast('Please log in to join the waitlist', 'error')
      onClose()
      navigate('/login')
      return
    }
    if (!name.trim() || !email.trim() || !phone.trim() || !nic.trim()) {
      addToast('Please fill in your details to join the waitlist', 'error')
      return
    }
    setLoading(true)
    try {
      const req: BookingRequest = {
        seat_id: seat.id,
        passenger_name: name.trim(),
        passenger_email: email.trim(),
        passenger_phone: phone.trim(),
        passenger_nic: nic.trim(),
        travel_date: travelDate,
        start_station_id: fromStation.id,
        end_station_id: toStation.id,
        train_schedule_id: trainScheduleId,
      }
      await addToWaitlist(req)
      addToast("You've been added to the waitlist!", 'info')
      onClose()
    } catch {
      addToast('Failed to join waitlist', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass-card modal">
        <button className="modal-close" onClick={onClose} aria-label="Close modal">×</button>

        {confirmed ? (
          // ── Confirmation View ──────────────────────────────────────────
          <div className="confirmation-card fade-up">
            <div className="confirmation-icon" style={{ display: 'flex', justifyContent: 'center' }}>
              <CheckCircle2 size={48} color="var(--color-success)" />
            </div>
            <h2 style={{ marginBottom: 8 }}>You're all set!</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>
              Your seat is confirmed. Booking reference #{bookingId}.
            </p>
            <div className="fare-breakdown" style={{ textAlign: 'left' }}>
              <div className="fare-row">
                <span className="label">Passenger</span>
                <span>{name}</span>
              </div>
              <div className="fare-row">
                <span className="label">Route</span>
                <span>{fromStation.name} → {toStation.name}</span>
              </div>
              <div className="fare-row">
                <span className="label">Coach / Seat</span>
                <span>Coach {seat.coach.name}, Seat {seat.seat_number}</span>
              </div>
              <div className="fare-row total">
                <span>Total Fare</span>
                <span>LKR {seat.fare.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <button className="btn btn-primary btn-full" onClick={() => { onSuccess(); onClose(); }}>
              Done
            </button>
          </div>
        ) : (
          // ── Booking Form View ──────────────────────────────────────────
          <>
            <h2 style={{ marginBottom: 4 }}>
              {seat.is_available ? 'Book Your Seat' : 'Join the Waitlist'}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: !user ? 12 : 24, fontSize: '0.9rem' }}>
              Coach {seat.coach.name}, Seat {seat.seat_number}
            </p>

            {/* Login warning - only shown to guests */}
            {!user && (
              <div style={{
                background: 'rgba(242,153,74,0.1)',
                border: '1px solid rgba(242,153,74,0.3)',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}>
                <AlertTriangle size={16} style={{ color: '#F2994A', flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: '0.85rem', color: '#F2994A', lineHeight: 1.5 }}>
                  <strong>You are booking as a guest.</strong> Without an account you cannot track this booking,
                  request a refund, reschedule, or join the waitlist.{' '}
                  <button
                    style={{ background: 'none', border: 'none', color: '#F2994A', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: 'inherit' }}
                    onClick={() => { onClose(); navigate('/login') }}
                  >
                    Log in
                  </button>
                  {' '}or{' '}
                  <button
                    style={{ background: 'none', border: 'none', color: '#F2994A', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: 'inherit' }}
                    onClick={() => { onClose(); navigate('/register') }}
                  >
                    create an account
                  </button>.
                </div>
              </div>
            )}

            {!seat.is_available && user && (
              <div style={{
                background: 'rgba(242,153,74,0.1)',
                border: '1px solid rgba(242,153,74,0.3)',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}>
                <AlertTriangle size={16} style={{ color: '#F2994A', flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: '0.85rem', color: '#F2994A', lineHeight: 1.5 }}>
                  <strong>This seat is currently booked.</strong> Fill out your details below to join the waitlist. We'll automatically book it for you if it becomes available.
                </div>
              </div>
            )}

            {/* Fare breakdown */}
            <div className="fare-breakdown">
              <div className="fare-row">
                <span className="label">From</span>
                <span>{fromStation.name}</span>
              </div>
              <div className="fare-row">
                <span className="label">To</span>
                <span>{toStation.name}</span>
              </div>
              <div className="fare-row">
                <span className="label">Distance</span>
                <span>~{Math.abs(toStation.distance_km - fromStation.distance_km)} km</span>
              </div>
              <div className="fare-row total">
                <span>Fare</span>
                <span>LKR {seat.fare.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <hr className="divider" />

            {/* Passenger details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="passenger-name">Full Name</label>
                <input
                  id="passenger-name"
                  className="form-input"
                  type="text"
                  placeholder="e.g. Aathavan Kandeepan"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="passenger-email">Email Address</label>
                <input
                  id="passenger-email"
                  className="form-input"
                  type="email"
                  placeholder="e.g. aathavan@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="passenger-phone">Phone Number</label>
                <input
                  id="passenger-phone"
                  className="form-input"
                  type="tel"
                  placeholder="e.g. 0771234567"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="passenger-nic">NIC Number</label>
                <input
                  id="passenger-nic"
                  className="form-input"
                  type="text"
                  placeholder="e.g. 199912345678"
                  value={nic}
                  onChange={e => setNic(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              {seat.is_available && (
                <button
                  id="btn-confirm-booking"
                  className="btn btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onClick={handleBook}
                  disabled={loading}
                >
                  {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Booking…</> : <><Ticket size={18} /> Confirm Booking</>}
                </button>
              )}
              <button
                id="btn-join-waitlist"
                className={seat.is_available ? "btn btn-secondary btn-sm" : "btn btn-primary"}
                onClick={handleWaitlist}
                disabled={loading}
                title={user ? 'Join the waitlist if this seat gets booked before you' : 'Login required to join waitlist'}
                style={Object.assign({ flex: seat.is_available ? undefined : 1 }, !user ? { opacity: 0.6 } : undefined)}
              >
                {!user ? <><LogIn size={14} style={{ marginRight: 4 }} /> Login to Waitlist</> : (seat.is_available ? 'Waitlist' : 'Join Waitlist')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default BookingModal
