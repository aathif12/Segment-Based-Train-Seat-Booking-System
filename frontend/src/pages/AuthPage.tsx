import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginUser, registerUser } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { ToastType } from '../components/Toast'
import { User, LogIn, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface AuthPageProps {
  addToast: (msg: string, type?: ToastType) => void
  isRegister?: boolean
}

const AuthPage: React.FC<AuthPageProps> = ({ addToast, isRegister = false }) => {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isRegister) {
        const res = await registerUser({ name, email, password })
        login(res.token, res.user)
        addToast('Account created successfully!', 'success')
      } else {
        const res = await loginUser({ email, password })
        login(res.token, res.user)
        addToast('Logged in successfully!', 'success')
      }
      navigate('/my-bookings')
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Authentication failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: '80px 0', display: 'flex', justifyContent: 'center' }}>
      <div className="glass-card" style={{ maxWidth: 400, width: '100%', padding: '40px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ background: 'var(--color-primary-light)', padding: 16, borderRadius: '50%', color: 'var(--color-primary)' }}>
            <User size={32} />
          </div>
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: 30 }}>
          {isRegister ? t('auth.registerTitle') : t('auth.loginTitle')}
        </h2>
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label">{t('auth.name')}</label>
              <input 
                type="text" 
                className="form-input" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">{t('auth.email')}</label>
            <input 
              type="email" 
              className="form-input" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group" style={{ marginBottom: 30 }}>
            <label className="form-label">{t('auth.password')}</label>
            <input 
              type="password" 
              className="form-input" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              minLength={6}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? '...' : (
              isRegister ? <><UserPlus size={18} /> {t('auth.registerBtn')}</> : <><LogIn size={18} /> {t('auth.loginBtn')}</>
            )}
          </button>
        </form>
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.9rem' }}>
          {isRegister ? (
            <>{t('auth.hasAccount')} <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>{t('auth.loginBtn')}</Link></>
          ) : (
            <>{t('auth.noAccount')} <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>{t('auth.registerBtn')}</Link></>
          )}
        </div>
      </div>
    </main>
  )
}

export default AuthPage
