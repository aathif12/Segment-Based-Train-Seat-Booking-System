import React, { useEffect, useState } from 'react'
import { fetchOccupancy, fetchRevenue } from '../api/client'
import type { CoachOccupancy, RevenueRecord } from '../api/client'
import type { ToastType } from '../components/Toast'

interface AdminPageProps {
  addToast: (msg: string, type?: ToastType) => void
}

const AdminPage: React.FC<AdminPageProps> = ({ addToast }) => {
  const [occupancy, setOccupancy] = useState<CoachOccupancy[]>([])
  const [revenue, setRevenue] = useState<RevenueRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchOccupancy(), fetchRevenue()])
      .then(([occ, rev]) => {
        setOccupancy(occ ?? [])
        setRevenue(rev ?? [])
      })
      .catch(() => addToast('Failed to load admin data', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const totalRevenue = revenue.reduce((sum, r) => sum + r.total_revenue, 0)
  const totalBookings = revenue.reduce((sum, r) => sum + r.booking_count, 0)
  const totalSeats = occupancy.reduce((sum, o) => sum + o.total_seats, 0)
  const activeBookings = occupancy.reduce((sum, o) => sum + o.active_bookings, 0)

  return (
    <main style={{ padding: '48px 0' }}>
      <div className="container">
        <div className="fade-up">
          <div className="hero-eyebrow" style={{ marginBottom: 12 }}>
            <span>⚙️</span> Department Operations View
          </div>
          <h1 style={{ marginBottom: 8 }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 40 }}>
            Live occupancy and revenue analytics for the Colombo Fort–Badulla line.
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div className="spinner spinner-lg" />
          </div>
        ) : (
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
            <h2 style={{ margin: '40px 0 20px' }}>Coach Occupancy</h2>
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
            <h2 style={{ margin: '40px 0 20px' }}>Revenue by Route Segment</h2>
            <div className="glass-card fade-up" style={{ overflow: 'hidden' }}>
              {revenue.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">📊</div>
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
        )}
      </div>
    </main>
  )
}

export default AdminPage
