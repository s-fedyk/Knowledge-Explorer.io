import React, { useMemo, useCallback } from "react";
import ChatWindow from "./ChatWindow";
import FileView from "./FileView";
import GraphView from "./GraphView";
import TabIcon from "./TabIcon";
import Tab from "./Tab";
import { useTabContext } from "@context/TabContext";
import { GraphViewProvider } from "@context/GraphViewContext";
import { Github } from "lucide-react";

const TabView = () => {
  const { tabs, activeTabId } = useTabContext();

  const renderTabContent = useCallback((tab) => {
    switch (tab.type) {
      case "file":
        return <FileView file={tab.file} />;
      case "graph":
        return (
          <GraphViewProvider>
            <GraphView nodes={tab.nodes} />
          </GraphViewProvider>
        );
      default:
        return <ChatWindow />;
    }
  }, []);

  const tabsContent = useMemo(() => {
    return tabs.map((tab) => (
      <div
        key={tab.id}
        className={`h-full ${activeTabId === tab.id ? "block" : "hidden"}`}
      >
        {renderTabContent(tab)}
      </div>
    ));
  }, [tabs, activeTabId, renderTabContent]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex flex-none bg-white border-b border-gray-400 text-lg relative">
        <div className="flex overflow-x-auto pr-12 w-full">
          {tabs.map((tab) => (
            <Tab key={tab.id} tab={tab} />
          ))}
        </div>

        <a
          href={GIT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-gray-400 px-3 cursor-pointer absolute right-0 h-full bg-white border-l border-gray-200 hover:bg-gray-100 hover:text-black transition-colors duration-200"
        >
          <Github size={30} />
          <span className={"pl-2"}>GitHub</span>
        </a>
      </div>

      <div className="flex-1 overflow-auto bg-gray-100">{tabsContent}</div>
    </div>
  );
};

export default TabView;
