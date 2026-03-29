import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import vaccinesData from '../data/vaccines.json'
import { spring, springBounce, springEntrance, slideLeft } from '../lib/motion'

type Vaccine = typeof vaccinesData.vaccines[number]

const BADGE_CONFIG: Record<string, { bg: string; label: string }> = {
  R:  { bg: '#16a34a', label: 'Recommended' },
  BR: { bg: '#2563eb', label: 'May be considered' },
  AR: { bg: '#d97706', label: 'With additional risk' },
  NR: { bg: '#dc2626', label: 'Not Recommended' },
}

const COLUMN_LABELS: Record<string, string> = {
  adults_18_49:      '18–49 yrs',
  elderly_50plus:    '≥50 yrs',
  pregnancy:         'Pregnancy',
  at_risk:           'At-Risk',
  high_risk_immuno:  'High-Risk / Immuno',
  lifestyle:         'Lifestyle',
  special_situations:'Special / HCW',
  adolescents_12_18: '12–18 yrs',
}

function RecommendationGrid({ recommendations }: { recommendations: Record<string, string> }) {
  return (
    <div className="rec-grid">
      {Object.entries(COLUMN_LABELS).map(([key, label], i) => {
        const level = recommendations[key] || 'NR'
        const cfg = BADGE_CONFIG[level] || BADGE_CONFIG['NR']
        return (
          <motion.div
            key={key}
            className="rec-cell"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...springEntrance, delay: i * 0.05 }}
          >
            <div className="rec-badge" style={{ background: cfg.bg, color: '#fff' }}>{level}</div>
            <div className="rec-label">{label}</div>
          </motion.div>
        )
      })}
    </div>
  )
}

function KeyFact({ label, value, index }: { label: string; value: string; index: number }) {
  return (
    <motion.div
      className="key-fact"
      variants={slideLeft}
      initial="initial"
      animate="animate"
      transition={{ ...springEntrance, delay: index * 0.04 }}
    >
      <span className="key-fact-label">{label}</span>
      <span className="key-fact-value">{value}</span>
    </motion.div>
  )
}

function PageViewer({ pages }: { pages: number[] }) {
  const [index, setIndex] = useState(0)
  if (!pages || pages.length === 0) return null

  const pageNum = pages[index]
  const url = `/images/page_${String(pageNum).padStart(3, '0')}.png`

  return (
    <div className="page-viewer">
      <AnimatePresence mode="wait">
        <motion.img
          key={pageNum}
          src={url}
          alt={`Guideline Page ${pageNum}`}
          className="page-img"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        />
      </AnimatePresence>
      <div className="page-nav">
        {pages.length > 1 && (
          <motion.button
            className="page-nav-btn"
            onClick={() => setIndex(i => Math.max(0, i - 1))}
            disabled={index === 0}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={spring}
          >
            ← Prev
          </motion.button>
        )}
        <span className="page-nav-info">
          Page {pageNum}{pages.length > 1 ? ` (${index + 1}/${pages.length})` : ''}
        </span>
        {pages.length > 1 && (
          <motion.button
            className="page-nav-btn"
            onClick={() => setIndex(i => Math.min(pages.length - 1, i + 1))}
            disabled={index === pages.length - 1}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={spring}
          >
            Next →
          </motion.button>
        )}
      </div>
    </div>
  )
}

export default function VaccineDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [favorited, setFavorited] = useState(() => {
    const favs = JSON.parse(localStorage.getItem('vax-favorites') || '[]') as string[]
    return favs.includes(id || '')
  })

  const vaccine = vaccinesData.vaccines.find(v => v.id === id) as Vaccine | undefined

  if (!vaccine) {
    return (
      <div className="detail-container">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <p style={{ color: '#ef4444', padding: '2rem' }}>Vaccine not found.</p>
      </div>
    )
  }

  const toggleFavorite = () => {
    const favs = JSON.parse(localStorage.getItem('vax-favorites') || '[]') as string[]
    const adding = !favorited
    const updated = adding ? [...favs, vaccine.id] : favs.filter(f => f !== vaccine.id)
    localStorage.setItem('vax-favorites', JSON.stringify(updated))
    setFavorited(adding)
    if (adding) {
      toast.success(`${vaccine.name} bookmarked ★`, { duration: 2500 })
    } else {
      toast(`Removed from bookmarks`, { duration: 2000 })
    }
  }

  const recs = vaccine.recommendations as Record<string, string>

  return (
    <div className="detail-container">
      <div className="detail-header">
        <motion.button
          className="back-btn"
          onClick={() => navigate('/')}
          whileHover={{ x: -3, scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          transition={spring}
        >
          ← Back
        </motion.button>
        <motion.button
          className="schedule-btn"
          onClick={() => navigate('/chat')}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          transition={spring}
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
        >
          Ask AI ✦
        </motion.button>
        <motion.button
          className={`fav-btn ${favorited ? 'active' : ''}`}
          onClick={toggleFavorite}
          whileTap={{ scale: 0.75 }}
          animate={{ scale: favorited ? [1, 1.2, 1] : 1 }}
          transition={favorited ? { ...springBounce, duration: 0.4 } : spring}
          title={favorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          {favorited ? '★' : '☆'}
        </motion.button>
      </div>

      <motion.h1
        className="detail-title"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springEntrance, delay: 0.05 }}
      >
        {vaccine.name}
      </motion.h1>

      {/* Recommendation Matrix */}
      <motion.section
        className="detail-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08 }}
      >
        <h2 className="detail-section-title">Recommendation by Patient Group</h2>
        <RecommendationGrid recommendations={recs} />
        <div className="legend-row" style={{ marginTop: '0.75rem' }}>
          {Object.entries(BADGE_CONFIG).map(([k, v]) => (
            <span key={k} className="legend-item">
              <span style={{ background: v.bg, color: '#fff', padding: '1px 6px', borderRadius: '3px', fontSize: '0.7rem', fontWeight: 700 }}>{k}</span>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{v.label}</span>
            </span>
          ))}
        </div>
      </motion.section>

      {/* Key Facts */}
      <motion.section className="detail-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <h2 className="detail-section-title">Key Facts</h2>
        <div className="key-facts-grid">
          {[
            { label: 'Schedule', value: vaccine.schedule },
            { label: 'Doses', value: vaccine.doses },
            { label: 'Route', value: vaccine.route },
            { label: 'Dose Volume', value: vaccine.dose_volume },
            ...(vaccine.booster ? [{ label: 'Booster', value: vaccine.booster }] : []),
          ].map((f, i) => (
            <KeyFact key={f.label} label={f.label} value={f.value} index={i} />
          ))}
        </div>
      </motion.section>

      {/* Formulations */}
      {vaccine.formulations?.length > 0 && (
        <motion.section className="detail-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.14 }}>
          <h2 className="detail-section-title">Formulations Available</h2>
          <ul className="detail-list">
            {vaccine.formulations.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </motion.section>
      )}

      {/* Contraindications */}
      {vaccine.contraindications?.length > 0 && (
        <motion.section className="detail-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.16 }}>
          <h2 className="detail-section-title contraindication-title">Contraindications</h2>
          <ul className="detail-list contraindication-list">
            {vaccine.contraindications.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </motion.section>
      )}

      {/* Precautions */}
      {vaccine.precautions?.length > 0 && (
        <motion.section className="detail-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}>
          <h2 className="detail-section-title">Precautions & Key Considerations</h2>
          <ul className="detail-list">
            {vaccine.precautions.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </motion.section>
      )}

      {/* Special Populations */}
      {vaccine.special_populations && Object.keys(vaccine.special_populations).length > 0 && (
        <motion.section className="detail-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <h2 className="detail-section-title">Special Populations</h2>
          <div className="special-pops-grid">
            {Object.entries(vaccine.special_populations as unknown as Record<string, string>).map(([pop, note], i) => (
              <motion.div
                key={pop}
                className="special-pop-card"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springEntrance, delay: 0.2 + i * 0.05 }}
              >
                <div className="special-pop-label">{pop.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                <div className="special-pop-note">{note}</div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Guideline Pages */}
      {vaccine.pages?.length > 0 && (
        <motion.section className="detail-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22 }}>
          <h2 className="detail-section-title">Guideline Reference</h2>
          <PageViewer pages={vaccine.pages as number[]} />
        </motion.section>
      )}
    </div>
  )
}
