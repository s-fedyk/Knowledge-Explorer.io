import React, { useState, useRef } from "react";
import { useMessageContext } from "@context/MessageContext";
import MessageList from "./MessageList";
import { Send } from "lucide-react";

/**
 * @file ChatWindow.jsx
 * @description This component provides the user interface for chat interactions.
 * It includes a message display area and an input field for sending messages.
 * It leverages `MessageContext` for state management related to messages,
 * query mode, and handling message sending logic, including streaming responses.
 */

/**
 * ChatWindow component orchestrates the chat interface.
 * It handles:
 * - Displaying a list of messages.
 * - User input for sending new messages.
 * - Sending messages through the `MessageContext`.
 * - Disabling input and send button during response streaming.
 * - Auto-scrolling to the latest message.
 */
const ChatWindow = () => {
  // `inputValue`: State for the text currently in the input field.
  const [inputValue, setInputValue] = useState("");
  // `isInputFocused`: State to track if the input field has focus, used for UI enhancements.
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Destructuring values from MessageContext:
  // - `queryMode`: The current RAG query mode (e.g., 'local', 'global').
  // - `messages`: An array of message objects to be displayed.
  // - `handleSendMessage`: Function to call when a new message is sent by the user.
  // - `formatTime`: Utility function to format message timestamps.
  // - `isStreaming`: Boolean indicating if a response is currently being streamed from the backend.
  const { queryMode, messages, handleSendMessage, formatTime, isStreaming } =
    useMessageContext();

  // `messagesEndRef`: A ref to an empty div at the end of the message list,
  // used for auto-scrolling to the bottom when new messages arrive.
  const messagesEndRef = useRef(null); // Note: Auto-scrolling logic might be in MessageList or here.

  // `handleSend`: Function to process sending a message.
  // It calls `handleSendMessage` from context and clears the input field.
  const handleSend = () => {
    if (inputValue.trim() === "") return; // Don't send empty messages.
    handleSendMessage(inputValue, queryMode); // Pass current input value and query mode.
    setInputValue(""); // Clear input field after sending.
  };

  // `handleKeyPress`: Allows sending messages by pressing Enter (unless Shift+Enter for newline).
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent default Enter behavior (e.g., form submission or newline in some inputs).
      handleSend();
    }
  };

  // `canSend`: Determines if the send button should be enabled.
  // True if input is not empty and no response is currently streaming.
  const canSend = inputValue.trim() !== "" && !isStreaming;

  return (
    // Main container for the chat window, uses flex column layout and takes full height.
    // `relative` positioning for the absolutely positioned input area.
    <div className="flex flex-col h-full relative ">
      {/* Messages display area */}
      {/* `flex-1` allows it to take available vertical space. */}
      {/* `overflow-y-auto` enables scrolling for messages. */}
      {/* `pb-28` adds padding at the bottom to prevent the fixed input area from overlapping the last message. */}
      <div
        className="flex-1 overflow-y-auto p-4 pb-28" // Padding bottom to ensure input doesn't hide content
        style={{
          // Custom scrollbar styling (for Firefox).
          scrollbarWidth: "thin",
          scrollbarColor: "#CBD5E0 #EDF2F7", // thumb color and track color
        }}
      >
        <MessageList
          messages={messages} // Pass the array of messages.
          formatTime={formatTime} // Pass time formatting utility.
          isStreaming={isStreaming} // Indicate if a response is streaming (for typing indicators, etc.).
          messagesEndRef={messagesEndRef} // Pass ref for auto-scrolling.
        />
      </div>

      {/* Input area - fixed at the bottom of the ChatWindow. */}
      {/* `absolute bottom-0` positions it at the bottom of its relative parent. */}
      {/* `z-25` ensures it's above the message list for click interactions. */}
      {/* `background-transparent` might be intended for a backdrop blur effect via `bg-white/90 backdrop-blur-sm` on the input itself. */}
      <div className="flex-1 w-full absolute bottom-0 z-25 background-transparent">
        {/* Padding for the input section. */}
        <div className="p-4">
          {/* Flex container for the input field and send button. */}
          <div className="relative flex items-center gap-2">
            {/* Text input field. */}
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)} // Update input value on change.
              onKeyPress={handleKeyPress} // Handle Enter key press.
              onFocus={() => setIsInputFocused(true)} // Set focus state for UI effects.
              onBlur={() => setIsInputFocused(false)} // Clear focus state.
              placeholder="Ask a question about the knowledge base..."
              // Styling for the input field, includes rounded corners, shadow, padding, and focus effects.
              // `bg-white/90 backdrop-blur-sm` creates a slightly transparent, blurred background.
              className="flex-1 rounded bg-white text-gray-500 shadow-md p-5 pr-14 border-gray-300 border border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-transparent transition duration-150 ease-in-out bg-white/90 backdrop-blur-sm"
              disabled={isStreaming} // Disable input when a response is streaming.
            />
            {/* Send button. */}
            <button
              onClick={handleSend}
              disabled={!canSend} // Disable button based on `canSend` logic.
              // Styling for the send button, includes transitions and conditional cursor.
              // `-translate-y-1/2` is likely a mistake if not inside a relative parent with top-50% or similar.
              // Assuming it's meant to vertically align if the parent div had specific height/positioning.
              // Given the `items-center` on parent, this translate might be for fine-tuning or an artifact.
              className={`background-transparent -translate-y-1/2 p-2 transition-all duration-300 rounded-full ${
                !canSend
                  ? "cursor-not-allowed" // Disabled cursor.
                  : "cursor-pointer hover:scale-110" // Pointer and hover effect when enabled.
              }`}
            >
              {/* Send icon. */}
              <Send
                size={25}
                // Conditional styling for the icon based on `canSend` and `isInputFocused` states.
                // Changes color and adds a drop shadow when input is focused and can send.
                className={`transition-all duration-300 ${
                  !canSend
                    ? "text-gray-500" // Disabled color.
                    : isInputFocused
                      ? "text-blue-500 filter drop-shadow-sm" // Focused and enabled color with effect.
                      : "text-gray-500 hover:text-blue-500" // Default enabled color with hover effect.
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
