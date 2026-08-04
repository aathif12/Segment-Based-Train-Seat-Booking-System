import React, { useEffect, useState } from 'react'
import { User as UserIcon, Save, ArrowLeft } from 'lucide-react'
import { fetchMyProfile, updateMyProfile, User } from '../api/client'
import type { ToastType } from '../components/Toast'

interface ProfilePageProps {
  user: User
  onLogout: () => void
  addToast: (msg: string, type?: ToastType) => void
  updateUser: (u: User) => void
  onNavigateHome: () => void
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, addToast, updateUser, onNavigateHome, onLogout }) => {
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone || '')
  const [nic, setNic] = useState(user.nic || '')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    fetchMyProfile()
      .then(profile => {
        setName(profile.name)
        setPhone(profile.phone || '')
        setNic(profile.nic || '')
        updateUser(profile) // Update global state
      })
      .catch(() => addToast('Failed to load profile details', 'error'))
      .finally(() => setFetching(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await updateMyProfile({ name, phone, nic })
      updateUser(res.data)
      addToast(res.message || 'Profile updated successfully', 'success')
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to update profile', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <main style={{ padding: '80px 0', display: 'flex', justifyContent: 'center' }}>
        <div className="spinner spinner-lg" />
      </main>
    )
  }

  return (
    <main style={{ padding: '48px 0', display: 'flex', justifyContent: 'center' }}>
      <div className="glass-card fade-up" style={{ maxWidth: 500, width: '100%', padding: '40px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <button 
            className="btn btn-outline" 
            style={{ padding: '8px', border: 'none' }}
            onClick={onNavigateHome}
            title="Back to Home"
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ background: 'var(--color-primary-light)', padding: 16, borderRadius: '50%', color: 'var(--color-primary)' }}>
            <UserIcon size={32} />
          </div>
          <div style={{ width: 36 }} /> {/* Spacer */}
        </div>

        <h2 style={{ textAlign: 'center', marginBottom: 10 }}>My Profile</h2>
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: 30, fontSize: '0.9rem' }}>
          Update your details. These will be pre-filled when you make a booking.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              value={user.email} 
              disabled 
              style={{ opacity: 0.7, cursor: 'not-allowed' }}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              Email cannot be changed.
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input 
              type="text" 
              className="form-input" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              placeholder="e.g. 0771234567"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 30 }}>
            <label className="form-label">NIC (National Identity Card)</label>
            <input 
              type="text" 
              className="form-input" 
              value={nic} 
              onChange={e => setNic(e.target.value)} 
              placeholder="e.g. 199912345678 or 991234567V"
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Saving...' : <><Save size={18} /> Save Changes</>}
            </button>
          </div>
        </form>

        <div style={{ marginTop: 40, borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: 20, textAlign: 'center' }}>
          <button 
            className="btn btn-outline" 
            style={{ width: '100%', color: 'var(--color-danger)', borderColor: 'rgba(235,87,87,0.3)' }}
            onClick={onLogout}
          >
            Log Out
          </button>
        </div>
      </div>
    </main>
  )
}

export default ProfilePage
