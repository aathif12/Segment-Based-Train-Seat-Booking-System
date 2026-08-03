import React, { useState } from 'react'
import { createInquiry } from '../api/client'
import { MessageSquare, Send } from 'lucide-react'

const InquiriesPage: React.FC = () => {
  const [bookingId, setBookingId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [actionType, setActionType] = useState('General')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccess(false)

    try {
      await createInquiry({
        booking_id: bookingId ? parseInt(bookingId, 10) : undefined,
        name,
        email,
        phone,
        action_type: actionType,
        message,
      })
      setSuccess(true)
      // reset fields
      setBookingId('')
      setName('')
      setEmail('')
      setPhone('')
      setActionType('General')
      setMessage('')
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to submit inquiry')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ padding: '60px 24px', maxWidth: 800 }}>
      <div className="glass-card" style={{ padding: '40px', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ background: 'var(--color-surface)', padding: 12, borderRadius: '50%', color: 'var(--color-primary)' }}>
            <MessageSquare size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', marginBottom: 4 }}>Support Inquiries</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
              Need help with a booking? Submit a request below and our team will get back to you.
            </p>
          </div>
        </div>

        {success && (
          <div style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--color-success)', padding: '16px', borderRadius: 8, marginBottom: 24, border: '1px solid rgba(34,197,94,0.3)' }}>
            <strong>Success!</strong> Your inquiry has been submitted. We will contact you soon.
          </div>
        )}

        {errorMsg && (
          <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', padding: '16px', borderRadius: 8, marginBottom: 24, border: '1px solid rgba(239,68,68,0.3)' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="booking-id">Booking Reference / ID (Optional)</label>
            <input
              id="booking-id"
              className="form-input"
              type="number"
              placeholder="e.g. 1024"
              value={bookingId}
              onChange={e => setBookingId(e.target.value)}
              disabled={loading}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full Name</label>
              <input
                id="name"
                className="form-input"
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                className="form-input"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                className="form-input"
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="action-type">Request Type</label>
              <select
                id="action-type"
                className="form-select"
                value={actionType}
                onChange={e => setActionType(e.target.value)}
                disabled={loading}
              >
                <option value="General">General Inquiry</option>
                <option value="Refund">Request Refund</option>
                <option value="Reschedule">Request Reschedule</option>
                <option value="Change Seat">Change Seat</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="message">Message / Details</label>
            <textarea
              id="message"
              className="form-input"
              rows={5}
              required
              value={message}
              onChange={e => setMessage(e.target.value)}
              disabled={loading}
              style={{ resize: 'vertical' }}
              placeholder="Please provide details about your request..."
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
            {loading ? 'Submitting...' : <><Send size={16} /> Submit Inquiry</>}
          </button>
        </form>
      </div>
    </div>
  )
}

export default InquiriesPage
