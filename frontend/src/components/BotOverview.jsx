import React from 'react'
import './BotOverview.css'

export default function BotOverview({ bot }) {
  return (
    <div className="bot-overview-root">
      <div className="bot-overview-hero" style={{ background: bot.heroBg, borderColor: bot.heroBorder }}>
        <div className="bot-overview-hero-icon">{bot.logo}</div>
        <div>
          <h1 className="bot-overview-hero-title" style={{ color: bot.color }}>{bot.title}</h1>
          <p className="bot-overview-hero-sub">{bot.subtitle}</p>
        </div>
      </div>

      <section className="bot-overview-section">
        <h2 className="bot-overview-section-title" style={{ color: bot.color }}>Request flow</h2>
        <div className="bot-overview-arch">
          {bot.archSteps.map((step, i) => (
            <React.Fragment key={i}>
              <div className="bot-overview-arch-step">
                <div className="bot-overview-arch-icon">{step.icon}</div>
                <div className="bot-overview-arch-label">{step.label}</div>
                <div className="bot-overview-arch-desc">{step.desc}</div>
              </div>
              {i < bot.archSteps.length - 1 && <div className="bot-overview-arch-arrow">→</div>}
            </React.Fragment>
          ))}
        </div>
      </section>

      <section className="bot-overview-section">
        <h2 className="bot-overview-section-title" style={{ color: bot.color }}>Key concepts</h2>
        <div className="bot-overview-concepts">
          {bot.concepts.map((c, i) => (
            <div key={i} className="bot-overview-concept-card">
              <div className="bot-overview-concept-icon">{c.icon}</div>
              <div>
                <div className="bot-overview-concept-title">{c.title}</div>
                <div className="bot-overview-concept-desc">{c.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bot-overview-section">
        <h2 className="bot-overview-section-title" style={{ color: bot.color }}>What you'll build</h2>
        <div className="bot-overview-build-list">
          {bot.builds.map((b, i) => (
            <div key={i} className="bot-overview-build-item">
              <span className="bot-overview-build-num" style={{ background: bot.color }}>{i + 1}</span>
              <div dangerouslySetInnerHTML={{ __html: b }} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
