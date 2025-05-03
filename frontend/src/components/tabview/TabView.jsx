import { useState } from "react";
import ChatWindow from "./ChatWindow";
import FileView from "./FileView";

/**
 * TabView component for managing multiple tabs, including chat and file viewers
 * @param {Object} props - Component props
 * @param {Array} props.tabs - Array of tab objects with id, name, type, and content properties
 * @param {string} props.activeTabId - ID of the currently active tab
 * @param {Function} props.onTabChange - Function to call when a tab is selected
 * @param {Function} props.onTabClose - Function to call when a tab is closed
 * @param {Object} props.chatProps - Props to pass to the ChatWindow component
 */
const TabView = ({
  tabs = [],
  activeTabId,
  onTabChange,
  onTabClose,
  chatProps = {},
}) => {
  // Handle tab selection
  const handleTabClick = (tabId) => {
    onTabChange(tabId);
  };

  // Handle tab closing
  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    onTabClose(tabId);
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

  // Render tab content based on type
  const renderTabContent = (tab) => {
    console.log("rending a tab", tab);
    switch (tab.type) {
      default:
        return <ChatWindow {...chatProps} />;
      case "file":
        return <FileView file={tab} />;
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-200 overflow-hidden">
      {/* Tabs navigation */}
      <div className="flex flex-none bg-white border-b border-gray-200 overflow-x-auto text-lg">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`px-4 py-2 flex items-center cursor-pointer ${
              activeTabId === tab.id
                ? "bg-gray-100 text-gray-400"
                : "hover:bg-gray-50 text-gray-400"
            }`}
            onClick={() => handleTabClick(tab.id)}
          >
            {getTabIcon(tab.type)}
            <span className="truncate border:none">{tab.name}</span>
            {/* Only show close button if not the chat tab */}
            {tab.type !== "chat" && (
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={(e) => handleCloseTab(e, tab.id)}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Tab content area */}
      <div className="flex-grow overflow-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`h-full ${activeTabId === tab.id ? "block" : "hidden"}`}
          >
            {renderTabContent(tab)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TabView;
