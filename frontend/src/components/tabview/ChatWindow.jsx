import { useState, useRef, useEffect } from "react";

// ChatWindow component that handles message display and user input
const ChatWindow = ({ onSendMessage, messages = [] }) => {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // Scroll to bottom of chat whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (inputValue.trim() === "") return;

    // Call the parent's onSendMessage handler
    onSendMessage(inputValue);

    // Clear input
    setInputValue("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 overflow-hidden">
      {/* Messages area with controlled overflow */}
      <div className="flex-grow overflow-y-auto p-4">
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
                  <div className="text-sm">{message.text}</div>
                  <div className="text-xs text-right mt-1 opacity-70">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area - fixed at bottom */}
      <div className="bg-gray-100 border-t border-gray-200 p-4">
        <div className="flex w-full">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your documents..."
            className="flex-grow text-gray-900 shadow-sm p-2 border placeholder-gray-400 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-transparent transition duration-150 ease-in-out bg-white"
          />
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
