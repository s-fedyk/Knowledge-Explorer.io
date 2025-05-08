import React, { createContext, useContext, useEffect, useState } from "react";
import { Client } from "@api/query.ts";

// Create context
const FileSystemContext = createContext();

/**
 * Custom hook to use the FileSystemContext
 * @returns {Object} FileSystemContext value
 */
export const useFileSystemContext = () => {
  const context = useContext(FileSystemContext);
  if (!context) {
    throw new Error(
      "useFileSystemContext must be used within a FileSystemProvider",
    );
  }
  return context;
};

/**
 * Provider component for FileSystemContext
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {Object} props.initialDirectory - Initial directory structure
 * @param {string|null} props.initialActiveFile - Initial active file
 */
export const FileSystemProvider = ({ children, initialActiveFile = null }) => {
  const [file, setActiveFile] = useState(initialActiveFile);
  const [currentPath, setCurrentPath] = useState("/");
  const [navigationHistory, setNavigationHistory] = useState(["/"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [directory, setDirectory] = useState([]);

  // Fetch documents on initial render
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const documents = await Client.listDocuments();
        setDirectory(documents);
      } catch (err) {
        console.error("Error fetching documents:", err);
      }
    };

    fetchDocuments();
  }, []);

  // Handle file selection
  const handleFileSelect = (file) => {
    console.log("selecting", file);
    setActiveFile(file);
  };

  const handleFileRemove = (filePath) => {
    // Implementation depends on your file removal logic
    const newDirectory = { ...directory };

    // Remove file from directory
    // ... file removal logic here

    setDirectory(newDirectory);

    // If the removed file was active, clear active file
    if (file === filePath) {
      setActiveFile(null);
    }
  };

  // Navigate to a folder
  const navigateToFolder = (path) => {
    // Update current path
    setCurrentPath(path);

    // Update navigation history
    const newHistory = navigationHistory.slice(0, historyIndex + 1);
    newHistory.push(path);
    setNavigationHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Navigate back
  const navigateBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentPath(navigationHistory[newIndex]);
    }
  };

  // Navigate forward
  const navigateForward = () => {
    if (historyIndex < navigationHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentPath(navigationHistory[newIndex]);
    }
  };

  const value = {
    directory,
    file,
    currentPath,
    navigationHistory,
    historyIndex,
    canGoBack: historyIndex > 0,
    canGoForward: historyIndex < navigationHistory.length - 1,
    handleFileSelect,
    handleFileRemove,
    navigateToFolder,
    navigateBack,
    navigateForward,
  };

  return (
    <FileSystemContext.Provider value={value}>
      {children}
    </FileSystemContext.Provider>
  );
};
