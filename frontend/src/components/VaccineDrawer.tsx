import { useState } from 'react'
import { Drawer } from 'vaul'
import { useNavigate } from 'react-router-dom'
import vaccinesData from '../data/vaccines.json'

type Vaccine = typeof vaccinesData.vaccines[number]

const COLUMN_LABELS: Record<string, string> = {
  adults_18_49:    '18–49',
  elderly_50plus:  '≥50',
  pregnancy:       'Pregnancy',
  at_risk:         'At-Risk',
  high_risk_immuno:'High-Risk',
  lifestyle:       'Lifestyle',
  special_situations: 'Special',
  adolescents_12_18:  '12–18',
}

const BADGE: Record<string, { bg: string }> = {
  R:  { bg: '#16a34a' },
  BR: { bg: '#2563eb' },
  AR: { bg: '#d97706' },
  NR: { bg: '#dc2626' },
}

interface Props {
  vaccineId: string | null
  onClose: () => void
}

export default function VaccineDrawer({ vaccineId, onClose }: Props) {
  const navigate = useNavigate()
  const vaccine = vaccinesData.vaccines.find(v => v.id === vaccineId) as Vaccine | undefined
  const [pageIndex, setPageIndex] = useState(0)

  const open = !!vaccineId

  const handleOpenChange = (o: boolean) => {
    if (!o) { onClose(); setPageIndex(0) }
  }

  const recs = vaccine ? (vaccine.recommendations as Record<string, string>) : {}
  const pages = vaccine?.pages as number[] | undefined

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="drawer-overlay" />
        <Drawer.Content className="drawer-content">
          <div className="drawer-handle" />

          {vaccine && (
            <div className="drawer-body">
              {/* Title + View Full */}
              <div className="drawer-header">
                <h2 className="drawer-title">{vaccine.name}</h2>
                <button
                  className="drawer-full-btn"
                  onClick={() => { onClose(); navigate(`/vaccine/${vaccine.id}`) }}
                >
                  Full Details →
                </button>
              </div>

              {/* Rec grid */}
              <div className="drawer-rec-grid">
                {Object.entries(COLUMN_LABELS).map(([key, label]) => {
                  const level = recs[key] || 'NR'
                  const cfg = BADGE[level] || BADGE['NR']
                  return (
                    <div key={key} className="drawer-rec-cell">
                      <div className="drawer-rec-badge" style={{ background: cfg.bg }}>
                        {level}
                      </div>
                      <div className="drawer-rec-label">{label}</div>
                    </div>
                  )
                })}
              </div>

              {/* Key facts */}
              <div className="drawer-facts">
                <div className="drawer-fact"><span>Schedule</span><span>{vaccine.schedule}</span></div>
                <div className="drawer-fact"><span>Route</span><span>{vaccine.route.split('(')[0].trim()}</span></div>
                <div className="drawer-fact"><span>Dose</span><span>{vaccine.dose_volume}</span></div>
                {vaccine.booster && <div className="drawer-fact"><span>Booster</span><span>{vaccine.booster}</span></div>}
              </div>

              {/* Contraindications */}
              {vaccine.contraindications.length > 0 && (
                <div className="drawer-section">
                  <div className="drawer-section-title" style={{ color: '#fca5a5' }}>Contraindications</div>
                  {vaccine.contraindications.map((c, i) => (
                    <div key={i} className="drawer-list-item" style={{ color: '#fca5a5' }}>{c}</div>
                  ))}
                </div>
              )}

              {/* Guideline page */}
              {pages && pages.length > 0 && (
                <div className="drawer-section">
                  <div className="drawer-section-title">Guideline Reference · Page {pages[pageIndex]}</div>
                  <img
                    src={`/images/page_${String(pages[pageIndex]).padStart(3, '0')}.png`}
                    alt={`Page ${pages[pageIndex]}`}
                    className="drawer-page-img"
                  />
                  {pages.length > 1 && (
                    <div className="drawer-page-nav">
                      <button onClick={() => setPageIndex(i => Math.max(0, i - 1))} disabled={pageIndex === 0}>← Prev</button>
                      <span>{pageIndex + 1}/{pages.length}</span>
                      <button onClick={() => setPageIndex(i => Math.min(pages.length - 1, i + 1))} disabled={pageIndex === pages.length - 1}>Next →</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
