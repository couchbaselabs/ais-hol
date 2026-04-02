import React from "react";
import "./Header.css";

const Header = ({ activeTab, onTabChange, action }) => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-title">
          <h1>AI Workshop</h1>
          <p>Powered by Couchbase &amp; OpenAI</p>
        </div>
        <div className="header-right">
          {onTabChange && (
            <nav className="header-tabs">
              <button
                className={`tab-btn ${activeTab === "chat" ? "tab-btn--active" : ""}`}
                onClick={() => onTabChange("chat")}
              >
                Simple Chat
              </button>
              <button
                className={`tab-btn ${activeTab === "rag" ? "tab-btn--active" : ""}`}
                onClick={() => onTabChange("rag")}
              >
                RAG Chat
              </button>
              <button
                className={`tab-btn ${activeTab === "agent" ? "tab-btn--active" : ""}`}
                onClick={() => onTabChange("agent")}
              >
                Agent Chat
              </button>
            </nav>
          )}
          {action && <div className="header-action">{action}</div>}
        </div>
      </div>
    </header>
  );
};

export default Header;
