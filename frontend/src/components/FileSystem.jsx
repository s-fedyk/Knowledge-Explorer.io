import React, { useRef, useEffect } from 'react';

function FileSystem({ 
  files, 
  activeFile, 
  onFileSelect, 
  onFileUpload, 
  onFileRemove 
}) {
  const fileInputRef = useRef(null);
  const dropAreaRef = useRef(null);

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

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <h2 className="text-lg font-bold mb-3">RAG Documents</h2>
      
      {/* Upload Button */}
      <button 
        onClick={() => fileInputRef.current?.click()}
        className="bg-blue-500 text-white p-2 rounded mb-3 hover:bg-blue-600 flex items-center justify-center w-full"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Upload Files
      </button>
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileInputChange} 
        multiple 
      />
      
      {/* Drag & Drop Area */}
      <div 
        ref={dropAreaRef}
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 mb-3 text-center text-sm transition-colors"
      >
        Drag & drop files here
      </div>
      
      {/* File List */}
      <div>
        {Object.keys(files).length === 0 ? (
          <div className="text-gray-500 text-center italic text-sm">
            No files uploaded
          </div>
        ) : (
          <ul>
            {Object.entries(files).map(([id, file]) => (
              <li 
                key={id} 
                className={`p-2 flex justify-between items-center mb-1 rounded cursor-pointer text-sm ${
                  activeFile === id ? 'bg-blue-100' : 'hover:bg-gray-50'
                }`}
                onClick={() => onFileSelect(id)}
              >
                <div className="truncate flex-grow">{file.name}</div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileRemove(id);
                  }}
                  className="text-red-500 hover:text-red-700"
                  aria-label="Remove file"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default FileSystem;
