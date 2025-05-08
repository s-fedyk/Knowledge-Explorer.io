import React from "react";
import ChatHistorySelector from "./ChatHistorySelector";
import FileSystem from "./filesystem/FileSystem";
import { FileSystemProvider } from "@context/FileSystemContext";
import { ChatHistoryProvider } from "@context/ChatHistoryContext";

/**
 * NavSidebar component that holds a filesystem and chat history
 * @param {Object} props - Component props
 * @param {Array} props.initialChatHistories - Initial chat histories
 * @param {string|null} props.initialActiveChatHistory - Initial active chat history ID
 * @param {Object} props.initialDirectory - Initial directory structure
 * @param {string|null} props.initialActiveFile - Initial active file
 */
function NavSidebar({
  initialChatHistories = [],
  initialActiveChatHistory = null,
  initialDirectory = {},
  initialActiveFile = null,
}) {
  return (
    <ChatHistoryProvider
      initialChatHistories={initialChatHistories}
      initialActiveChatHistory={initialActiveChatHistory}
    >
      <FileSystemProvider
        initialDirectory={initialDirectory}
        initialActiveFile={initialActiveFile}
      >
        <div className="w-64 h-full bg-white shadow-md flex flex-col border-r border-gray-400">
          <div className="basis-2/5 overflow-y-auto border-gray-400">
            <ChatHistorySelector />
          </div>
          <div className="basis-3/5">
            <FileSystem />
          </div>
        </div>
      </FileSystemProvider>
    </ChatHistoryProvider>
  );
}

export default NavSidebar;
