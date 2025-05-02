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
      <div className="basis-2/5 overflow-y-auto border-b border-gray-200">
        <ChatHistorySelector
          chatHistories={chatHistories}
          activeChatHistory={activeChatHistory}
          onSelectChatHistory={onSelectChatHistory}
          onCreateNewChat={onCreateNewChat}
        />
      </div>

      <div className="basis-3/5 ">
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
