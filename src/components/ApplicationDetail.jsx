import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  ArrowLeft, Building, User, MapPin, FileText,
  Calendar, CheckCircle, XCircle, Clock, Shield,
  ExternalLink, AlertCircle, ClipboardCheck
} from 'lucide-react'

export default function ApplicationDetail({ admin }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [staffNotes, setStaffNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    fetchApplication()
  }, [id])

  const fetchApplication = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_application', {
        p_admin_id: admin.id,
        p_application_id: id
      })

      if (error) throw error

      if (data?.success) {
        setApplication(data.application)
        if (data.application.staff_notes) {
          setStaffNotes(data.application.staff_notes)
        }
      } else {
        setMessage({ type: 'error', text: data?.error || 'Application not found' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (status) => {
    if (!staffNotes.trim()) {
      setMessage({ type: 'error', text: 'Please provide your verification notes before submitting.' })
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.rpc('admin_review_application', {
        p_admin_id: admin.id,
        p_application_id: id,
        p_status: status,
        p_staff_notes: staffNotes.trim()
      })

      if (error) throw error

      if (data?.success) {
        setMessage({
          type: 'success',
          text: `Application ${status === 'approved' ? 'verified' : 'rejected'} successfully!`
        })
        // Refresh application data
        fetchApplication()
      } else {
        setMessage({ type: 'error', text: data?.error || 'Failed to update application' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isImage = (url) => {
    if (!url) return false
    const ext = url.split('.').pop()?.toLowerCase().split('?')[0]
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading application...</p>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="detail-page">
        <button className="back-link" onClick={() => navigate('/applications')}>
          <ArrowLeft size={18} /> Back to Applications
        </button>
        <div className="empty-state">
          <AlertCircle size={48} />
          <h3>Application not found</h3>
          <p>The application you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="detail-page">
      <button className="back-link" onClick={() => navigate('/applications')}>
        <ArrowLeft size={18} /> Back to Applications
      </button>

      <div className="detail-header">
        <h1>{application.business_name}</h1>
        <span className={`status-badge ${application.status}`}>
          {application.status === 'approved' && <CheckCircle size={14} />}
          {application.status === 'rejected' && <XCircle size={14} />}
          {application.status === 'pending' && <Clock size={14} />}
          {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
        </span>
      </div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="detail-grid">
        {/* Left Column: Application Info */}
        <div>
          <div className="detail-card">
            <h2><Building size={18} /> Business Information</h2>
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">Business Name</span>
                <span className="info-value">{application.business_name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Owner Name</span>
                <span className="info-value">{application.owner_name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Business Address</span>
                <span className="info-value">{application.address}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Submitted On</span>
                <span className="info-value">{formatDate(application.created_at)}</span>
              </div>
              {application.reviewed_at && (
                <div className="info-row">
                  <span className="info-label">Reviewed On</span>
                  <span className="info-value">{formatDate(application.reviewed_at)}</span>
                </div>
              )}
              {application.admin_reviewer && (
                <div className="info-row">
                  <span className="info-label">Reviewed By</span>
                  <span className="info-value">{application.admin_reviewer}</span>
                </div>
              )}
            </div>

            {/* Certificate Section */}
            <div className="certificate-section">
              <h2 style={{ marginBottom: 8 }}><FileText size={18} /> Business Certificate</h2>
              {application.certificate_url ? (
                <>
                  {isImage(application.certificate_url) ? (
                    <div className="certificate-preview">
                      <img
                        src={application.certificate_url}
                        alt="Business Certificate"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.nextSibling.style.display = 'flex'
                        }}
                      />
                      <div className="empty-state" style={{ display: 'none', padding: 30 }}>
                        <AlertCircle size={32} />
                        <p>Unable to load certificate image</p>
                      </div>
                    </div>
                  ) : null}
                  <a
                    href={application.certificate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="certificate-link"
                  >
                    <ExternalLink size={16} />
                    Open Certificate in New Tab
                  </a>
                </>
              ) : (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                  No certificate uploaded
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Review Panel */}
        <div>
          <div className="detail-card">
            <h2><ClipboardCheck size={18} /> Review Application</h2>

            {/* Show previous review if exists */}
            {application.status !== 'pending' && application.staff_notes && (
              <div className={`previous-review ${application.status}`}>
                <div className="review-status-text">
                  {application.status === 'approved' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  Application {application.status === 'approved' ? 'Verified' : 'Rejected'}
                </div>
                {application.admin_reviewer && (
                  <div className="review-meta">
                    By {application.admin_reviewer} on {formatDate(application.reviewed_at)}
                  </div>
                )}
                <div className="review-notes">{application.staff_notes}</div>
              </div>
            )}

            <div className="review-panel">
              <div className="form-group">
                <label htmlFor="staff-notes" style={{ marginBottom: 4 }}>
                  {application.status === 'pending'
                    ? 'Verification Notes'
                    : 'Update Review Notes'}
                </label>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 10 }}>
                  Describe the verifications you performed and your reasoning for the decision.
                </p>
                <textarea
                  id="staff-notes"
                  className="review-textarea"
                  value={staffNotes}
                  onChange={(e) => setStaffNotes(e.target.value)}
                  placeholder="e.g., Verified business certificate matches registration records. Confirmed address via online search. Owner identity verified through provided documentation..."
                />
              </div>

              <div className="review-actions">
                <button
                  className="btn-success"
                  onClick={() => handleReview('approved')}
                  disabled={submitting}
                >
                  <CheckCircle size={18} />
                  {submitting ? 'Processing...' : 'Verify Application'}
                </button>
                <button
                  className="btn-danger"
                  onClick={() => handleReview('rejected')}
                  disabled={submitting}
                >
                  <XCircle size={18} />
                  {submitting ? 'Processing...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
