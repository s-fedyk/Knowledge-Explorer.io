import React, { useState, useRef } from "react";
import { useMessageContext } from "@context/MessageContext";
import { useFileSystemContext } from "@context/FileSystemContext";
import MessageList from "./MessageList";

/**
 * ChatWindow component orchestrates the chat interface
 * It handles message display and user input coordination
 */
const ChatWindow = () => {
  const [inputValue, setInputValue] = useState("");
  const { queryMode, messages, handleSendMessage, formatTime, isStreaming } =
    useMessageContext();
  const messagesEndRef = useRef(null);

  const handleSend = () => {
    if (inputValue.trim() === "") return;
    // Call the context's handleSendMessage handler
    handleSendMessage(inputValue, queryMode);
    // Clear input
    setInputValue("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area with WebKit scrollbar styling */}
      <div
        className="flex-1 overflow-y-auto p-4 border-b border-gray-400"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#CBD5E0 #EDF2F7",
        }}
      >
        <MessageList
          messages={messages}
          formatTime={formatTime}
          isStreaming={isStreaming}
          messagesEndRef={messagesEndRef}
        />
      </div>

      {/* Input area */}
      <div className="flex-none bg-gray-400">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a question about the knowledge base..."
          className="flex-grow w-full h-full rounded text-gray-900 shadow-md p-5 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-transparent transition duration-150 ease-in-out bg-white"
          disabled={isStreaming}
        />
      </div>
    </div>
  );
};

export default ChatWindow;
