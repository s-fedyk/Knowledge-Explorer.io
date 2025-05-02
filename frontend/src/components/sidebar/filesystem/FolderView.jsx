import React, { useRef, useEffect } from "react";
import FolderItem from "./items/FolderItem";
import FileItem from "./items/FileItem";
import "./Node";

const FolderView = ({
  currentPath,
  folders,
  directory,
  files,
  activeFile,
  navigateToFolder,
  navigateUp,
  navigateBack,
  navigateForward,
  canGoBack,
  canGoForward,
  onFileSelect,
  onFileRemove,
  onFileUpload,
}) => {
  const dropAreaRef = useRef(null);

  // Create a unified list of items (folders first, then files)
  const items = [
    ...folders.map((folder) => ({
      type: "folder",
      data: folder,
    })),
    ...files.map((file) => ({
      type: "file",
      data: file,
    })),
  ];

  // Parse path for breadcrumb navigation
  const pathSegments = currentPath.split("/").filter(Boolean);

  // This function is handled by the parent component

  // Handle drag and drop
  useEffect(() => {
    const dropArea = dropAreaRef.current;

    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.add("bg-blue-50", "border-blue-300");
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.remove("bg-blue-50", "border-blue-300");
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.remove("bg-blue-50", "border-blue-300");

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const droppedFiles = Array.from(e.dataTransfer.files);
        // Pass the current path to know where to upload the files
        onFileUpload(droppedFiles, currentPath);
      }
    };

    dropArea.addEventListener("dragover", handleDragOver);
    dropArea.addEventListener("dragleave", handleDragLeave);
    dropArea.addEventListener("drop", handleDrop);

    return () => {
      dropArea.removeEventListener("dragover", handleDragOver);
      dropArea.removeEventListener("dragleave", handleDragLeave);
      dropArea.removeEventListener("drop", handleDrop);
    };
  }, [onFileUpload, currentPath]);

  return (
    <div ref={dropAreaRef} className="h-full transition-colors rounded-lg">
      {/* Apple-style Path Navigation */}
      <div className="flex items-center bg-white border-b border-gray-300 rounded">
        {/* Back/Forward Navigation */}
        <div className="flex ">
          <button
            onClick={navigateBack}
            disabled={!canGoBack}
            className={`hover:bg-gray-200 hover:text-white transition-colors ${!canGoBack ? "text-gray-300 cursor-not-allowed" : "text-gray-500"}`}
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
            onClick={navigateForward}
            disabled={!canGoForward}
            className={`hover:bg-gray-200 hover:text-white transition-colors ${!canGoForward ? "text-gray-300 cursor-not-allowed" : "text-gray-500"}`}
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
      </div>

      {/* Unified list of folders and files */}
      <div className="px-1">
        {directory.children.length > 0 ? (
          directory.children.map((item, index) => (
            <div
              key={
                item.type === "folder"
                  ? `folder-${item.name}`
                  : `file-${item.id}`
              }
            >
              {item.type === "folder" ? (
                <FolderItem folder={item} navigateToFolder={navigateToFolder} />
              ) : (
                <FileItem
                  file={item}
                  isActive={activeFile === item.id}
                  onSelect={onFileSelect}
                  onRemove={onFileRemove}
                />
              )}
            </div>
          ))
        ) : (
          <div className="text-gray-500 text-center italic text-sm p-4">
            This folder is empty
          </div>
        )}
      </div>

      {/* Drop indicator - only visible when dragging */}
      <div
        className="hidden absolute inset-0 bg-blue-50 bg-opacity-70 border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center pointer-events-none"
        id="drop-indicator"
      >
        <div className="text-blue-500 font-medium">
          Drop files here to upload to{" "}
          {currentPath === "/" ? "root" : currentPath}
        </div>
      </div>
    </div>
  );
};

export default FolderView;
