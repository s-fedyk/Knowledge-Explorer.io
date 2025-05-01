import React, { useRef, useEffect } from 'react';
import FolderItem from './items/FolderItem';
import FileItem from './items/FileItem';

const FolderView = ({ 
  currentPath, 
  folders, 
  files, 
  activeFile,
  navigateToFolder, 
  navigateUp, 
  onFileSelect, 
  onFileRemove,
  onFileUpload
}) => {
  const dropAreaRef = useRef(null);

  // Create a unified list of items (folders first, then files)
  const items = [
    ...folders.map(folder => ({ 
      type: 'folder', 
      data: folder 
    })),
    ...files.map(file => ({ 
      type: 'file', 
      data: file 
    }))
  ];

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
        // Pass the current path to know where to upload the files
        onFileUpload(droppedFiles, currentPath);
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
  }, [onFileUpload, currentPath]);

  return (
    <div ref={dropAreaRef} className="h-full transition-colors rounded-lg">
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
      
      {/* Unified list of folders and files */}
      <div className="">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div key={item.type === 'folder' ? `folder-${item.data.name}` : `file-${item.data.id}`}>
              {item.type === 'folder' ? (
                <FolderItem 
                  folder={item.data} 
                  navigateToFolder={navigateToFolder} 
                />
              ) : (
                <FileItem 
                  file={item.data}
                  isActive={activeFile === item.data.id}
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
      <div className="hidden absolute inset-0 bg-blue-50 bg-opacity-70 border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center pointer-events-none" id="drop-indicator">
        <div className="text-blue-500 font-medium">
          Drop files here to upload to {currentPath === '/' ? 'root' : currentPath}
        </div>
      </div>
    </div>
  );
};

export default FolderView;
