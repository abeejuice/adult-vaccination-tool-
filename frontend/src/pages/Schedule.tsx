import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SCHEDULE_PAGES = [52, 53, 54]

export default function Schedule() {
  const navigate = useNavigate()
  const [pageIndex, setPageIndex] = useState(0)

  const pageNum = SCHEDULE_PAGES[pageIndex]
  const padded = String(pageNum).padStart(3, '0')

  return (
    <div className="schedule-container">
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Back to Home</button>
        <button className="schedule-btn" onClick={() => navigate('/chat')}>Ask AI ✦</button>
      </div>

      <h1 className="detail-title">Age-wise Vaccination Recommendation Chart</h1>
      <p className="schedule-subtitle">
        Indian Consensus Guidelines on Adult Immunization 2026 · Page {pageNum}
      </p>

      <div className="legend-row" style={{ marginBottom: '1rem' }}>
        <span className="legend-item">
          <span style={{ background: '#16a34a', color: '#fff', padding: '1px 8px', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 700 }}>R</span>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Recommended</span>
        </span>
        <span className="legend-item">
          <span style={{ background: '#2563eb', color: '#fff', padding: '1px 8px', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 700 }}>BR</span>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>May be considered</span>
        </span>
        <span className="legend-item">
          <span style={{ background: '#d97706', color: '#fff', padding: '1px 8px', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 700 }}>AR</span>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>With additional risk</span>
        </span>
        <span className="legend-item">
          <span style={{ background: '#dc2626', color: '#fff', padding: '1px 8px', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 700 }}>NR</span>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Not Recommended</span>
        </span>
      </div>

      <div className="schedule-img-container">
        <img
          src={`/images/page_${padded}.png`}
          alt={`Schedule Page ${pageNum}`}
          className="schedule-img"
        />
      </div>

      <div className="page-nav" style={{ marginTop: '1rem' }}>
        <button
          className="page-nav-btn"
          onClick={() => setPageIndex(i => Math.max(0, i - 1))}
          disabled={pageIndex === 0}
        >
          ← Prev
        </button>
        <span className="page-nav-info">
          Page {pageNum} ({pageIndex + 1}/{SCHEDULE_PAGES.length})
        </span>
        <button
          className="page-nav-btn"
          onClick={() => setPageIndex(i => Math.min(SCHEDULE_PAGES.length - 1, i + 1))}
          disabled={pageIndex === SCHEDULE_PAGES.length - 1}
        >
          Next →
        </button>
      </div>
    </div>
  )
}
