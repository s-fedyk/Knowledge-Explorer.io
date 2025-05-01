import React from 'react';

const FolderItem = ({ folder, navigateToFolder }) => {
  return (
    <div 
      className="p-2 flex items-center rounded-md cursor-pointer hover:bg-blue-50 transition-colors group"
      onClick={() => navigateToFolder(folder.name)}
    >
      <div className="w-8 h-8 mr-2 flex items-center justify-center text-yellow-500 bg-yellow-50 rounded group-hover:bg-yellow-100 transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-700 truncate">{folder.name}</div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
};

export default FolderItem;
