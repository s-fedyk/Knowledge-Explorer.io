import React, { useRef, useState, useEffect } from "react";
import EmptyState from "./EmptyState";
import FolderView from "./FolderView";

function FileSystem({
  directory = {},
  activeFile,
  onFileSelect,
  onFileUpload,
  onFileRemove,
}) {
  const fileInputRef = useRef(null);

  const [currentPath, setCurrentPath] = useState("/");
  const [navigationHistory, setNavigationHistory] = useState(["/"]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Handle file upload with optional target path
  const handleFileUpload = (files, targetPath = currentPath) => {
    if (files && files.length > 0) {
      onFileUpload(files, targetPath);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Empty State / Upload UI
  if (Object.keys(directory.children).length <= 0) {
    return (
      <EmptyState onFileUpload={(files) => handleFileUpload(files, "/")} />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(Array.from(e.target.files));
          }
        }}
        multiple
        webkitdirectory="true"
        directory="true"
      />

      <FolderView
        currentPath={currentPath}
        directory={directory}
        activeFile={activeFile}
        canGoBack={historyIndex > 0}
        canGoForward={historyIndex < navigationHistory.length - 1}
        onFileSelect={onFileSelect}
        onFileRemove={onFileRemove}
        onFileUpload={handleFileUpload}
      />
    </div>
  );
}

export default FileSystem;
