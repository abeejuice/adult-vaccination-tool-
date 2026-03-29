import { useEffect, useState, useCallback } from 'react'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Fuse from 'fuse.js'
import vaccinesData from '../data/vaccines.json'
import { spring } from '../lib/motion'

type Vaccine = typeof vaccinesData.vaccines[number]

const BADGE: Record<string, { bg: string; label: string }> = {
  R:  { bg: '#16a34a', label: 'R' },
  BR: { bg: '#2563eb', label: 'BR' },
  AR: { bg: '#d97706', label: 'AR' },
  NR: { bg: '#dc2626', label: 'NR' },
}

const fuse = new Fuse(vaccinesData.vaccines, {
  keys: [{ name: 'name', weight: 2 }, { name: 'aliases', weight: 1.5 }],
  threshold: 0.35,
})

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  // ⌘K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const results: Vaccine[] = query
    ? fuse.search(query).map(r => r.item)
    : vaccinesData.vaccines.slice(0, 8)

  const select = useCallback((id: string) => {
    setOpen(false)
    setQuery('')
    navigate(`/vaccine/${id}`)
  }, [navigate])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="cmd-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
          />

          {/* Palette */}
          <motion.div
            key="palette"
            className="cmd-wrapper"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={spring}
          >
            <Command className="cmd-root" shouldFilter={false}>
              <div className="cmd-input-wrap">
                <span className="cmd-search-icon">⌕</span>
                <Command.Input
                  className="cmd-input"
                  placeholder="Search vaccines..."
                  value={query}
                  onValueChange={setQuery}
                  autoFocus
                />
                <kbd className="cmd-esc">esc</kbd>
              </div>

              <Command.List className="cmd-list">
                {results.length === 0 && (
                  <Command.Empty className="cmd-empty">No vaccines found</Command.Empty>
                )}
                {results.map(v => {
                  const rec = (v.recommendations as Record<string, string>)['adults_18_49'] || 'NR'
                  const badge = BADGE[rec]
                  return (
                    <Command.Item
                      key={v.id}
                      value={v.id}
                      className="cmd-item"
                      onSelect={() => select(v.id)}
                    >
                      <span className="cmd-item-name">{v.name}</span>
                      <span className="cmd-item-meta">{v.doses}</span>
                      {badge && (
                        <span
                          className="cmd-badge"
                          style={{ background: badge.bg }}
                        >
                          {badge.label}
                        </span>
                      )}
                    </Command.Item>
                  )
                })}
              </Command.List>

              <div className="cmd-footer">
                <span><kbd>↑↓</kbd> navigate</span>
                <span><kbd>↵</kbd> open</span>
                <span><kbd>esc</kbd> close</span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
