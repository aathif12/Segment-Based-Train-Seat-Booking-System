import React, { useEffect, useState } from 'react'
import { Ticket, MessageSquare } from 'lucide-react'
import { fetchUserBookings, requestBookingChange, fetchUserInquiries } from '../api/client'
import type { Booking, Inquiry } from '../api/client'
import type { ToastType } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

interface MyBookingsPageProps {
  addToast: (msg: string, type?: ToastType) => void
}

const MyBookingsPage: React.FC<MyBookingsPageProps> = ({ addToast }) => {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'bookings' | 'inquiries'>('bookings')
  const [rescheduleBookingId, setRescheduleBookingId] = useState<number | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState<string>(new Date().toISOString().split('T')[0])
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadBookings()
  }, [user])

  const loadData = async () => {
    setLoading(true)
    try {
      const [bookingsData, inquiriesData] = await Promise.all([
        fetchUserBookings(),
        fetchUserInquiries()
      ])
      setBookings(bookingsData || [])
      setInquiries(inquiriesData || [])
    } catch {
      addToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const handleRefundRequest = async (id: number) => {
    if (!window.confirm('Are you sure you want to request a refund for this booking?')) return
    try {
      await requestBookingChange(id, 'refund')
      addToast('Refund request submitted successfully', 'success')
      loadData()
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to request refund', 'error')
    }
  }

  const handleRescheduleRequest = async (id: number) => {
    if (!rescheduleDate) {
      addToast('Please select a new date', 'error')
      return
    }
    try {
      await requestBookingChange(id, 'reschedule', rescheduleDate)
      addToast('Reschedule request submitted successfully', 'success')
      setRescheduleBookingId(null)
      loadData()
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to request reschedule', 'error')
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <h1>Dashboard</h1>
          <button className="btn btn-primary" onClick={() => navigate('/inquiries')}>
            New Inquiry
          </button>
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 24, borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
          <button 
            className={`coach-tab ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            My Bookings
          </button>
          <button 
            className={`coach-tab ${activeTab === 'inquiries' ? 'active' : ''}`}
            onClick={() => setActiveTab('inquiries')}
          >
            My Inquiries
          </button>
        </div>

        {activeTab === 'bookings' ? (
          bookings.length === 0 ? (
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
                                      b.status.includes('REQUESTED') ? 'rgba(245, 166, 35, 0.1)' :
                                      b.status === 'RESCHEDULED' ? 'rgba(45, 156, 219, 0.1)' :
                                      b.status === 'CONFIRMED' ? 'rgba(39, 174, 96, 0.1)' : 'rgba(255,255,255,0.05)',
                          color: (b.status === 'CANCELLED' || b.status === 'REFUNDED') ? 'var(--color-danger)' : 
                                 b.status.includes('REQUESTED') ? 'var(--color-primary)' :
                                 b.status === 'RESCHEDULED' ? '#2d9cdb' :
                                 b.status === 'CONFIRMED' ? 'var(--color-success)' : 'var(--color-text-muted)',
                          border: `1px solid ${
                                 (b.status === 'CANCELLED' || b.status === 'REFUNDED') ? 'rgba(235, 87, 87, 0.2)' : 
                                 b.status.includes('REQUESTED') ? 'rgba(245, 166, 35, 0.2)' :
                                 b.status === 'RESCHEDULED' ? 'rgba(45, 156, 219, 0.2)' :
                                 b.status === 'CONFIRMED' ? 'rgba(39, 174, 96, 0.2)' : 'rgba(255,255,255,0.1)'}`
                        }}>
                          {b.status.replace(/_/g, ' ')}
                        </span>
                        {b.status === 'RESCHEDULE_REQUESTED' && b.requested_travel_date && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                            To: {b.requested_travel_date}
                          </div>
                        )}
                      </td>
                      <td>
                        {b.status === 'CONFIRMED' && rescheduleBookingId !== b.id && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '4px 8px', color: 'var(--color-danger)', borderColor: 'rgba(235,87,87,0.3)', fontSize: '0.8rem' }}
                              onClick={() => handleRefundRequest(b.id)}
                            >
                              Refund
                            </button>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '4px 8px', color: '#2d9cdb', borderColor: 'rgba(45,156,219,0.3)', fontSize: '0.8rem' }}
                              onClick={() => setRescheduleBookingId(b.id)}
                            >
                              Reschedule
                            </button>
                          </div>
                        )}
                        {rescheduleBookingId === b.id && (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input 
                              type="date" 
                              className="form-input" 
                              style={{ padding: '4px 8px', width: 120, fontSize: '0.8rem' }}
                              value={rescheduleDate}
                              min={new Date().toISOString().split('T')[0]}
                              onChange={e => setRescheduleDate(e.target.value)}
                            />
                            <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => handleRescheduleRequest(b.id)}>
                              Send
                            </button>
                            <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => setRescheduleBookingId(null)}>
                              X
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )) : (
          // Inquiries Tab
          inquiries.length === 0 ? (
            <div className="glass-card empty-state">
              <div className="icon"><MessageSquare size={48} color="var(--color-text-muted)" /></div>
              <h3>No inquiries found</h3>
              <p>You haven't submitted any support requests yet.</p>
            </div>
          ) : (
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <table className="revenue-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Booking Ref</th>
                    <th>Type</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map(iq => (
                    <tr key={iq.id}>
                      <td style={{ color: 'var(--color-text-muted)' }}>#{iq.id}</td>
                      <td>{iq.booking_id ? `#${iq.booking_id}` : '-'}</td>
                      <td>{iq.action_type}</td>
                      <td style={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{iq.message}</td>
                      <td>
                        <span className="badge" style={{
                          background: iq.status === 'RESOLVED' ? 'rgba(34,197,94,0.1)' : iq.status === 'REJECTED' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                          color: iq.status === 'RESOLVED' ? 'var(--color-success)' : iq.status === 'REJECTED' ? 'var(--color-danger)' : 'var(--color-warning)',
                          border: `1px solid ${iq.status === 'RESOLVED' ? 'rgba(34,197,94,0.3)' : iq.status === 'REJECTED' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`
                        }}>
                          {iq.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{new Date(iq.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </main>

  )
}

export default MyBookingsPage
