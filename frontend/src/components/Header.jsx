import React from 'react'
import './Header.css'

const Header = ({ action }) => {
  return (
    <header className="header">
      <div className="header-top">
        <div className="header-title">
          <h1>AI Services Demo</h1>
          <p>Couchbase · OpenAI · LangGraph</p>
        </div>
        {action && <div className="header-action">{action}</div>}
      </div>
    </header>
  )
}

export default Header
