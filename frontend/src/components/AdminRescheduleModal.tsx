import React, { useState, useEffect } from 'react'
import { fetchTrainSchedules, fetchAvailableSeats, processCancellation } from '../api/client'
import type { Booking, TrainSchedule, AvailableSeat } from '../api/client'
import type { ToastType } from './Toast'
import SeatMap from './SeatMap'
import { Map } from 'lucide-react'

interface AdminRescheduleModalProps {
  booking: Booking
  onClose: () => void
  onSuccess: () => void
  addToast: (msg: string, type?: ToastType) => void
}

const AdminRescheduleModal: React.FC<AdminRescheduleModalProps> = ({
  booking, onClose, onSuccess, addToast
}) => {
  const [date, setDate] = useState(booking.requested_travel_date || new Date().toISOString().split('T')[0])
  const [schedules, setSchedules] = useState<TrainSchedule[]>([])
  const [scheduleId, setScheduleId] = useState<number | null>(null)
  const [seats, setSeats] = useState<AvailableSeat[]>([])
  const [selectedSeatId, setSelectedSeatId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadSchedules()
  }, [date])

  useEffect(() => {
    if (scheduleId) {
      loadSeats()
    } else {
      setSeats([])
    }
  }, [scheduleId, date])

  const loadSchedules = async () => {
    try {
      const data = await fetchTrainSchedules(date)
      setSchedules(data)
      if (data.length > 0 && !data.find(s => s.id === scheduleId)) {
        setScheduleId(data[0].id)
      } else if (data.length === 0) {
        setScheduleId(null)
      }
    } catch {
      addToast('Failed to load schedules', 'error')
    }
  }

  const loadSeats = async () => {
    if (!scheduleId) return
    setLoading(true)
    try {
      // Fetch available seats for the specific segment the booking is for
      const data = await fetchAvailableSeats(booking.start_station_order, booking.end_station_order, date, scheduleId)
      setSeats(data)
      setSelectedSeatId(null)
    } catch {
      addToast('Failed to load seats', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!scheduleId || !selectedSeatId) {
      addToast('Please select a train and a seat', 'error')
      return
    }
    setSubmitting(true)
    try {
      await processCancellation(booking.id, 'reschedule', date, selectedSeatId, scheduleId)
      addToast('Booking rescheduled successfully', 'success')
      onSuccess()
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to reschedule booking', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: 820, width: '95%', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: '0 0 auto' }}>
          <h2>Reschedule Booking #{booking.id}</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>
            Passenger: {booking.passenger_name} <br />
            Route: {booking.start_station.name} → {booking.end_station.name}
          </p>

          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">New Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Train Schedule</label>
              <select
                className="form-input"
                value={scheduleId || ''}
                onChange={e => setScheduleId(Number(e.target.value) || null)}
              >
                {schedules.map(ts => (
                  <option key={ts.id} value={ts.id}>
                    #{ts.train_number} - {ts.train_name}
                  </option>
                ))}
                {schedules.length === 0 && (
                  <option value="" disabled>No trains available</option>
                )}
              </select>
            </div>
          </div>
        </div>

        <div style={{ flex: '1 1 auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, marginBottom: 16, background: 'var(--color-bg-secondary)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Map size={18} color="var(--color-primary)" /> Select New Seat
          </h3>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <div className="spinner" />
            </div>
          ) : seats.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 24 }}>
              No seats available for the selected train and date.
            </p>
          ) : (
            <SeatMap
              seats={seats}
              selectedSeatId={selectedSeatId}
              onSelect={seat => setSelectedSeatId(seat.id)}
            />
          )}
        </div>

        {selectedSeatId && (
          <p style={{ color: 'var(--color-success)', fontSize: '0.9rem', marginBottom: 12, textAlign: 'center' }}>
            ✓ Seat selected — click Confirm Reschedule to proceed
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, flexShrink: 0 }}>
          <button className="btn btn-outline" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={submitting || !selectedSeatId}>
            {submitting ? 'Processing...' : 'Confirm Reschedule'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminRescheduleModal
