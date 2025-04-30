import React from 'react';

function ChatHistorySelector({ 
  chatHistories, 
  activeChatHistory, 
  onSelectChatHistory, 
  onCreateNewChat 
}) {
  return (
    <div className="flex-1 p-4 border-b border-gray-200 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-black text-lg font-bold">Chats</h2>
        <button 
          onClick={onCreateNewChat}
          className="bg-blue-500 text-white p-1 rounded-full hover:bg-blue-600 w-6 h-6 flex items-center justify-center"
          aria-label="Create new chat"
        >
          +
        </button>
      </div>
      
      <ul>
        {chatHistories.map(history => (
          <li 
            key={history.id} 
            className={`text-black p-2 flex justify-between items-center mb-1 rounded cursor-pointer ${
              activeChatHistory === history.id ? 'bg-blue-100' : 'hover:bg-gray-100'
            }`}
            onClick={() => onSelectChatHistory(history.id)}
          >
            <div className="truncate">{history.name}</div>
          </li>
        ))}
        {chatHistories.length === 0 && (
          <li className="text-black text-center italic">
            No chat histories available
          </li>
        )}
      </ul>
    </div>
  );
}

export default ChatHistorySelector;
