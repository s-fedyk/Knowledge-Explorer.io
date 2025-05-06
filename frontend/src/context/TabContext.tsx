import React, { createContext, useContext, useState } from "react";
import { nanoid } from "nanoid";

// Create context
const TabContext = createContext();

/**
 * Custom hook to use the TabContext
 * @returns {Object} TabContext value
 */
export const useTabContext = () => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error("useTabContext must be used within a TabProvider");
  }
  return context;
};

/**
 * Provider component for TabContext
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const TabProvider = ({ children }) => {
  const [activeTabId, setActiveTabId] = useState(1);
  const [tabs, setTabs] = useState([
    { id: 1, name: "Chat", type: "chat" },
    {
      id: 2,
      name: "File",
      type: "file",
      path: "http://localhost:8100//criticaldialoguesample.docx",
      fileType: "docx",
    },
  ]);

  // Handle tab selection
  const handleTabClick = (tabId) => {
    setActiveTabId(tabId);
  };

  // Handle tab closing
  const handleCloseTab = (tabId) => {
    // Don't allow closing the chat tab
    if (tabId === 1) return;

    // Remove the tab
    setTabs((prevTabs) => prevTabs.filter((tab) => tab.id !== tabId));

    // If we're closing the active tab, switch to the first available tab
    if (activeTabId === tabId) {
      setActiveTabId(1); // Default to chat tab
    }
  };

  // Add a new tab
  const addTab = (tab) => {
    const newTab = {
      id: nanoid(),
      ...tab,
    };
    setTabs((prevTabs) => [...prevTabs, newTab]);
    return newTab.id;
  };

  // Add graph tab
  const addGraphTab = (nodes) => {
    const graphTab = {
      name: "Graph",
      type: "graph",
      nodes: nodes,
    };
    const newTabId = addTab(graphTab);
    return newTabId;
  };

  // Get tab icon based on type
  const getTabIcon = (type) => {
    switch (type) {
      default:
        return (
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        );
    }
  };

  const value = {
    tabs,
    activeTabId,
    handleTabClick,
    handleCloseTab,
    addTab,
    addGraphTab,
    getTabIcon,
  };

  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
};
