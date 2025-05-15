import React, { createContext, useContext, useState } from "react";

// Create the context
const QueryModeContext = createContext();

/**
 * QueryModeProvider component for managing query mode state across the application
 */
export function QueryModeProvider({ children }) {
  // State for selected query mode
  const [queryMode, setQueryMode] = useState("global"); // Default to global mode

  // Function to change the query mode
  const changeQueryMode = (mode) => {
    setQueryMode(mode);
  };

  // Value to be provided by the context
  const value = {
    queryMode, // Current query mode (string: "global" or "local")
    changeQueryMode, // Function to update the query mode
  };

  return (
    <QueryModeContext.Provider value={value}>
      {children}
    </QueryModeContext.Provider>
  );
}

/**
 * Custom hook to use the query mode context
 */
export function useQueryMode() {
  const context = useContext(QueryModeContext);
  if (context === undefined) {
    throw new Error("useQueryMode must be used within a QueryModeProvider");
  }
  return context;
}

export default QueryModeContext;
