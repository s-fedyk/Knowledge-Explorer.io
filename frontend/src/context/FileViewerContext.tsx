import React, { createContext, useContext, useState } from "react";

// Create context
const FileViewerContext = createContext();

/**
 * Custom hook to use the ChatHistoryContext
 * @returns {Object} ChatHistoryContext value
 */
export const useFileViewerContext = () => {
  const context = useContext();
  if (!context) {
    throw new Error(
      "useFileViewerContext must be used within a ViewViewerContext provider",
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
export const FileViewerProvider = ({ children, file }) => {
  // What does our provider need to do?
  // Handle directing which file is loaded into the viewer.
  // We make a request to the backend, and get the data associated with that
  // file

  return (
    <FileViewerContext.Provider value={value}>
      {children}
    </FileViewerContext.Provider>
  );
};
