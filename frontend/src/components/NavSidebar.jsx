import React from 'react';
import ChatHistorySelector from './ChatHistorySelector';
import FileSystem from './FileSystem';

function NavSidebar({
  chatHistories,
  activeChatHistory,
  onSelectChatHistory,
  onCreateNewChat,
  files,
  activeFile,
  onFileSelect,
  onFileUpload,
  onFileRemove
}) {
  return (
    <div className="w-64 bg-white shadow-md flex-col">

      <ChatHistorySelector
        chatHistories={chatHistories}
        activeChatHistory={activeChatHistory}
        onSelectChatHistory={onSelectChatHistory}
        onCreateNewChat={onCreateNewChat}
      />
      
      <FileSystem
        files={files}
        activeFile={activeFile}
        onFileSelect={onFileSelect}
        onFileUpload={onFileUpload}
        onFileRemove={onFileRemove}
      />
    </div>
  );
}

export default NavSidebar;
