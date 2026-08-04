import React, { useState, useEffect } from 'react'
import { fetchTrainSchedules, fetchAvailableSeats, assignWaitlistSeat } from '../api/client'
import type { WaitlistEntry, TrainSchedule, AvailableSeat } from '../api/client'
import type { ToastType } from './Toast'
import SeatMap from './SeatMap'
import { Map } from 'lucide-react'

interface AdminWaitlistAssignModalProps {
  entry: WaitlistEntry
  onClose: () => void
  onSuccess: () => void
  addToast: (msg: string, type?: ToastType) => void
}

const AdminWaitlistAssignModal: React.FC<AdminWaitlistAssignModalProps> = ({
  entry, onClose, onSuccess, addToast
}) => {
  const [date] = useState(entry.travel_date)
  const [schedules, setSchedules] = useState<TrainSchedule[]>([])
  const [scheduleId, setScheduleId] = useState<number | null>(null)
  const [seats, setSeats] = useState<AvailableSeat[]>([])
  const [selectedSeatId, setSelectedSeatId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadSchedules()
  }, [])

  useEffect(() => {
    if (scheduleId) loadSeats()
    else setSeats([])
  }, [scheduleId])

  const loadSchedules = async () => {
    try {
      const data = await fetchTrainSchedules(date)
      setSchedules(data)
      if (data.length > 0) setScheduleId(data[0].id)
    } catch {
      addToast('Failed to load schedules', 'error')
    }
  }

  const loadSeats = async () => {
    if (!scheduleId) return
    setLoading(true)
    try {
      const data = await fetchAvailableSeats(entry.start_station_order, entry.end_station_order, date, scheduleId)
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
      await assignWaitlistSeat(entry.id, selectedSeatId, scheduleId)
      addToast('Seat assigned - waitlist entry promoted to confirmed booking!', 'success')
      onSuccess()
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to assign seat', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: 820, width: '95%', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: '0 0 auto', marginBottom: 20 }}>
          <h2>Assign Seat - Waitlist #{entry.id}</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
            Passenger: <strong>{entry.passenger_name}</strong> ({entry.passenger_email})<br />
            Route: {entry.start_station.name} → {entry.end_station.name}<br />
            Travel Date: <strong>{date}</strong>
          </p>

          <div className="form-group">
            <label className="form-label">Train Schedule</label>
            <select
              className="form-input"
              value={scheduleId || ''}
              onChange={e => setScheduleId(Number(e.target.value) || null)}
            >
              {schedules.map(ts => (
                <option key={ts.id} value={ts.id}>
                  #{ts.train_number} - {ts.train_name} ({ts.departure_time})
                </option>
              ))}
              {schedules.length === 0 && (
                <option value="" disabled>No trains available for this date</option>
              )}
            </select>
          </div>
        </div>

        <div style={{ flex: '1 1 auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, marginBottom: 16, background: 'var(--color-bg-secondary)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Map size={18} color="var(--color-primary)" /> Select Seat to Assign
          </h3>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <div className="spinner" />
            </div>
          ) : seats.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 24 }}>
              No available seats for this segment on the selected train.
            </p>
          ) : (
            <SeatMap
              seats={seats}
              selectedSeatIds={selectedSeatId ? [selectedSeatId] : []}
              onSelect={seat => setSelectedSeatId(seat.id)}
            />
          )}
        </div>

        {selectedSeatId && (
          <p style={{ color: 'var(--color-success)', fontSize: '0.9rem', marginBottom: 12, textAlign: 'center' }}>
            ✓ Seat selected - click Assign to confirm
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, flexShrink: 0 }}>
          <button className="btn btn-outline" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={submitting || !selectedSeatId}>
            {submitting ? 'Assigning...' : 'Assign Seat'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminWaitlistAssignModal
