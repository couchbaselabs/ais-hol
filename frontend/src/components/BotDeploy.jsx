import React, { useState } from 'react'
import './BotDeploy.css'

export default function BotDeploy({ bot, steps }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const step = steps[activeIdx]

  return (
    <div className="bot-deploy-root">
      <h2 className="bot-deploy-title" style={{ color: bot.color }}>Deploy your {bot.name} bot</h2>
      <p className="bot-deploy-desc">{bot.deployDesc}</p>

      <div className="bot-deploy-split">
        <div className="bot-deploy-nav">
          {steps.map((s, i) => (
            <button
              key={i}
              className={`bot-deploy-nav-btn ${activeIdx === i ? 'bot-deploy-nav-btn--active' : ''}`}
              style={activeIdx === i ? { borderColor: bot.color, background: bot.heroBg } : {}}
              onClick={() => setActiveIdx(i)}
            >
              <span className="bot-deploy-nav-num" style={{ background: bot.color }}>{i + 1}</span>
              <span className="bot-deploy-nav-icon">{s.icon}</span>
              <span className="bot-deploy-nav-label">{s.title}</span>
            </button>
          ))}
        </div>

        <div className="bot-deploy-content">
          <div className="bot-deploy-step-header">
            <span className="bot-deploy-step-icon">{step.icon}</span>
            <h3 className="bot-deploy-step-title">{step.title}</h3>
          </div>
          <div className="bot-deploy-step-body">{step.content}</div>

          <div className="bot-deploy-nav-btns">
            {activeIdx > 0 && (
              <button className="bot-deploy-prev" onClick={() => setActiveIdx(i => i - 1)}>← Previous</button>
            )}
            {activeIdx < steps.length - 1 && (
              <button className="bot-deploy-next" style={{ background: bot.color }} onClick={() => setActiveIdx(i => i + 1)}>Next →</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
