import React from "react";
import ChatHistorySelector from "./ChatHistorySelector";
import FileSystem from "./filesystem/FileSystem";

function NavSidebar({
  chatHistories,
  activeChatHistory,
  onSelectChatHistory,
  onCreateNewChat,
  files,
  directory,
  activeFile,
  onFileSelect,
  onFileUpload,
  onFileRemove,
}) {
  return (
    <div className="w-64 h-screen bg-white shadow-md flex flex-col border-b border-gray-200">
      {/* Chats: 2/3 of sidebar */}
      <div className="basis-1/2 overflow-y-auto border-b border-gray-200">
        <ChatHistorySelector
          chatHistories={chatHistories}
          activeChatHistory={activeChatHistory}
          onSelectChatHistory={onSelectChatHistory}
          onCreateNewChat={onCreateNewChat}
        />
      </div>

      {/* FileSystem: 1/3 of sidebar */}
      <div className="basis-2/3 overflow-y-auto">
        <FileSystem
          directory={directory}
          activeFile={activeFile}
          onFileSelect={onFileSelect}
          onFileUpload={onFileUpload}
          onFileRemove={onFileRemove}
        />
      </div>
    </div>
  );
}

export default NavSidebar;
