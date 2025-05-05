import React, { createContext, useContext, useState } from "react";
import { nanoid } from "nanoid";

// Create context
const ChatHistoryContext = createContext();

/**
 * Custom hook to use the ChatHistoryContext
 * @returns {Object} ChatHistoryContext value
 */
export const useChatHistoryContext = () => {
  const context = useContext(ChatHistoryContext);
  if (!context) {
    throw new Error(
      "useChatHistoryContext must be used within a ChatHistoryProvider",
    );
  }
  return context;
};

/**
 * Provider component for ChatHistoryContext
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {Array} props.initialChatHistories - Initial chat histories
 * @param {string|null} props.initialActiveChatHistory - Initial active chat history ID
 */
export const ChatHistoryProvider = ({
  children,
  initialChatHistories = [],
  initialActiveChatHistory = null,
}) => {
  const [chatHistories, setChatHistories] = useState(initialChatHistories);
  const [activeChatHistory, setActiveChatHistory] = useState(
    initialActiveChatHistory,
  );

  // Handle chat history selection
  const handleSelectChatHistory = (chatId) => {
    setActiveChatHistory(chatId);
  };

  // Handle creating a new chat
  const handleCreateNewChat = () => {
    const newChat = {
      id: nanoid(),
      name: `New Chat ${chatHistories.length + 1}`,
      messages: [],
      createdAt: new Date(),
    };

    setChatHistories((prev) => [...prev, newChat]);
    setActiveChatHistory(newChat.id);

    return newChat;
  };

  // Handle removing a chat history
  const handleRemoveChatHistory = (chatId) => {
    setChatHistories((prev) => prev.filter((chat) => chat.id !== chatId));

    // If the removed chat was active, set another one as active or null
    if (activeChatHistory === chatId) {
      const remainingChats = chatHistories.filter((chat) => chat.id !== chatId);
      setActiveChatHistory(
        remainingChats.length > 0 ? remainingChats[0].id : null,
      );
    }
  };

  const value = {
    chatHistories,
    activeChatHistory,
    handleSelectChatHistory,
    handleCreateNewChat,
    handleRemoveChatHistory,
  };

  return (
    <ChatHistoryContext.Provider value={value}>
      {children}
    </ChatHistoryContext.Provider>
  );
};
