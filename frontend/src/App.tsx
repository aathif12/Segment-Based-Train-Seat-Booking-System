import React from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'
import AuthPage from './pages/AuthPage'
import MyBookingsPage from './pages/MyBookingsPage'
import InquiriesPage from './pages/InquiriesPage'
import ProfilePage from './pages/ProfilePage'
import { useToast, ToastContainer } from './components/Toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LogOut, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const NavBar: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <div className="navbar-brand" style={{ whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <span className="brand-dot" />
          Ceylon Railways
        </div>
        <div className="navbar-links" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
          <NavLink to="/" end className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}>
            {t('nav.bookTickets')}
          </NavLink>
          <NavLink to="/inquiries" className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}>
            {t('nav.inquiries')}
          </NavLink>
          {user ? (
            <>
              <NavLink to="/my-bookings" className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}>
                {t('nav.myBookings')}
              </NavLink>
              <NavLink to="/profile" className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}>
                My Profile
              </NavLink>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 16, paddingLeft: 16, borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <User size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                  {user.name}
                </span>
                <button className="btn btn-outline btn-sm" onClick={handleLogout} style={{ padding: '4px 8px' }} title={t('nav.logout')}>
                  <LogOut size={16} />
                </button>
              </div>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}>
                {t('nav.login')}
              </NavLink>
              <NavLink to="/register" className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}>
                {t('nav.register')}
              </NavLink>
            </>
          )}
          <NavLink to="/admin" className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`} style={{ marginLeft: user ? 0 : 16 }}>
            {t('nav.admin')}
          </NavLink>

          <select 
            className="form-select" 
            style={{ width: 'auto', padding: '4px 28px 4px 8px', marginLeft: 16, minHeight: 32, fontSize: '0.85rem' }}
            value={i18n.language} 
            onChange={(e) => i18n.changeLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="ta">தமிழ்</option>
            <option value="si">සිංහල</option>
          </select>
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
        <Route path="/inquiries" element={<InquiriesPage />} />
        <Route path="/profile" element={
          <AuthProfileWrapper addToast={addToast} />
        } />
      </Routes>
      <ToastContainer toasts={toasts} />
    </AuthProvider>
  )
}

const AuthProfileWrapper = ({ addToast }: { addToast: any }) => {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()
  
  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <ProfilePage 
      user={user} 
      addToast={addToast} 
      updateUser={updateUser} 
      onNavigateHome={() => navigate('/')} 
      onLogout={() => { logout(); navigate('/') }} 
    />
  )
}

export default App
