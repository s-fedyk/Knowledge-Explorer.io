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

  const handleFileUpload = (files, targetPath = currentPath) => {
    if (files && files.length > 0) {
      onFileUpload(files, targetPath);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="h-full">
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
      <div className="flex text-gray-400 border-b border-t border-gray-400">
        <button
          className={`hover:bg-gray-200 hover:text-white transition-colors `}
          title="Back"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <button
          className={`hover:bg-gray-200 hover:text-white transition-colors`}
          title="Forward"
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
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
