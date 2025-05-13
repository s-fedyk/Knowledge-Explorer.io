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
export const FileSystemProvider = ({ children }) => {
  const [activeFile, setActiveFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [directory, setDirectory] = useState([]);

  // Fetch documents on initial render
  useEffect(() => {
    const fetchDocuments = async () => {
      setIsLoading(true);
      try {
        const documents = await Client.listDocuments();
        console.log(documents);
        setDirectory(documents);
      } catch (err) {
        console.error("Error fetching documents:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  // Handle file selection
  const handleFileSelect = (file) => {
    setActiveFile(file);
  };

  const value = {
    directory,
    isLoading,
    activeFile,
    handleFileSelect,
  };

  return (
    <FileSystemContext.Provider value={value}>
      {children}
    </FileSystemContext.Provider>
  );
};
