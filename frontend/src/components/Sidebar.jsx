import React, { useState, useEffect } from 'react'
import { MODULES, LEVEL_META, ORDERED_TAB_IDS, TAB_INDEX } from '../curriculum'
import './Sidebar.css'

const VISITED_KEY = 'ais-hol:visited'

function loadVisited() {
  try { return new Set(JSON.parse(localStorage.getItem(VISITED_KEY) || '[]')) }
  catch { return new Set() }
}

function saveVisited(set) {
  try { localStorage.setItem(VISITED_KEY, JSON.stringify([...set])) }
  catch {}
}

export default function Sidebar({ activeTab, onTabChange }) {
  const [collapsed, setCollapsed] = useState(false)
  const [visited, setVisited] = useState(loadVisited)
  // Which modules are open — default: open the one containing the active tab
  const [openModules, setOpenModules] = useState(() => {
    const entry = TAB_INDEX[activeTab]
    return new Set(entry ? [entry.module.id] : [MODULES[0].id])
  })

  // Mark tab visited whenever it changes
  useEffect(() => {
    if (!activeTab) return
    setVisited(prev => {
      const next = new Set(prev)
      next.add(activeTab)
      saveVisited(next)
      return next
    })
    // Auto-open the module containing the active tab
    const entry = TAB_INDEX[activeTab]
    if (entry) {
      setOpenModules(prev => {
        if (prev.has(entry.module.id)) return prev
        return new Set([...prev, entry.module.id])
      })
    }
  }, [activeTab])

  const totalTabs = ORDERED_TAB_IDS.length
  const visitedCount = ORDERED_TAB_IDS.filter(id => visited.has(id)).length
  const progressPct = Math.round((visitedCount / totalTabs) * 100)

  const toggleModule = (id) => {
    setOpenModules(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const resetProgress = () => {
    const next = new Set()
    saveVisited(next)
    setVisited(next)
  }

  if (collapsed) {
    return (
      <aside className="sidebar sidebar--collapsed">
        <button className="sidebar-expand-btn" onClick={() => setCollapsed(false)} title="Expand curriculum">
          ☰
        </button>
        <div className="sidebar-collapsed-modules">
          {MODULES.map(mod => {
            const isActive = TAB_INDEX[activeTab]?.module.id === mod.id
            const modVisited = mod.tabs.filter(t => visited.has(t.id)).length
            const modDone = modVisited === mod.tabs.length
            return (
              <button
                key={mod.id}
                className={`sidebar-collapsed-mod ${isActive ? 'sidebar-collapsed-mod--active' : ''} ${modDone ? 'sidebar-collapsed-mod--done' : ''}`}
                onClick={() => { setCollapsed(false); setOpenModules(new Set([mod.id])) }}
                title={mod.title}
              >
                {mod.icon}
                {modDone && <span className="sidebar-collapsed-check">✓</span>}
              </button>
            )
          })}
        </div>
        <div className="sidebar-collapsed-progress">
          <div className="sidebar-collapsed-progress-bar" style={{ height: `${progressPct}%` }} />
        </div>
      </aside>
    )
  }

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-header-title">
          <span className="sidebar-header-label">Curriculum</span>
          <span className="sidebar-header-progress">{visitedCount}/{totalTabs}</span>
        </div>
        <button className="sidebar-collapse-btn" onClick={() => setCollapsed(true)} title="Collapse">
          ◀
        </button>
      </div>

      {/* Progress bar */}
      <div className="sidebar-progress-wrap">
        <div className="sidebar-progress-bar" style={{ width: `${progressPct}%` }} />
        <span className="sidebar-progress-label">{progressPct}% complete</span>
      </div>

      {/* Modules */}
      <nav className="sidebar-nav">
        {MODULES.map((mod, modIdx) => {
          const isOpen = openModules.has(mod.id)
          const isActiveModule = TAB_INDEX[activeTab]?.module.id === mod.id
          const modVisited = mod.tabs.filter(t => visited.has(t.id)).length
          const modDone = modVisited === mod.tabs.length
          const meta = LEVEL_META[mod.level]

          return (
            <div key={mod.id} className={`sidebar-module ${isActiveModule ? 'sidebar-module--active' : ''}`}>
              <button
                className="sidebar-module-header"
                onClick={() => toggleModule(mod.id)}
              >
                <span className="sidebar-module-num">{String(modIdx + 1).padStart(2, '0')}</span>
                <span className="sidebar-module-icon">{mod.icon}</span>
                <span className="sidebar-module-title">{mod.title}</span>
                <span
                  className="sidebar-module-level"
                  style={{ color: meta.color, background: meta.bg }}
                >
                  {meta.label}
                </span>
                {modDone
                  ? <span className="sidebar-module-done">✓</span>
                  : modVisited > 0
                    ? <span className="sidebar-module-partial">{modVisited}/{mod.tabs.length}</span>
                    : null
                }
                <span className="sidebar-module-chevron">{isOpen ? '▾' : '▸'}</span>
              </button>

              {isOpen && (
                <ul className="sidebar-tab-list">
                  {mod.tabs.map((tab, tabIdx) => {
                    const isActive = tab.id === activeTab
                    const isVisited = visited.has(tab.id)
                    const globalIdx = ORDERED_TAB_IDS.indexOf(tab.id)
                    return (
                      <li key={tab.id}>
                        <button
                          className={`sidebar-tab-btn ${isActive ? 'sidebar-tab-btn--active' : ''} ${isVisited && !isActive ? 'sidebar-tab-btn--visited' : ''}`}
                          onClick={() => onTabChange(tab.id)}
                        >
                          <span className="sidebar-tab-idx">{globalIdx + 1}</span>
                          <span className="sidebar-tab-label">{tab.label}</span>
                          {isVisited && !isActive && <span className="sidebar-tab-check">✓</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </nav>



      <button className="sidebar-reset-btn" onClick={resetProgress} title="Reset progress">
        Reset progress
      </button>
    </aside>
  )
}
