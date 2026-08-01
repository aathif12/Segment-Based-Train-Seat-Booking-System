import React, { useState } from 'react'
import { CheckCircle2, Ticket } from 'lucide-react'
import type { AvailableSeat, BookingRequest, Station } from '../api/client'
import { createBooking, addToWaitlist } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { ToastType } from './Toast'

interface BookingModalProps {
  seat: AvailableSeat
  fromStation: Station
  toStation: Station
  travelDate: string
  onClose: () => void
  onSuccess: () => void
  addToast: (msg: string, type?: ToastType) => void
}

const BookingModal: React.FC<BookingModalProps> = ({
  seat, fromStation, toStation, travelDate, onClose, onSuccess, addToast
}) => {
  const { user } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [bookingId, setBookingId] = useState<number | null>(null)

  const handleBook = async () => {
    if (!name.trim() || !email.trim()) {
      addToast('Please fill in all fields', 'error')
      return
    }

    setLoading(true)
    try {
      const req: BookingRequest = {
        seat_id: seat.id,
        passenger_name: name.trim(),
        passenger_email: email.trim(),
        travel_date: travelDate,
        start_station_id: fromStation.id,
        end_station_id: toStation.id,
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
    if (!name.trim() || !email.trim()) {
      addToast('Please fill in your details to join the waitlist', 'error')
      return
    }
    setLoading(true)
    try {
      const req: BookingRequest = {
        seat_id: seat.id,
        passenger_name: name.trim(),
        passenger_email: email.trim(),
        travel_date: travelDate,
        start_station_id: fromStation.id,
        end_station_id: toStation.id,
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
            <h2 style={{ marginBottom: 4 }}>Book Your Seat</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 24, fontSize: '0.9rem' }}>
              Coach {seat.coach.name}, Seat {seat.seat_number}
            </p>

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
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                id="btn-confirm-booking"
                className="btn btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={handleBook}
                disabled={loading}
              >
                {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Booking…</> : <><Ticket size={18} /> Confirm Booking</>}
              </button>
              <button
                id="btn-join-waitlist"
                className="btn btn-secondary btn-sm"
                onClick={handleWaitlist}
                disabled={loading}
                title="Join the waitlist if this seat gets booked before you"
              >
                Waitlist
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default BookingModal
