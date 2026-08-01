import React, { useEffect, useState } from 'react'
import { Settings, LogIn, TrendingUp, Users, AlertCircle, Trash2, Ticket, LogOut, List } from 'lucide-react'
import { fetchOccupancy, fetchRevenue, fetchBookings, fetchWaitlist, setAuthCredentials, adminCancelBooking } from '../api/client'
import type { CoachOccupancy, RevenueRecord, Booking, WaitlistEntry } from '../api/client'
import type { ToastType } from '../components/Toast'

interface AdminPageProps {
  addToast: (msg: string, type?: ToastType) => void
}

const AdminPage: React.FC<AdminPageProps> = ({ addToast }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'waitlist'>('dashboard')
  
  const [occupancy, setOccupancy] = useState<CoachOccupancy[]>([])
  const [revenue, setRevenue] = useState<RevenueRecord[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(false)

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

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true)
      if (activeTab === 'dashboard') {
        loadDashboardData().finally(() => setLoading(false))
      } else if (activeTab === 'bookings') {
        loadBookings().finally(() => setLoading(false))
      } else {
        loadWaitlist().finally(() => setLoading(false))
      }
    }
  }, [isAuthenticated, activeTab])

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
    if (!window.confirm('Are you sure you want to cancel this booking?')) return
    try {
      await adminCancelBooking(id)
      addToast('Booking cancelled successfully', 'success')
      loadBookings() // refresh list
    } catch {
      addToast('Failed to cancel booking', 'error')
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
          >
            <Ticket size={18} /> Manage Bookings
          </button>
          <button 
            className={`btn ${activeTab === 'waitlist' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('waitlist')}
          >
            <List size={18} /> Waitlist
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
                        </td>
                        <td>{b.start_station.name} → {b.end_station.name}</td>
                        <td>Coach {b.seat.coach.name} - Seat {b.seat.seat_number}</td>
                        <td>
                          <span className={`badge ${b.status === 'CONFIRMED' ? 'badge-reserved' : 'badge-unreserved'}`} style={{ 
                            background: b.status === 'CANCELLED' ? 'rgba(235, 87, 87, 0.1)' : undefined,
                            color: b.status === 'CANCELLED' ? 'var(--color-danger)' : undefined,
                            border: b.status === 'CANCELLED' ? '1px solid rgba(235, 87, 87, 0.2)' : undefined
                          }}>
                            {b.status}
                          </span>
                        </td>
                        <td>
                          {b.status === 'CONFIRMED' && (
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '6px 12px', color: 'var(--color-danger)', borderColor: 'rgba(235,87,87,0.3)' }}
                              onClick={() => handleCancelBooking(b.id)}
                            >
                              <Trash2 size={16} />
                            </button>
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
                      <th>Target Seat</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitlist.map(w => (
                      <tr key={w.id}>
                        <td style={{ color: 'var(--color-text-muted)' }}>#{w.id}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{w.passenger_name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{w.passenger_email}</div>
                        </td>
                        <td>{w.start_station.name} → {w.end_station.name}</td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

export default AdminPage
