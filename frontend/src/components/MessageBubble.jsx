import React from 'react'
import './MessageBubble.css'

const FAITH_STYLE = {
  grounded:    { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: '✓ Grounded' },
  hallucinated:{ bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: '⚠ Hallucinated' },
  uncertain:   { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: '? Uncertain' },
}

const MessageBubble = ({ message }) => {
  const isUser = message.sender === 'user'
  const citations = message.citations || []
  const faith = message.faithfulness || null
  const faithStyle = faith ? (FAITH_STYLE[faith.verdict] || FAITH_STYLE.uncertain) : null

  return (
    <div className={`message ${isUser ? 'user-message' : 'bot-message'}`}>
      <div className="message-content">
        <div className="message-text">
          {message.text}
        </div>
        {message.badge && (
          <div className="message-badge">{message.badge}</div>
        )}
        {citations.length > 0 && (
          <div className="message-citations">
            <span className="citations-label">Sources:</span>
            {citations.map((c, i) => (
              <span key={i} className="citation-chip citation-chip--hoverable">
                {c.filepath ? c.filepath.split('/').pop() : c.id}
                <span className="citation-score">score: {c.score}</span>
                {c.content && (
                  <span className="citation-tooltip">{c.content}</span>
                )}
              </span>
            ))}
          </div>
        )}
        {faithStyle && (
          <div className="message-faithfulness" style={{
            background: faithStyle.bg,
            color: faithStyle.color,
            border: `1px solid ${faithStyle.border}`,
          }} title={faith.issues?.join('; ') || ''}>
            <span className="faithfulness-label">{faithStyle.label}</span>
            <span className="faithfulness-score">{Math.round((faith.confidence || 0) * 100)}%</span>
          </div>
        )}
        <div className="message-time">
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  )
}

export default MessageBubble
