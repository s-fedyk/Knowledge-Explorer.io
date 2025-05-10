import React, { createContext, useContext, useState, useRef } from "react";
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
    {
      id: 1,
      name: "Chat",
      type: "chat",
      close: false,
    },
  ]);

  const UUIDToTabIDRef = useRef(new Map());
  const handleFileClick = (file) => {
    const UUID = file.uuid;
    if (UUIDToTabIDRef.current.has(UUID)) {
      handleTabClick(UUIDToTabIDRef.current.get(UUID));
      return;
    }

    const tabID = addFileTab(file);
    UUIDToTabIDRef.current.set(UUID, tabID);
    handleTabClick(tabID);
  };

  const handleTabClick = (tabId) => {
    setActiveTabId(tabId);
  };

  const handleCloseTab = (tab) => {
    const removeID = tab.id;
    setTabs((prevTabs) => prevTabs.filter((tab) => tab.id !== removeID));

    if (tab?.file.uuid) {
      const fileUUID = tab.file.uuid;
      UUIDToTabIDRef.current.delete(fileUUID);
    }

    if (activeTabId === removeID) {
      setActiveTabId(1);
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

  const addFileTab = (file) => {
    const fileTab = {
      name: file.name,
      type: "file",
      file: file,
      close: true,
    };
    const newTabId = addTab(fileTab);
    return newTabId;
  };

  // Add graph tab
  const addGraphTab = (nodes) => {
    const graphTab = {
      name: "Graph",
      type: "graph",
      nodes: nodes,
      close: true,
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
    handleFileClick,
    handleCloseTab,
    addTab,
    addFileTab,
    addGraphTab,
    getTabIcon,
  };

  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
};
