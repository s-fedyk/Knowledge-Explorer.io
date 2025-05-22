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
    handleSendMessage(inputValue, queryMode);
    setInputValue("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto p-4 pb-24"
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

      {/* Input area - fixed at bottom with Safari safe area */}
      <div
        className="bottom-0 left-0 right-0 bg-gray-100 400"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0)",
        }}
      >
        <div className="p-4">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about the knowledge base..."
            className="w-full rounded text-gray-900 shadow-md p-5 border-gray-300 border border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-transparent transition duration-150 ease-in-out bg-white"
            disabled={isStreaming}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
