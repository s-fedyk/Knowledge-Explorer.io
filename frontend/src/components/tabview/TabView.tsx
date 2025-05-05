import { useState } from "react";
import ChatWindow from "./ChatWindow";
import FileView from "./FileView";
import GraphView from "./GraphView";
import { Client } from "@api/query.ts";
import { nanoid } from "nanoid";

/**
 * TabView component for managing multiple tabs, including chat and file viewers
 * @param {Object} props - Component props
 * @param {Array} props.tabs - Array of tab objects with id, name, type, and content properties
 * @param {string} props.activeTabId - ID of the currently active tab
 * @param {Function} props.onTabChange - Function to call when a tab is selected
 * @param {Function} props.onTabClose - Function to call when a tab is closed
 * @param {Object} props.chatProps - Props to pass to the ChatWindow component
 */
const TabView = ({ chatID, chatProps = {}, onFileSelect }) => {
  const [activeTabId, setActiveTabId] = useState(1);
  const [messages, setMessages] = useState([]);

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

  const addMessage = (sender, text) => {
    setMessages((prev) => [...prev, { sender, text, timestamp: new Date() }]);
  };

  const handleSendMessage = async (userMessage) => {
    // Add user message
    addMessage("user", userMessage);

    const queryRequest: QueryRequest = {
      query: userMessage,
      similarity_top_k: 3,
    };

    try {
      const response: QueryResponse = await Client.query(queryRequest);
      addMessage("bot", response.answer);

      const graphTab = {
        id: nanoid(),
        name: "graph",
        type: "graph",
        nodes: response.sources,
      };

      setTabs((prev) => [...prev, graphTab]);
    } catch (error) {
      addMessage("bot", "API call error, ${error}");
    }
  };

  // Handle tab selection
  const handleTabClick = (tabId) => {
    setActiveTabId(tabId);
  };

  // Handle tab closing
  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
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
    switch (tab.type) {
      default:
        return (
          <ChatWindow onSendMessage={handleSendMessage} messages={messages} />
        );
      case "file":
        return <FileView file={tab} />;
      case "graph":
        return <GraphView nodes={tab.nodes} />;
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
