import React, { useRef, useState, useEffect } from 'react';
import EmptyState from './EmptyState';
import FolderView from './FolderView';

const FileSystem = ({ 
  files = {}, 
  activeFile, 
  onFileSelect, 
  onFileUpload, 
  onFileRemove 
}) => {
  const fileInputRef = useRef(null);
  const [currentPath, setCurrentPath] = useState('/');
  const [navigationHistory, setNavigationHistory] = useState(['/']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isFilesystemActive, setIsFilesystemActive] = useState(files && Object.keys(files).length > 0);

  useEffect(() => {
    setIsFilesystemActive(files && Object.keys(files).length > 0);
  }, [files]);

  // Get folder structure
  const getFolderStructure = () => {
    const structure = {};
    
    if (!files) return structure;
    
    Object.entries(files).forEach(([id, file]) => {
      const pathParts = file.path ? file.path.split('/').filter(Boolean) : [];
      let current = structure;
      
      // Build folder structure
      pathParts.forEach(part => {
        if (!current[part]) {
          current[part] = { 
            isFolder: true, 
            items: {} 
          };
        }
        current = current[part].items;
      });
      
      // Add file to appropriate location
      current[file.name] = { id, isFolder: false, ...file };
    });
    
    return structure;
  };

  // Get current folder contents based on path
  const getCurrentFolderContents = () => {
    const structure = getFolderStructure();
    const pathParts = currentPath.split('/').filter(Boolean);
    let current = { isFolder: true, items: structure };
    
    // Navigate to current path
    for (const part of pathParts) {
      if (current.items && current.items[part] && current.items[part].isFolder) {
        current = current.items[part];
      } else {
        // Invalid path, reset to root
        navigateToPath('/');
        return { folders: [], files: [] };
      }
    }
    
    // Separate folders and files
    const folders = [];
    const filesInFolder = [];
    
    if (current.items) {
      Object.entries(current.items).forEach(([name, item]) => {
        if (item.isFolder) {
          folders.push({ name, ...item });
        } else {
          filesInFolder.push({ name, ...item });
        }
      });
    }
    
    return { folders, files: filesInFolder };
  };

  // Navigate to path with history tracking
  const navigateToPath = (newPath) => {
    // Don't add to history if it's the same path
    if (newPath === currentPath) return;
    
    // If we're not at the end of history, truncate the future history
    const newHistory = navigationHistory.slice(0, historyIndex + 1);
    
    // Add new path to history
    newHistory.push(newPath);
    
    // Update state
    setCurrentPath(newPath);
    setNavigationHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Navigate to folder
  const navigateToFolder = (folderName) => {
    const newPath = currentPath === '/' 
      ? `/${folderName}` 
      : `${currentPath}${currentPath.endsWith('/') ? '' : '/'}${folderName}`;
    
    navigateToPath(newPath);
  };

  // Navigate up one level
  const navigateUp = () => {
    if (currentPath === '/') return;
    
    const pathParts = currentPath.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      pathParts.pop();
      const newPath = pathParts.length === 0 ? '/' : `/${pathParts.join('/')}/`;
      navigateToPath(newPath);
    }
  };

  // Navigate back in history
  const navigateBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentPath(navigationHistory[historyIndex - 1]);
    }
  };

  // Navigate forward in history
  const navigateForward = () => {
    if (historyIndex < navigationHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentPath(navigationHistory[historyIndex + 1]);
    }
  };

  // Handle file upload with optional target path
  const handleFileUpload = (files, targetPath = currentPath) => {
    if (files && files.length > 0) {
      onFileUpload(files, targetPath);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Empty State / Upload UI
  if (!isFilesystemActive) {
    return <EmptyState onFileUpload={(files) => handleFileUpload(files, '/')} />;
  }

  // Active File System UI
  const { folders, files: filesInCurrentFolder } = getCurrentFolderContents();
  
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
        folders={folders}
        files={filesInCurrentFolder}
        activeFile={activeFile}
        navigateToFolder={navigateToFolder}
        navigateUp={navigateUp}
        navigateBack={navigateBack}
        navigateForward={navigateForward}
        canGoBack={historyIndex > 0}
        canGoForward={historyIndex < navigationHistory.length - 1}
        onFileSelect={onFileSelect}
        onFileRemove={onFileRemove}
        onFileUpload={handleFileUpload}
      />
    </div>
  );
};

export default FileSystem;
