import React, { useState, useRef } from "react";
import { useMessageContext } from "@context/MessageContext";
import MessageList from "./MessageList";
import { Send } from "lucide-react";

/**
 * ChatWindow component orchestrates the chat interface
 * It handles message display and user input coordination
 */
const ChatWindow = () => {
  const [inputValue, setInputValue] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
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

  const canSend = inputValue.trim() !== "" && !isStreaming;

  return (
    <div className="flex flex-col h-full relative ">
      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto p-4 pb-28"
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

      {/* Input area - fixed at bottom with transparent background and high z-index */}
      <div className="flex-1 w-full absolute bottom-0 z-25 background-transparent">
        <div className="p-4">
          <div className="relative flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              placeholder="Ask a question about the knowledge base..."
              className="flex-1 rounded bg-white text-gray-500 shadow-md p-5 pr-14 border-gray-300 border border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-transparent transition duration-150 ease-in-out bg-white/90 backdrop-blur-sm"
              disabled={isStreaming}
            />
            {/* Send button - simplified glow effect */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`background-transparent -translate-y-1/2 p-2 transition-all duration-300 rounded-full ${
                !canSend
                  ? "cursor-not-allowed"
                  : "cursor-pointer hover:scale-110"
              }`}
            >
              <Send
                size={25}
                className={`transition-all duration-300 ${
                  !canSend
                    ? "text-gray-500"
                    : isInputFocused
                      ? "text-blue-500 filter drop-shadow-sm"
                      : "text-gray-500 hover:text-blue-500"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
