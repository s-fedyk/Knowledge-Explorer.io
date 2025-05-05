import React, { useRef } from "react";
import FolderView from "./FolderView";
import { useFileSystemContext } from "@context/FileSystemContext";

/**
 * FileSystem component for managing file navigation and operations
 */
function FileSystem() {
  const {
    currentPath,
    canGoBack,
    canGoForward,
    navigateBack,
    navigateForward,
    handleFileUpload,
  } = useFileSystemContext();

  const fileInputRef = useRef(null);

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(Array.from(e.target.files), currentPath);
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
        onChange={handleFileInputChange}
        multiple
        webkitdirectory="true"
        directory="true"
      />
      <div className="flex text-gray-400 border-b border-t border-gray-400">
        <button
          className={`hover:bg-gray-200 hover:text-white transition-colors ${
            !canGoBack ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
          title="Back"
          onClick={navigateBack}
          disabled={!canGoBack}
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
          className={`hover:bg-gray-200 hover:text-white transition-colors ${
            !canGoForward ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
          title="Forward"
          onClick={navigateForward}
          disabled={!canGoForward}
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
      <FolderView />
    </div>
  );
}

export default FileSystem;
