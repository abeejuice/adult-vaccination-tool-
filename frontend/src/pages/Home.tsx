import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import Fuse from 'fuse.js'
import vaccinesData from '../data/vaccines.json'
import VaccineDrawer from '../components/VaccineDrawer'
import { spring, springBounce, springEntrance, staggerContainer, fadeUp, scalePop } from '../lib/motion'
import galenWordmark from '../assets/galenai-full-logo.svg'

type Vaccine = typeof vaccinesData.vaccines[number]

const PATIENT_FILTERS = [
  { key: 'adults_18_49',    label: '18–49 yrs (General)' },
  { key: 'elderly_50plus',  label: '≥50 Years' },
  { key: 'pregnancy',       label: 'Pregnancy' },
  { key: 'at_risk',         label: 'At-Risk (DM, Heart, Liver, Lung)' },
  { key: 'high_risk_immuno',label: 'High-Risk / Immunocompromised' },
  { key: 'lifestyle',       label: 'Lifestyle-Related' },
  { key: 'special_situations', label: 'Special Situations (HCW, Travel)' },
]

const COMORBIDITY_CHIPS = [
  { key: 'diabetes',         label: 'Diabetes' },
  { key: 'heart_disease',    label: 'Heart Disease' },
  { key: 'ckd',              label: 'CKD / Dialysis' },
  { key: 'liver_disease',    label: 'Cirrhosis / Liver' },
  { key: 'hiv',              label: 'HIV' },
  { key: 'immunocompromised',label: 'Immunocompromised' },
  { key: 'asplenia',         label: 'Asplenia' },
  { key: 'pregnancy',        label: 'Pregnancy' },
  { key: 'healthcare_workers',label: 'Healthcare Worker' },
  { key: 'elderly',          label: 'Elderly (≥50 yrs)' },
  { key: 'travel',           label: 'Travel' },
]

const QUICK_VACCINES = ['influenza', 'covid19', 'pneumococcal', 'hepatitis_b', 'hpv', 'tdap_td', 'zoster']

const BADGE_CONFIG: Record<string, { bg: string }> = {
  R:  { bg: '#16a34a' },
  BR: { bg: '#2563eb' },
  AR: { bg: '#d97706' },
  NR: { bg: '#dc2626' },
}

const fuse = new Fuse(vaccinesData.vaccines, {
  keys: [{ name: 'name', weight: 2 }, { name: 'aliases', weight: 1.5 }, { name: 'indications', weight: 1 }],
  threshold: 0.35,
})

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return mobile
}

function RecommendationBadge({ level }: { level: string }) {
  const cfg = BADGE_CONFIG[level]
  if (!cfg || level === 'NR') return null
  return (
    <motion.span
      variants={scalePop}
      initial="initial"
      animate="animate"
      transition={springBounce}
      style={{
        background: cfg.bg,
        color: '#fff',
        fontSize: '0.7rem',
        fontWeight: 700,
        padding: '2px 7px',
        borderRadius: '4px',
        letterSpacing: '0.03em',
        display: 'inline-block',
      }}
    >
      {level}
    </motion.span>
  )
}

function VaccineCard({
  vaccine,
  filterKey,
  onClick,
}: {
  vaccine: Vaccine
  filterKey: string | null
  onClick: () => void
}) {
  const rec = filterKey
    ? (vaccine.recommendations as Record<string, string>)[filterKey]
    : null

  if (filterKey && (rec === 'NR' || !rec)) return null

  return (
    <motion.button
      className="vaccine-card"
      onClick={onClick}
      layout
      variants={fadeUp}
      whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(234,106,71,0.12)' }}
      whileTap={{ scale: 0.98 }}
      transition={spring}
    >
      <div className="vaccine-card-header">
        <span className="vaccine-card-name">{vaccine.name}</span>
        {rec && <RecommendationBadge level={rec} />}
      </div>
      <div className="vaccine-card-meta">
        {vaccine.doses} · {vaccine.route.split('(')[0].trim()}
      </div>
    </motion.button>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [drawerVaccineId, setDrawerVaccineId] = useState<string | null>(null)

  const searchResults = useMemo(() => {
    if (!query.trim()) return vaccinesData.vaccines
    return fuse.search(query).map(r => r.item)
  }, [query])

  const displayedVaccines = useMemo(() => {
    if (!activeFilter) return searchResults
    return searchResults.filter(v => {
      const rec = (v.recommendations as Record<string, string>)[activeFilter]
      return rec && rec !== 'NR'
    })
  }, [searchResults, activeFilter])

  const handleComorbidity = useCallback((key: string) => {
    const map = vaccinesData.comorbidity_map as Record<string, { column: string }>
    const entry = map[key]
    if (entry) { setActiveFilter(entry.column); setQuery('') }
  }, [])

  const handleCardClick = useCallback((id: string) => {
    if (isMobile) {
      setDrawerVaccineId(id)
    } else {
      navigate(`/vaccine/${id}`)
    }
  }, [isMobile, navigate])

  const handleAskAI = useCallback(() => {
    const q = query.trim()
    if (q) navigate('/chat?q=' + encodeURIComponent(q))
  }, [query, navigate])

  return (
    <div className="home-container">
      {/* Header */}
      <header className="site-header">
        <div className="header-content">
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={springEntrance}>
            <img src={galenWordmark} alt="GalenAI" className="site-logo-full" />
            <p className="site-subtitle">Indian Consensus Guidelines on Adult Immunization 2026</p>
          </motion.div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <motion.button
              className="schedule-btn"
              onClick={() => navigate('/schedule')}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={spring}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              View Schedule Chart
            </motion.button>
          </div>
        </div>
      </header>

      <main className="home-main">
        {/* AI Search Bar */}
        <motion.div className="search-section" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springEntrance, delay: 0.05 }}>
          <div className="search-ai-bar">
            <input
              className="search-input"
              type="text"
              placeholder="Ask AI about a patient or vaccine... (e.g. 65 yr diabetic, pregnancy, HIV)"
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveFilter(null) }}
              onKeyDown={e => {
                if (e.key === 'Enter' && query.trim()) {
                  e.preventDefault()
                  handleAskAI()
                }
              }}
            />
            <AnimatePresence>
              {query.trim() && (
                <motion.button
                  className="search-ai-submit"
                  onClick={handleAskAI}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={spring}
                  type="button"
                >
                  Ask AI ✦
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <div className="search-hint">Press <kbd>Enter</kbd> to ask AI · or press <kbd>⌘K</kbd> to search</div>
        </motion.div>

        {/* Quick Access */}
        {!query && (
          <motion.section className="section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}>
            <h2 className="section-title">Quick Access</h2>
            <div className="chip-row">
              {QUICK_VACCINES.map((id, i) => {
                const v = vaccinesData.vaccines.find(x => x.id === id)
                if (!v) return null
                return (
                  <motion.button
                    key={id}
                    className="quick-chip"
                    onClick={() => navigate('/chat?q=' + encodeURIComponent('What are the vaccination recommendations for ' + v.name + '?'))}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springEntrance, delay: 0.1 + i * 0.04 }}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.93 }}
                  >
                    {v.name.split(' ')[0]}
                  </motion.button>
                )
              })}
            </div>
          </motion.section>
        )}

        {/* Hero Chart */}
        {!query && (
          <motion.section
            className="section hero-chart-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springEntrance, delay: 0.12 }}
          >
            <div className="hero-chart-header">
              <div>
                <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>Age-wise Recommendation Chart</h2>
                <p className="hero-chart-desc">Color-coded matrix · Tap a patient category to filter vaccines below</p>
              </div>
            </div>

            {/* Clip-path reveal */}
            <motion.div
              className="page-52-preview"
              onClick={() => navigate('/schedule')}
              initial={{ clipPath: 'inset(100% 0 0 0)', opacity: 0 }}
              whileInView={{ clipPath: 'inset(0% 0 0 0)', opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              <img src="/images/page_052.png" alt="Age-wise Vaccination Recommendation Chart" />
            </motion.div>

            {/* Filter chips with layout pill morph */}
            <LayoutGroup>
              <div className="filter-chip-row">
                {PATIENT_FILTERS.map(f => (
                  <motion.button
                    key={f.key}
                    className={`filter-chip ${activeFilter === f.key ? 'active' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === f.key ? null : f.key)}
                    whileTap={{ scale: 0.92 }}
                    transition={spring}
                    style={{ position: 'relative' }}
                  >
                    {activeFilter === f.key && (
                      <motion.div
                        layoutId="active-filter-pill"
                        className="filter-chip-bg"
                        transition={spring}
                        style={{
                          position: 'absolute', inset: 0,
                          borderRadius: '20px',
                          background: 'rgba(234,106,71,0.18)',
                          border: '1px solid #ea6a47',
                        }}
                      />
                    )}
                    <span style={{ position: 'relative' }}>{f.label}</span>
                  </motion.button>
                ))}
              </div>
            </LayoutGroup>
          </motion.section>
        )}

        {/* Browse by Comorbidity */}
        {!query && (
          <motion.section className="section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}>
            <h2 className="section-title">Browse by Patient Type / Comorbidity</h2>
            <div className="chip-row comorbidity-chips">
              {COMORBIDITY_CHIPS.map((c, i) => (
                <motion.button
                  key={c.key}
                  className="comorbidity-chip"
                  onClick={() => handleComorbidity(c.key)}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springEntrance, delay: 0.2 + i * 0.03 }}
                  whileHover={{ scale: 1.07 }}
                  whileTap={{ scale: 0.93 }}
                >
                  {c.label}
                </motion.button>
              ))}
            </div>
          </motion.section>
        )}

        {/* Vaccine List */}
        <section className="section">
          <div className="vaccine-list-header">
            <h2 className="section-title">
              {activeFilter
                ? `Vaccines for: ${PATIENT_FILTERS.find(f => f.key === activeFilter)?.label}`
                : query
                ? `Search results for "${query}"`
                : 'All Vaccines (A–Z)'}
            </h2>
            <AnimatePresence mode="wait">
              <motion.span
                key={displayedVaccines.length}
                className="result-count-badge"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={springBounce}
              >
                {displayedVaccines.length}
              </motion.span>
            </AnimatePresence>
          </div>

          {activeFilter && (
            <div className="legend-row" style={{ marginBottom: '0.75rem' }}>
              {[
                { k: 'R',  bg: '#16a34a', label: 'Recommended' },
                { k: 'BR', bg: '#2563eb', label: 'May be considered' },
                { k: 'AR', bg: '#d97706', label: 'With additional risk' },
              ].map(({ k, bg, label }) => (
                <span key={k} className="legend-item">
                  <span style={{ background: bg, color: '#fff', padding: '1px 6px', borderRadius: '3px', fontSize: '0.7rem', fontWeight: 700 }}>{k}</span>
                  <span style={{ color: 'rgba(255,216,205,0.7)', fontSize: '0.75rem' }}>{label}</span>
                </span>
              ))}
            </div>
          )}

          <motion.div
            className="vaccine-list"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            key={activeFilter + query}
          >
            <AnimatePresence mode="popLayout">
              {displayedVaccines.length === 0 ? (
                <motion.p key="empty" {...fadeUp} style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>
                  No vaccines found for this filter.
                </motion.p>
              ) : (
                displayedVaccines
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(v => (
                    <VaccineCard
                      key={v.id}
                      vaccine={v}
                      filterKey={activeFilter}
                      onClick={() => handleCardClick(v.id)}
                    />
                  ))
              )}
            </AnimatePresence>
          </motion.div>
        </section>
      </main>

      {/* Vaul drawer for mobile */}
      <VaccineDrawer
        vaccineId={drawerVaccineId}
        onClose={() => setDrawerVaccineId(null)}
      />
    </div>
  )
}
