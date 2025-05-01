import React, { useRef, useEffect, useState } from 'react';

const FileSystem = ({ 
  files = {}, 
  activeFile, 
  onFileSelect, 
  onFileUpload, 
  onFileRemove 
}) => {
  const fileInputRef = useRef(null);
  const dropAreaRef = useRef(null);
  const [currentPath, setCurrentPath] = useState('/');
  const [isFilesystemActive, setIsFilesystemActive] = useState(files && Object.keys(files).length > 0);

  useEffect(() => {
    setIsFilesystemActive(files && Object.keys(files).length > 0);
  }, [files]);

  // Handle drag and drop
  useEffect(() => {
    const dropArea = dropAreaRef.current;
    
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.add('bg-blue-50', 'border-blue-300');
    };
    
    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.remove('bg-blue-50', 'border-blue-300');
    };
    
    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.remove('bg-blue-50', 'border-blue-300');
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const droppedFiles = Array.from(e.dataTransfer.files);
        onFileUpload(droppedFiles);
      }
    };
    
    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('dragleave', handleDragLeave);
    dropArea.addEventListener('drop', handleDrop);
    
    return () => {
      dropArea.removeEventListener('dragover', handleDragOver);
      dropArea.removeEventListener('dragleave', handleDragLeave);
      dropArea.removeEventListener('drop', handleDrop);
    };
  }, [onFileUpload]);

  // Handle file input change
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const uploadedFiles = Array.from(e.target.files);
      onFileUpload(uploadedFiles);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
        setCurrentPath('/');
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

  // Navigate to folder
  const navigateToFolder = (folderName) => {
    const newPath = currentPath === '/' 
      ? `/${folderName}` 
      : `${currentPath}${currentPath.endsWith('/') ? '' : '/'}${folderName}`;
    setCurrentPath(newPath);
  };

  // Navigate up one level
  const navigateUp = () => {
    const pathParts = currentPath.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      pathParts.pop();
      setCurrentPath(pathParts.length === 0 ? '/' : `/${pathParts.join('/')}/`);
    }
  };

  // Empty State / Upload UI
  if (!isFilesystemActive) {
    return (
      <div className="h-full">
                {/* Static Image for Drag & Drop */}
        <div 
          ref={dropAreaRef}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center transition-colors flex flex-col items-center justify-center hover:bg-blue-50 h-full w-full"
        >
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileInputChange} 
          multiple 
          webkitdirectory="true"
          directory="true"
        />
      </div>
    );
  }

  // Active File System UI
  const { folders, files: filesInCurrentFolder } = getCurrentFolderContents();
  
  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">Knowledge Base</h2>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-500 text-white p-1 rounded hover:bg-blue-600 flex items-center justify-center text-sm"
          title="Upload more files"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileInputChange} 
        multiple 
        webkitdirectory="true"
        directory="true"
      />
      
      {/* Path Navigation */}
      <div className="flex items-center mb-3 bg-gray-50 p-2 rounded">
        <button 
          onClick={navigateUp}
          disabled={currentPath === '/'}
          className={`mr-2 text-gray-500 ${currentPath === '/' ? 'opacity-50 cursor-not-allowed' : 'hover:text-gray-700'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-sm font-mono truncate">
          {currentPath === '/' ? 'Root' : currentPath}
        </div>
      </div>
      
      {/* Folders and Files */}
      <div className="space-y-1">
        {/* Folders */}
        {folders.map((folder) => (
          <div 
            key={folder.name}
            className="p-2 flex items-center rounded cursor-pointer hover:bg-gray-50"
            onClick={() => navigateToFolder(folder.name)}
          >
            <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <div className="truncate text-sm">{folder.name}</div>
          </div>
        ))}
        
        {/* Files */}
        {filesInCurrentFolder.map((file) => (
          <div 
            key={file.id}
            className={`p-2 flex justify-between items-center rounded cursor-pointer text-sm ${
              activeFile === file.id ? 'bg-blue-100' : 'hover:bg-gray-50'
            }`}
            onClick={() => onFileSelect(file.id)}
          >
            <div className="flex items-center truncate flex-grow">
              <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="truncate">{file.name}</div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onFileRemove(file.id);
              }}
              className="text-red-500 hover:text-red-700 ml-2"
              aria-label="Remove file"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        
        {folders.length === 0 && filesInCurrentFolder.length === 0 && (
          <div className="text-gray-500 text-center italic text-sm p-4">
            This folder is empty
          </div>
        )}
      </div>
    </div>
  );
};

export default FileSystem;
