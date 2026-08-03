import React, { useEffect, useState } from 'react'
import { Settings, LogIn, TrendingUp, Users, AlertCircle, Trash2, Ticket, LogOut, List, Map, RefreshCcw, DollarSign } from 'lucide-react'
import { fetchOccupancy, fetchRevenue, fetchBookings, fetchWaitlist, setAuthCredentials, adminCancelBooking, processCancellation, adminCancelWaitlistEntry, fetchTrainSchedules, fetchAvailableSeats, fetchAdminInquiries, updateInquiryStatus } from '../api/client'
import type { CoachOccupancy, RevenueRecord, Booking, WaitlistEntry, TrainSchedule, AvailableSeat, Inquiry } from '../api/client'
import type { ToastType } from '../components/Toast'
import SeatMap from '../components/SeatMap'
import AdminRescheduleModal from '../components/AdminRescheduleModal'
import AdminWaitlistAssignModal from '../components/AdminWaitlistAssignModal'

interface AdminPageProps {
  addToast: (msg: string, type?: ToastType) => void
}

const AdminPage: React.FC<AdminPageProps> = ({ addToast }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'waitlist' | 'seatmap' | 'inquiries'>('dashboard')
  
  const [occupancy, setOccupancy] = useState<CoachOccupancy[]>([])
  const [revenue, setRevenue] = useState<RevenueRecord[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [mapSeats, setMapSeats] = useState<AvailableSeat[]>([])
  const [mapDate, setMapDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [mapSchedules, setMapSchedules] = useState<TrainSchedule[]>([])
  const [mapScheduleId, setMapScheduleId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [rescheduleModalBooking, setRescheduleModalBooking] = useState<Booking | null>(null)
  const [assignModalEntry, setAssignModalEntry] = useState<WaitlistEntry | null>(null)
  const [activeInquiryId, setActiveInquiryId] = useState<number | null>(null)

  const loadDashboardData = async () => {
    try {
      const [occ, rev] = await Promise.all([fetchOccupancy(), fetchRevenue()])
      setOccupancy(occ ?? [])
      setRevenue(rev ?? [])
    } catch {
      addToast('Failed to load admin data', 'error')
    }
  }

  const loadBookings = async () => {
    try {
      const b = await fetchBookings()
      setBookings(b ?? [])
    } catch {
      addToast('Failed to load bookings', 'error')
    }
  }

  const loadWaitlist = async () => {
    try {
      const w = await fetchWaitlist()
      setWaitlist(w ?? [])
    } catch {
      addToast('Failed to load waitlist', 'error')
    }
  }

  const loadInquiries = async () => {
    try {
      const iq = await fetchAdminInquiries()
      setInquiries(iq ?? [])
    } catch {
      addToast('Failed to load inquiries', 'error')
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true)
      if (activeTab === 'dashboard') {
        loadDashboardData().finally(() => setLoading(false))
      } else if (activeTab === 'bookings') {
        loadBookings().finally(() => setLoading(false))
      } else if (activeTab === 'seatmap') {
        loadSeatMap()
      } else if (activeTab === 'inquiries') {
        loadInquiries().finally(() => setLoading(false))
      } else {
        loadWaitlist().finally(() => setLoading(false))
      }
    }
  }, [isAuthenticated, activeTab, mapDate, mapScheduleId])

  const loadSeatMap = async () => {
    setLoading(true)
    try {
      // First fetch schedules for the selected date
      const schedules = await fetchTrainSchedules(mapDate)
      setMapSchedules(schedules)
      
      let currentScheduleId = mapScheduleId
      if (schedules.length > 0 && (!currentScheduleId || !schedules.find(s => s.id === currentScheduleId))) {
        currentScheduleId = schedules[0].id
        setMapScheduleId(currentScheduleId)
      } else if (schedules.length === 0) {
        currentScheduleId = null
        setMapScheduleId(null)
        setMapSeats([])
      }

      if (currentScheduleId) {
        // 0 to 100 as dummy max orders to cover entire route
        const seats = await fetchAvailableSeats(0, 100, mapDate, currentScheduleId)
        setMapSeats(seats)
      }
    } catch {
      addToast('Failed to load seat map', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setAuthCredentials(username, password)
    
    try {
      // Test credentials
      await fetchOccupancy()
      setIsAuthenticated(true)
      addToast('Logged in successfully', 'success')
    } catch (err: any) {
      if (err.response?.status === 401) {
        addToast('Invalid credentials', 'error')
      } else {
        addToast('Error connecting to server', 'error')
      }
      setAuthCredentials(undefined, undefined)
    } finally {
      setLoginLoading(false)
    }
  }

  const handleCancelBooking = async (id: number) => {
    if (!window.confirm('Are you sure you want to force cancel this booking?')) return
    try {
      await adminCancelBooking(id)
      addToast('Booking cancelled successfully', 'success')
      loadBookings() // refresh list
    } catch {
      addToast('Failed to cancel booking', 'error')
    }
  }

  const handleCancelWaitlistEntry = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this waitlist entry?')) return
    try {
      await adminCancelWaitlistEntry(id)
      addToast('Waitlist entry cancelled successfully', 'success')
      loadWaitlist() // refresh list
    } catch {
      addToast('Failed to cancel waitlist entry', 'error')
    }
  }

  const handleProcessCancellation = async (id: number, action: 'refund' | 'reschedule' | 'reject') => {
    try {
      await processCancellation(id, action)
      addToast(`Request ${action}ed successfully`, 'success')
      loadBookings() // refresh list
    } catch (err: any) {
      addToast(err.response?.data?.error || `Failed to process request`, 'error')
    }
  }

  const handleUpdateInquiry = async (id: number, status: string) => {
    try {
      await updateInquiryStatus(id, status)
      addToast('Inquiry status updated', 'success')
      loadInquiries()
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to update inquiry', 'error')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setAuthCredentials(undefined, undefined)
    setUsername('')
    setPassword('')
  }

  if (!isAuthenticated) {
    return (
      <main style={{ padding: '80px 0', display: 'flex', justifyContent: 'center' }}>
        <div className="glass-card" style={{ maxWidth: 400, width: '100%', padding: '40px 30px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ background: 'var(--color-primary-light)', padding: 16, borderRadius: '50%', color: 'var(--color-primary)' }}>
              <Settings size={32} />
            </div>
          </div>
          <h2 style={{ textAlign: 'center', marginBottom: 30 }}>Admin Login</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input 
                type="text" 
                className="form-input" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group" style={{ marginBottom: 30 }}>
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loginLoading}>
              {loginLoading ? 'Authenticating...' : <><LogIn size={18} /> Sign In</>}
            </button>
          </form>
        </div>
      </main>
    )
  }

  const totalRevenue = revenue.reduce((sum, r) => sum + r.total_revenue, 0)
  const totalBookings = revenue.reduce((sum, r) => sum + r.booking_count, 0)
  const totalSeats = occupancy.reduce((sum, o) => sum + o.total_seats, 0)
  const activeBookings = occupancy.reduce((sum, o) => sum + o.active_bookings, 0)

  return (
    <main style={{ padding: '48px 0' }}>
      <div className="container">
        <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="hero-eyebrow" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings size={18} /> Department Operations View
            </div>
            <h1 style={{ marginBottom: 8 }}>Admin Dashboard</h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 30 }}>
              Live occupancy, revenue analytics, and booking management.
            </p>
          </div>
          <button className="btn btn-outline" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>

        {/* Notifications Banner */}
        {(() => {
          const refundReqs = bookings.filter(b => b.status === 'REFUND_REQUESTED').length
          const rescheduleReqs = bookings.filter(b => b.status === 'RESCHEDULE_REQUESTED').length
          if (refundReqs === 0 && rescheduleReqs === 0 && inquiries.filter(i => i.status === 'PENDING').length === 0) return null
          
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {(refundReqs > 0 || rescheduleReqs > 0) && (
                <div style={{
                  background: 'rgba(242, 153, 74, 0.15)',
                  border: '1px solid rgba(242, 153, 74, 0.4)',
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                }} onClick={() => setActiveTab('bookings')}>
                  <AlertCircle size={20} color="#F2994A" />
                  <div style={{ color: '#F2994A', fontSize: '0.95rem', fontWeight: 500 }}>
                    You have {refundReqs + rescheduleReqs} pending user request{refundReqs + rescheduleReqs > 1 ? 's' : ''} (
                    {refundReqs > 0 && `${refundReqs} refund${refundReqs > 1 ? 's' : ''}`}
                    {refundReqs > 0 && rescheduleReqs > 0 && ' and '}
                    {rescheduleReqs > 0 && `${rescheduleReqs} reschedule${rescheduleReqs > 1 ? 's' : ''}`}). 
                    Click here to review them.
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* ── Tabs ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 40, borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: 16 }}>
          <button 
            className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <TrendingUp size={18} /> Analytics
          </button>
          <button 
            className={`btn ${activeTab === 'bookings' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('bookings')}
            style={{ position: 'relative' }}
          >
            <Ticket size={18} /> Manage Bookings
            {bookings.filter(b => b.status === 'REFUND_REQUESTED' || b.status === 'RESCHEDULE_REQUESTED').length > 0 && activeTab === 'bookings' && (
              <span style={{ 
                position: 'absolute', top: -6, right: -6, background: 'var(--color-danger)', 
                color: 'white', borderRadius: '50%', width: 20, height: 20, fontSize: 12, 
                display: 'flex', alignItems: 'center', justifyContent: 'center' 
              }}>
                {bookings.filter(b => b.status === 'REFUND_REQUESTED' || b.status === 'RESCHEDULE_REQUESTED').length}
              </span>
            )}
          </button>
          <button 
            className={`btn ${activeTab === 'waitlist' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('waitlist')}
          >
            <List size={18} /> Waitlist
          </button>
          <button 
            className={`btn ${activeTab === 'inquiries' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('inquiries')}
          >
            <AlertCircle size={18} /> Inquiries
          </button>
          <button 
            className={`btn ${activeTab === 'seatmap' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('seatmap')}
          >
            <Map size={18} /> Seat Map
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div className="spinner spinner-lg" />
          </div>
        ) : activeTab === 'dashboard' ? (
          <>
            {/* ── Summary Stats ──────────────────────────────────────── */}
            <div className="admin-grid fade-up">
              <div className="glass-card stat-card">
                <div className="stat-value">LKR {totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                <div className="stat-label">Total Revenue (Confirmed)</div>
              </div>
              <div className="glass-card stat-card">
                <div className="stat-value">{totalBookings}</div>
                <div className="stat-label">Total Bookings</div>
              </div>
              <div className="glass-card stat-card">
                <div className="stat-value">
                  {totalSeats > 0 ? Math.round((activeBookings / totalSeats) * 100) : 0}%
                </div>
                <div className="stat-label">Current Occupancy Rate</div>
              </div>
              <div className="glass-card stat-card">
                <div className="stat-value">{totalSeats}</div>
                <div className="stat-label">Reserved Seats Managed</div>
              </div>
            </div>

            {/* ── Coach Occupancy ────────────────────────────────────── */}
            <h2 style={{ margin: '40px 0 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Users size={24} color="var(--color-primary)" /> Coach Occupancy
            </h2>
            <div className="admin-grid fade-up">
              {occupancy.map(coach => {
                const pct = coach.total_seats > 0
                  ? Math.round((coach.active_bookings / coach.total_seats) * 100)
                  : 0
                const color = pct > 80 ? 'var(--color-danger)' : pct > 50 ? 'var(--color-warning)' : 'var(--color-success)'
                return (
                  <div key={coach.coach_id} className="glass-card stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700 }}>Coach {coach.coach_name}</span>
                      <span className="badge badge-reserved">Reserved</span>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color }}>
                      {pct}%
                    </div>
                    <div className="stat-label">
                      {coach.active_bookings} / {coach.total_seats} active bookings
                    </div>
                    <div className="occ-bar-track" style={{ marginTop: 12 }}>
                      <div
                        className="occ-bar-fill"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${color}, ${color}88)`
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Revenue by Station Pair ────────────────────────────── */}
            <h2 style={{ margin: '40px 0 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <TrendingUp size={24} color="var(--color-primary)" /> Revenue by Route Segment
            </h2>
            <div className="glass-card fade-up" style={{ overflow: 'hidden' }}>
              {revenue.length === 0 ? (
                <div className="empty-state">
                  <div className="icon"><AlertCircle size={48} color="var(--color-text-muted)" /></div>
                  <h3>No revenue data yet</h3>
                  <p>Make some bookings to see revenue analytics here.</p>
                </div>
              ) : (
                <table className="revenue-table">
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>To</th>
                      <th>Bookings</th>
                      <th>Revenue (LKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenue.map((r, i) => (
                      <tr key={i}>
                        <td>{r.start_station_name}</td>
                        <td>{r.end_station_name}</td>
                        <td>{r.booking_count}</td>
                        <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                          {r.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : activeTab === 'bookings' ? (
          <div className="glass-card fade-up" style={{ overflow: 'hidden' }}>
            {bookings.length === 0 ? (
              <div className="empty-state">
                <div className="icon"><Ticket size={48} color="var(--color-text-muted)" /></div>
                <h3>No bookings found</h3>
                <p>There are currently no bookings in the system.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="revenue-table" style={{ minWidth: 800 }}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Passenger</th>
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
                          <div style={{ fontWeight: 600 }}>{b.passenger_name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{b.passenger_email}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>NIC: {b.passenger_nic}</div>
                        </td>
                        <td>{b.start_station.name} → {b.end_station.name}</td>
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
                          <div style={{ display: 'flex', gap: 8 }}>
                            {b.status === 'REFUND_REQUESTED' && (
                              <>
                                <button 
                                  className="btn btn-outline" 
                                  style={{ padding: '4px 8px', color: 'var(--color-success)', borderColor: 'rgba(39,174,96,0.3)', fontSize: '0.8rem' }}
                                  onClick={() => handleProcessCancellation(b.id, 'refund')}
                                  title="Approve Refund"
                                >
                                  <DollarSign size={14} style={{ marginRight: 4 }} /> Refund
                                </button>
                                <button 
                                  className="btn btn-outline" 
                                  style={{ padding: '4px 8px', color: 'var(--color-text-muted)', borderColor: 'rgba(255,255,255,0.1)', fontSize: '0.8rem' }}
                                  onClick={() => handleProcessCancellation(b.id, 'reject')}
                                  title="Reject Request"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {b.status === 'RESCHEDULE_REQUESTED' && (
                              <>
                                <button 
                                  className="btn btn-outline" 
                                  style={{ padding: '4px 8px', color: '#2d9cdb', borderColor: 'rgba(45,156,219,0.3)', fontSize: '0.8rem' }}
                                  onClick={() => setRescheduleModalBooking(b)}
                                  title="Approve and Reschedule"
                                >
                                  <RefreshCcw size={14} style={{ marginRight: 4 }} /> Process
                                </button>
                                <button 
                                  className="btn btn-outline" 
                                  style={{ padding: '4px 8px', color: 'var(--color-text-muted)', borderColor: 'rgba(255,255,255,0.1)', fontSize: '0.8rem' }}
                                  onClick={() => handleProcessCancellation(b.id, 'reject')}
                                  title="Reject Request"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {b.status === 'CANCEL_REQUESTED' && (
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '4px 8px', color: 'var(--color-danger)', borderColor: 'rgba(235,87,87,0.3)' }}
                                onClick={() => handleCancelBooking(b.id)}
                                title="Force Cancel"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'waitlist' ? (
          <div className="glass-card fade-up" style={{ overflow: 'hidden' }}>
            {waitlist.length === 0 ? (
              <div className="empty-state">
                <div className="icon"><List size={48} color="var(--color-text-muted)" /></div>
                <h3>No waitlist entries</h3>
                <p>There is no one currently on the waitlist.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="revenue-table" style={{ minWidth: 800 }}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Passenger</th>
                      <th>Route</th>
                      <th>Date</th>
                      <th>Target Seat</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitlist.map(w => (
                      <tr key={w.id}>
                        <td style={{ color: 'var(--color-text-muted)' }}>#{w.id}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{w.passenger_name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{w.passenger_email}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>NIC: {w.passenger_nic}</div>
                        </td>
                        <td>{w.start_station.name} → {w.end_station.name}</td>
                        <td>{w.travel_date}</td>
                        <td>Coach {w.seat.coach.name} - Seat {w.seat.seat_number}</td>
                        <td>
                          <span className={`badge ${w.status === 'CONFIRMED' ? 'badge-reserved' : 'badge-unreserved'}`} style={{ 
                            background: w.status === 'WAITLISTED' ? 'rgba(242, 153, 74, 0.1)' : undefined,
                            color: w.status === 'WAITLISTED' ? '#F2994A' : undefined,
                            border: w.status === 'WAITLISTED' ? '1px solid rgba(242, 153, 74, 0.2)' : undefined
                          }}>
                            {w.status}
                          </span>
                        </td>
                        <td>
                          {(() => {
                            const isExpired = new Date(w.travel_date) < new Date(new Date().toISOString().split('T')[0])
                            
                            return w.status === 'WAITLISTED' && (
                              <div style={{ display: 'flex', gap: 8 }}>
                                {!isExpired && (
                                  <button
                                    className="btn btn-secondary"
                                    style={{ padding: '4px 10px', color: 'var(--color-primary)', borderColor: 'rgba(245,166,35,0.3)', fontSize: '0.8rem' }}
                                    onClick={() => setAssignModalEntry(w)}
                                  >
                                    Assign Seat
                                  </button>
                                )}
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 10px', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.3)', fontSize: '0.8rem' }}
                                  onClick={() => handleCancelWaitlistEntry(w.id)}
                                >
                                  Cancel
                                </button>
                              </div>
                            )
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'inquiries' ? (
          <div className="glass-card fade-up" style={{ overflow: 'hidden' }}>
            {inquiries.length === 0 ? (
              <div className="empty-state">
                <div className="icon"><AlertCircle size={48} color="var(--color-text-muted)" /></div>
                <h3>No inquiries</h3>
                <p>There are no support inquiries submitted.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="revenue-table" style={{ minWidth: 800 }}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Submitter</th>
                      <th>Type / Ref</th>
                      <th>Message</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inquiries.map(iq => (
                      <tr key={iq.id}>
                        <td style={{ color: 'var(--color-text-muted)' }}>#{iq.id}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{iq.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{iq.email}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{iq.phone}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{iq.action_type}</div>
                          {iq.booking_id && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Ref: #{iq.booking_id}</div>}
                        </td>
                        <td style={{ maxWidth: 300 }}>
                          <p style={{ margin: 0, fontSize: '0.9rem' }}>{iq.message}</p>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                            {new Date(iq.created_at).toLocaleString()}
                          </div>
                        </td>
                        <td>
                          <span className="badge" style={{
                            background: iq.status === 'RESOLVED' ? 'rgba(34,197,94,0.1)' : iq.status === 'REJECTED' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                            color: iq.status === 'RESOLVED' ? 'var(--color-success)' : iq.status === 'REJECTED' ? 'var(--color-danger)' : 'var(--color-warning)',
                            border: `1px solid ${iq.status === 'RESOLVED' ? 'rgba(34,197,94,0.3)' : iq.status === 'REJECTED' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`
                          }}>
                            {iq.status}
                          </span>
                        </td>
                        <td>
                          {iq.status === 'PENDING' && (
                            <div style={{ display: 'flex', gap: 8 }}>
                              {iq.booking_id && (iq.action_type === 'Reschedule' || iq.action_type === 'Change Seat') && (
                                <button
                                  className="btn btn-primary"
                                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                  onClick={() => {
                                    setActiveInquiryId(iq.id)
                                    setRescheduleModalBooking(iq.booking!)
                                  }}
                                  title="Process Change"
                                >
                                  Process
                                </button>
                              )}
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '4px 8px', color: 'var(--color-success)', borderColor: 'rgba(39,174,96,0.3)', fontSize: '0.8rem' }}
                                onClick={() => handleUpdateInquiry(iq.id, 'RESOLVED')}
                                title="Mark as Resolved"
                              >
                                Resolve
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '4px 8px', color: 'var(--color-text-muted)', borderColor: 'rgba(255,255,255,0.1)', fontSize: '0.8rem' }}
                                onClick={() => handleUpdateInquiry(iq.id, 'REJECTED')}
                                title="Reject Inquiry"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="fade-up">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Map size={24} color="var(--color-primary)" /> Train Seat Map
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Train:</label>
                <select
                  className="form-input"
                  style={{ width: 'auto' }}
                  value={mapScheduleId || ''}
                  onChange={e => setMapScheduleId(Number(e.target.value) || null)}
                >
                  {mapSchedules.map(ts => (
                    <option key={ts.id} value={ts.id}>
                      #{ts.train_number} - {ts.train_name}
                    </option>
                  ))}
                  {mapSchedules.length === 0 && (
                    <option value="" disabled>No trains available</option>
                  )}
                </select>
                <label className="form-label" style={{ marginBottom: 0, marginLeft: 10 }}>Date:</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: 'auto' }}
                  value={mapDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setMapDate(e.target.value)}
                />
              </div>
            </div>
            
            <SeatMap
              seats={mapSeats}
              selectedSeatId={null}
              onSelect={() => {}}
            />
          </div>
        )}
      </div>

      {rescheduleModalBooking && (
        <AdminRescheduleModal 
          booking={rescheduleModalBooking} 
          onClose={() => {
            setRescheduleModalBooking(null)
            setActiveInquiryId(null)
          }}
          onSuccess={() => {
            setRescheduleModalBooking(null)
            if (activeInquiryId) {
              handleUpdateInquiry(activeInquiryId, 'RESOLVED')
              setActiveInquiryId(null)
            }
            loadBookings()
          }}
          addToast={addToast}
        />
      )}

      {assignModalEntry && (
        <AdminWaitlistAssignModal
          entry={assignModalEntry}
          onClose={() => setAssignModalEntry(null)}
          onSuccess={() => {
            setAssignModalEntry(null)
            loadWaitlist()
          }}
          addToast={addToast}
        />
      )}
    </main>
  )
}

export default AdminPage
