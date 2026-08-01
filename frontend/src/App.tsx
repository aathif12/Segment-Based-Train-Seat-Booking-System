import React from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'
import { useToast, ToastContainer } from './components/Toast'

const App: React.FC = () => {
  const { toasts, addToast } = useToast()

  return (
    <>
      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <nav className="navbar">
        <div className="container navbar-inner">
          <div className="navbar-brand">
            <span className="brand-dot" />
            LFS Railway
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 4 }}>
              Colombo Fort – Badulla
            </span>
          </div>
          <div className="navbar-links">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
            >
              Book Tickets
            </NavLink>
            <NavLink
              to="/admin"
              className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
            >
              Admin
            </NavLink>
          </div>
        </div>
      </nav>

      {/* ── Routes ──────────────────────────────────────────────────── */}
      <Routes>
        <Route path="/" element={<HomePage addToast={addToast} />} />
        <Route path="/admin" element={<AdminPage addToast={addToast} />} />
      </Routes>

      {/* ── Toasts ──────────────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} />
    </>
  )
}

export default App
