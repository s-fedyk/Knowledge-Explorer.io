// File: components/chat/MessageList.jsx
import React from "react";
import MessageBubble from "./MessageBubble";

/**
 * EmptyChat component displays a placeholder when no messages exist
 */
const EmptyChat = () => {
  return (
    <div className="flex items-center justify-center h-full text-gray-400">
      <div className="text-center">
        <svg
          className="w-12 h-12 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        <p>Ask a question about the knowledge base...</p>
      </div>
    </div>
  );
};

/**
 * MessageList component manages the list of messages and empty state
 */
const MessageList = ({ messages, formatTime, isStreaming, messagesEndRef }) => {
  if (messages.length === 0) {
    return <EmptyChat />;
  }

  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <MessageBubble
          key={index}
          message={message}
          formatTime={formatTime}
          isLastMessage={index === messages.length - 1}
          isStreaming={isStreaming}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
