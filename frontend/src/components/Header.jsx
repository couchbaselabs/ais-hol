import React from 'react'
import './Header.css'
import KeyBudgetWidget from './KeyBudgetWidget'

const Header = () => {
  return (
    <header className="header">
      <div className="header-top">
        <div className="header-title">
          <h1>How to Build a Production-Ready Chatbot</h1>
          <p>Couchbase · OpenAI · LangGraph</p>
        </div>
        <div className="header-action">
          <KeyBudgetWidget />
        </div>
      </div>
    </header>
  )
}

export default Header
