import React from 'react'
import './AiDataPlaneDiyBanner.css'

/**
 * A slim banner shown at the top of each Couchbase AI Data Plane tab.
 * Links back to the DIY tab this function replaces, so developers
 * can feel the contrast between what they built manually and what
 * Couchbase AI Data Plane collapses into a single SQL++ query.
 *
 * Navigation uses a 'shell:navigate' CustomEvent so this component
 * doesn't need onTabChange threaded through every parent.
 *
 * Props:
 *   diyTab   — tab ID to navigate to (e.g. 'summarise')
 *   diyLabel — human label for the DIY tab (e.g. 'Summarisation')
 *   replaces — short description of what's replaced (e.g. 'map-reduce LLM pipeline')
 */
export default function AiDataPlaneDiyBanner({ diyTab, diyLabel, replaces }) {
  function navigate() {
    window.dispatchEvent(new CustomEvent('shell:navigate', { detail: diyTab }))
  }

  return (
    <div className="cdb-root">
      <span className="cdb-icon">🗄️→🐍</span>
      <span className="cdb-text">
        This function replaces the <strong>{replaces}</strong> you built manually.
      </span>
      {diyTab && (
        <button className="cdb-link" onClick={navigate}>
          Compare with {diyLabel} tab →
        </button>
      )}
    </div>
  )
}
