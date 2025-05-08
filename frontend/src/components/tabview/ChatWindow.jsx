import React, { useState, useRef, useEffect } from "react";
import { useMessageContext } from "@context/MessageContext";

/**
 * SummaryBlock component renders a summary section
 */
const SummaryBlock = ({ content, complete }) => {
  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded my-2">
      <div className="flex items-center mb-1">
        <svg
          className="w-5 h-5 text-amber-500 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <span className="font-medium text-amber-700">Source Summary</span>
        {!complete && (
          <span className="ml-2 text-amber-500">
            <span className="animate-pulse">•</span>
          </span>
        )}
      </div>
      <div className="text-gray-700 whitespace-pre-wrap">{content}</div>
    </div>
  );
};

/**
 * FinalBlock component renders a final section (highlighted differently)
 */
const FinalBlock = ({ content, complete }) => {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded my-2">
      <div className="flex items-center mb-1">
        <svg
          className="w-5 h-5 text-blue-500 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 13l4 4L19 7"
          ></path>
        </svg>
        <span className="font-medium text-blue-700">Final Answer</span>
        {!complete && (
          <span className="ml-2 text-blue-500">
            <span className="animate-pulse">•</span>
          </span>
        )}
      </div>
      <div className="text-gray-700 whitespace-pre-wrap">{content}</div>
    </div>
  );
};

/**
 * Generic section renderer component
 */
const SectionRenderer = ({ section }) => {
  switch (section.type) {
    case "summary":
      return (
        <SummaryBlock content={section.content} complete={section.complete} />
      );
    case "final":
      return (
        <FinalBlock content={section.content} complete={section.complete} />
      );
    case "text":
    default:
      return <div className="whitespace-pre-wrap">{section.content}</div>;
  }
};

/**
 * Message content component that renders sections in order
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
 * ChatWindow component that handles message display and user input
 */
const ChatWindow = () => {
  const [inputValue, setInputValue] = useState("");
  const { messages, handleSendMessage, formatTime, isStreaming } =
    useMessageContext();
  const messagesEndRef = useRef(null);

  const handleSend = () => {
    if (inputValue.trim() === "") return;
    // Call the context's handleSendMessage handler
    handleSendMessage(inputValue);
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
    // Remove h-full since parent already has height constraints
    <div className="flex flex-col h-full bg-gray-100">
      {/* Messages area with controlled overflow - flex-1 instead of flex-grow */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
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
              <p>Upload documents and start chatting</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
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
                  {/* Use the MessageContent component to handle section rendering */}
                  <div className="text-sm">
                    <MessageContent message={message} />
                  </div>
                  <div className="text-xs text-right mt-1 opacity-70">
                    {formatTime(message.timestamp)}
                    {message.sender === "bot" &&
                      isStreaming &&
                      index === messages.length - 1 && (
                        <span className="ml-2 text-blue-500 animate-pulse">
                          •
                        </span>
                      )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      {/* Input area - flex-none instead of fixed positioning */}
      <div className="flex-none bg-white border-t border-gray-200 p-4">
        <div className="flex w-full">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your documents..."
            className="flex-grow text-gray-900 shadow-sm p-2 border placeholder-gray-400 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-transparent transition duration-150 ease-in-out bg-white"
            disabled={isStreaming}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
