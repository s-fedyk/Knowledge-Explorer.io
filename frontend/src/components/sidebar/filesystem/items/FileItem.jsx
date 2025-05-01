import React from 'react';

const FileItem = ({ file, isActive, onSelect, onRemove }) => {
  return (
    <div 
      className={`p-2 flex justify-between items-center rounded text-blue-400 cursor-pointer text-sm transition-colors group ${
        isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
      onClick={() => onSelect(file.id)}
    >
      <div className="flex items-center truncate flex-grow">
        <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <div className="truncate">{file.name}</div>
      </div>
    </div>
  );
};

export default FileItem;
