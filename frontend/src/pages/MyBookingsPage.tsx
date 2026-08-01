import React, { useEffect, useState } from 'react'
import { Ticket, Trash2 } from 'lucide-react'
import { fetchUserBookings, cancelUserBooking } from '../api/client'
import type { Booking } from '../api/client'
import type { ToastType } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

interface MyBookingsPageProps {
  addToast: (msg: string, type?: ToastType) => void
}

const MyBookingsPage: React.FC<MyBookingsPageProps> = ({ addToast }) => {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadBookings()
  }, [user])

  const loadBookings = async () => {
    try {
      const data = await fetchUserBookings()
      setBookings(data || [])
    } catch {
      addToast('Failed to load your bookings', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id: number) => {
    if (!window.confirm('Are you sure you want to request cancellation for this booking?')) return
    try {
      await cancelUserBooking(id)
      addToast('Cancellation request submitted successfully', 'success')
      loadBookings()
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to cancel booking', 'error')
    }
  }

  if (loading) {
    return (
      <main style={{ padding: '80px 0', display: 'flex', justifyContent: 'center' }}>
        <div className="spinner spinner-lg" />
      </main>
    )
  }

  return (
    <main style={{ padding: '48px 0' }}>
      <div className="container fade-up">
        <h1 style={{ marginBottom: 30 }}>My Bookings</h1>
        
        {bookings.length === 0 ? (
          <div className="glass-card empty-state">
            <div className="icon"><Ticket size={48} color="var(--color-text-muted)" /></div>
            <h3>No trips planned</h3>
            <p>You haven't made any bookings yet.</p>
            <button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginTop: 16 }}>
              Book a Ticket
            </button>
          </div>
        ) : (
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="revenue-table" style={{ minWidth: 600 }}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Route</th>
                    <th>Date</th>
                    <th>Seat</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id}>
                      <td style={{ color: 'var(--color-text-muted)' }}>#{b.id}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.start_station.name} → {b.end_station.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          Passenger: {b.passenger_name}
                        </div>
                      </td>
                      <td>{b.travel_date}</td>
                      <td>Coach {b.seat.coach.name} - Seat {b.seat.seat_number}</td>
                      <td>
                        <span className="badge" style={{ 
                          background: (b.status === 'CANCELLED' || b.status === 'REFUNDED') ? 'rgba(235, 87, 87, 0.1)' : 
                                      b.status === 'CANCEL_REQUESTED' ? 'rgba(245, 166, 35, 0.1)' :
                                      b.status === 'RESCHEDULED' ? 'rgba(45, 156, 219, 0.1)' :
                                      b.status === 'CONFIRMED' ? 'rgba(39, 174, 96, 0.1)' : 'rgba(255,255,255,0.05)',
                          color: (b.status === 'CANCELLED' || b.status === 'REFUNDED') ? 'var(--color-danger)' : 
                                 b.status === 'CANCEL_REQUESTED' ? 'var(--color-primary)' :
                                 b.status === 'RESCHEDULED' ? '#2d9cdb' :
                                 b.status === 'CONFIRMED' ? 'var(--color-success)' : 'var(--color-text-muted)',
                          border: `1px solid ${
                                 (b.status === 'CANCELLED' || b.status === 'REFUNDED') ? 'rgba(235, 87, 87, 0.2)' : 
                                 b.status === 'CANCEL_REQUESTED' ? 'rgba(245, 166, 35, 0.2)' :
                                 b.status === 'RESCHEDULED' ? 'rgba(45, 156, 219, 0.2)' :
                                 b.status === 'CONFIRMED' ? 'rgba(39, 174, 96, 0.2)' : 'rgba(255,255,255,0.1)'}`
                        }}>
                          {b.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {b.status === 'CONFIRMED' && (
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '6px 12px', color: 'var(--color-danger)', borderColor: 'rgba(235,87,87,0.3)', fontSize: '0.8rem' }}
                            onClick={() => handleCancel(b.id)}
                            title="Request Cancellation"
                          >
                            <Trash2 size={14} style={{ marginRight: 6 }} /> Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default MyBookingsPage
