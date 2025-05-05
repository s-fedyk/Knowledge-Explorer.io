import React, { createContext, useContext, useState } from "react";
import { Client } from "@api/query.ts";
import { useTabContext } from "./TabContext";

// Create context
const MessageContext = createContext();

/**
 * Custom hook to use the MessageContext
 * @returns {Object} MessageContext value
 */
export const useMessageContext = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useMessageContext must be used within a MessageProvider");
  }
  return context;
};

/**
 * Provider component for MessageContext
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const MessageProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const { addGraphTab } = useTabContext();

  const addMessage = (sender, text) => {
    setMessages((prev) => [...prev, { sender, text, timestamp: new Date() }]);
  };

  const handleSendMessage = async (userMessage) => {
    // Add user message
    addMessage("user", userMessage);

    const queryRequest = {
      query: userMessage,
      similarity_top_k: 3,
    };

    try {
      const response = await Client.query(queryRequest);
      addMessage("bot", response.answer);

      // Add graph tab with response sources
      if (response.sources && response.sources.length > 0) {
        addGraphTab(response.sources);
      }
    } catch (error) {
      addMessage("bot", `API call error: ${error}`);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const value = {
    messages,
    addMessage,
    handleSendMessage,
    formatTime,
  };

  return (
    <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
  );
};
