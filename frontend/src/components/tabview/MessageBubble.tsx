// File: components/chat/MessageBubble.jsx
import React from "react";
import { SectionRenderer } from "./MessageBlocks";

/**
 * MessageContent component that renders sections in order
 */
const MessageContent = ({ message }) => {
  // For user messages or messages without sections, just render the text
  if (
    message.sender === "user" ||
    !message.sections ||
    message.sections.length === 0
  ) {
    return <div className="whitespace-pre-wrap">{message.text}</div>;
  }

  // For bot messages with sections, render each section in order
  return (
    <div>
      {message.sections.map((section) => (
        <React.Fragment key={section.id}>
          <SectionRenderer section={section} />
        </React.Fragment>
      ))}
    </div>
  );
};

/**
 * MessageBubble component renders a single chat message with appropriate styling
 */
const MessageBubble = ({ message, formatTime, isLastMessage, isStreaming }) => {
  return (
    <div
      className={`flex ${
        message.sender === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-md p-3 rounded-lg ${
          message.sender === "user"
            ? "bg-blue-500 text-white"
            : message.sender === "system"
              ? "bg-gray-200 text-gray-800"
              : "bg-white text-gray-800 shadow"
        }`}
      >
        <div className="text-sm">
          <MessageContent message={message} />
        </div>
        <div className="text-xs text-right mt-1 opacity-70">
          {formatTime(message.timestamp)}
          {message.sender === "bot" && isStreaming && isLastMessage && (
            <span className="ml-2 text-blue-500 animate-pulse">•</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
