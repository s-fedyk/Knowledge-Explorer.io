import React from 'react';

const FolderItem = ({ folder, navigateToFolder }) => {
  return (
    <div 
      className="p-2 flex items-center rounded cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => navigateToFolder(folder.name)}
    >
      <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      <div className="truncate text-sm">{folder.name}</div>
    </div>
  );
};

export default FolderItem;
