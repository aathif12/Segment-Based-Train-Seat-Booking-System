import React from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'
import AuthPage from './pages/AuthPage'
import MyBookingsPage from './pages/MyBookingsPage'
import { useToast, ToastContainer } from './components/Toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LogOut, User } from 'lucide-react'

const NavBar: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
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
          <NavLink to="/" end className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}>
            Book Tickets
          </NavLink>
          {user ? (
            <>
              <NavLink to="/my-bookings" className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}>
                My Bookings
              </NavLink>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 16, paddingLeft: 16, borderLeft: '1px solid rgba(0,0,0,0.1)' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}><User size={14} style={{ display: 'inline', marginRight: 4 }} />{user.name}</span>
                <button className="btn btn-outline btn-sm" onClick={handleLogout} style={{ padding: '4px 8px' }} title="Logout">
                  <LogOut size={16} />
                </button>
              </div>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}>
                Login
              </NavLink>
              <NavLink to="/register" className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}>
                Register
              </NavLink>
            </>
          )}
          <NavLink to="/admin" className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`} style={{ marginLeft: user ? 0 : 16 }}>
            Admin
          </NavLink>
        </div>
      </div>
    </nav>
  )
}

const App: React.FC = () => {
  const { toasts, addToast } = useToast()

  return (
    <AuthProvider>
      <NavBar />
      <Routes>
        <Route path="/" element={<HomePage addToast={addToast} />} />
        <Route path="/admin" element={<AdminPage addToast={addToast} />} />
        <Route path="/login" element={<AuthPage addToast={addToast} />} />
        <Route path="/register" element={<AuthPage addToast={addToast} isRegister />} />
        <Route path="/my-bookings" element={<MyBookingsPage addToast={addToast} />} />
      </Routes>
      <ToastContainer toasts={toasts} />
    </AuthProvider>
  )
}

export default App
