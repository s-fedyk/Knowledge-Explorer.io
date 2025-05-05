import React from "react";
import { useChatHistoryContext } from "@context/ChatHistoryContext";

/**
 * ChatHistorySelector component for displaying and selecting chat histories
 */
function ChatHistorySelector() {
  const {
    chatHistories,
    activeChatHistory,
    handleSelectChatHistory,
    handleCreateNewChat,
  } = useChatHistoryContext();

  return (
    <div className="flex flex-col h-full">
      {/* Header stays fixed */}
      <div className="flex justify-between items-center p-2 border-b border-gray-400">
        <h2 className="text-black text-lg font-bold">Chats</h2>
        <button
          onClick={handleCreateNewChat}
          className="bg-blue-500 text-white p-1 rounded-full hover:bg-blue-600 w-6 h-6 flex items-center justify-center"
          aria-label="Create new chat"
        >
          +
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ul className="">
          {chatHistories.map((history) => (
            <li
              key={history.id}
              className={`text-black p-2 flex justify-between items-center cursor-pointer ${
                activeChatHistory === history.id
                  ? "bg-gray-100"
                  : "hover:bg-blue-50"
              }`}
              onClick={() => handleSelectChatHistory(history.id)}
            >
              <div className="truncate">{history.name}</div>
            </li>
          ))}
          {chatHistories.length === 0 && (
            <li className="text-black text-center italic p-2">
              No chat histories available
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default ChatHistorySelector;
