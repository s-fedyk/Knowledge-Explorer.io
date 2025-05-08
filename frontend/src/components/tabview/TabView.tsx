import React from "react";
import ChatWindow from "./ChatWindow";
import FileView from "./FileView";
import GraphView from "./GraphView";
import TabIcon from "./TabIcon";
import Tab from "./Tab";
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
  const { tabs, activeTabId } = useTabContext();

  console.log("tabs are", tabs);

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
      <div className="flex flex-none bg-white border-b border-gray-400 overflow-x-auto text-lg">
        {tabs.map((tab) => (
          <Tab tab={tab} />
        ))}
      </div>
      {/* Tab content area - changed from flex-grow to flex-1 and overflow-auto */}
      <div className="flex-1 overflow-auto">
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
