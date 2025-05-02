import React, { useRef, useEffect } from "react";
import FolderItem from "./items/FolderItem";
import EmptyState from "./EmptyState";

import FileItem from "./items/FileItem";

const FolderView = ({
  currentPath,
  folders,
  directory,
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
    <div ref={dropAreaRef} className="transition-colors rounded-lg h-full">
      {/* Apple-style Path Navigation */}
      <div className="flex items-center bg-white border-b border-gray-300 rounded">
        {/* Back/Forward Navigation */}
      </div>

      {/* Unified list of folders and files */}
      {Object.keys(directory.children).length > 0 ? (
        Object.values(directory.children).map((item) => (
          <div
            key={
              item.type === "folder" ? `folder-${item.name}` : `file-${item.id}`
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
        <EmptyState onFileUpload={(files) => onFileUpload(files, "/")} />
      )}

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
