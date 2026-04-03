import React from "react";
import "./MessageBubble.css";

const MessageBubble = ({ message }) => {
  const isUser = message.sender === "user";

  return (
    <div className={`message ${isUser ? "user-message" : "bot-message"}`}>
      <div className="message-content">
        <div className="message-text">{message.text}</div>
        {message.badge && <div className="message-badge">{message.badge}</div>}
        <div className="message-time">
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {isUser
            ? ""
            : " - request duration: " + message.requestDuration + "ms"}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
