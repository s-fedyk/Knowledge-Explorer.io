import React from "react";
import ChatWindow from "./ChatWindow";
import FileView from "./FileView";
import GraphView from "./GraphView";
import { useTabContext } from "@context/TabContext";
import { GraphViewProvider } from "@context/GraphViewContext";

/**
 * TabView component for managing multiple tabs, including chat and file viewers
 * @param {Object} props - Component props
 * @param {string} props.chatID - ID of the current chat
 * @param {Object} props.chatProps - Props to pass to the ChatWindow component
 * @param {Function} props.onFileSelect - Function to call when a file is selected
 */
const TabView = () => {
  const { tabs, activeTabId, handleTabClick, handleCloseTab, getTabIcon } =
    useTabContext();

  // Render tab content based on type
  const renderTabContent = (tab) => {
    switch (tab.type) {
      case "file":
        return <FileView file={tab} />;
      case "graph":
        return (
          <GraphViewProvider>
            <GraphView nodes={tab.nodes} />
          </GraphViewProvider>
        );
      default:
        return <ChatWindow />;
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-200 overflow-hidden">
      {/* Tabs navigation */}
      <div className="flex flex-none bg-white border-b border-gray-200 overflow-x-auto text-lg">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`px-4 py-2 flex items-center cursor-pointer border-r border-gray-200 ${
              activeTabId === tab.id
                ? "bg-gray-100 text-gray-400"
                : "hover:bg-gray-50 text-gray-400"
            }`}
            onClick={() => handleTabClick(tab.id)}
          >
            {getTabIcon(tab.type)}
            <span className="truncate border:none">{tab.name}</span>
            {/* Only show close button if not the chat tab */}
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
