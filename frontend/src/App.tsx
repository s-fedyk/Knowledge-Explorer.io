import { useState, useEffect } from "react";
import "./App.css";
import { NodeType } from "./types/filesystem/Node";
import type { Folder } from "./types/filesystem/Node";
import { nanoid } from "nanoid";
import { Client } from "./api/query.ts";

import ChatWindow from "./components/ChatWindow";
import NavSidebar from "./components/sidebar/NavSidebar";

const useRAG = () => {
  const [documents, setDocuments] = useState({});

  const addDocument = (id, content, filename) => {
    setDocuments((prev) => ({
      ...prev,
      [id]: { content, filename },
    }));
  };

  const removeDocument = (id) => {
    setDocuments((prev) => {
      const newDocs = { ...prev };
      delete newDocs[id];
      return newDocs;
    });
  };

  const search = (query) => {
    const results = [];

    Object.entries(documents).forEach(([id, doc]) => {
      const content = doc.content.toLowerCase();
      const queryTerms = query.toLowerCase().split(" ");

      const relevance =
        queryTerms.filter((term) => content.includes(term)).length /
        queryTerms.length;

      if (relevance > 0) {
        const firstMatch = queryTerms.find((term) => content.includes(term));
        if (firstMatch) {
          const matchIndex = content.indexOf(firstMatch);
          const start = Math.max(0, matchIndex - 100);
          const end = Math.min(content.length, matchIndex + 100);
          const snippet = content.substring(start, end);

          results.push({
            id,
            relevance,
            snippet: `...${snippet}...`,
            filename: doc.filename,
          });
        }
      }
    });

    return results.sort((a, b) => b.relevance - a.relevance);
  };

  const generateResponse = (query) => {
    const results = search(query);

    if (results.length === 0) {
      return "I couldn't find any relevant information in your documents to answer that question.";
    }

    const topResult = results[0];

    return `Based on the document "${topResult.filename}", I found this relevant information: ${topResult.snippet}`;
  };

  return { addDocument, removeDocument, generateResponse, documents };
};

function App() {
  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState({});
  const [directory, setDirectory] = useState<Folder>({
    id: "root",
    name: "/",
    type: NodeType.Folder,
    children: {} as Record<string, Node>,
  });
  const [activeFile, setActiveFile] = useState(null);
  const [chatHistories, setChatHistories] = useState([
    { id: "1", name: "Research Project" },
    { id: "2", name: "Meeting Notes" },
    { id: "3", name: "Personal Chat" },
  ]);
  const [activeChatHistory, setActiveChatHistory] = useState(null);
  const { addDocument, removeDocument, generateResponse } = useRAG();

  // Process uploaded files
  const processFiles = async (uploadedFiles) => {
    const newFileNodes: File[] = await Promise.all(
      Array.from(uploadedFiles).map(async (file) => {
        const content = await readFileContent(file);

        return {
          id: nanoid(),
          name: file.name,
          type: NodeType.File,
          size: file.size,
          mimeType: file.type,
          parent: directory,
        };
      }),
    );

    const updatedDirectory: Folder = {
      ...directory,
    };

    newFileNodes.forEach((element: File) => {
      updatedDirectory.children[element.id] = element;
    });

    setDirectory(updatedDirectory);
  };

  const readFileContent = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsText(file);
    });
  };

  const removeFile = (fileId) => {
    const updatedDirectory: Folder = {
      ...directory,
    };

    delete updatedDirectory.children[fileId];
    setDirectory(updatedDirectory);

    if (activeFile === fileId) {
      setActiveFile(null);
    }
  };

  const addMessage = (sender, text) => {
    setMessages((prev) => [...prev, { sender, text, timestamp: new Date() }]);
  };

  const handleSendMessage = async (userMessage) => {
    // Add user message
    addMessage("user", userMessage);

    const queryRequest: QueryRequest = {
      query: userMessage,
      similarity_top_k: 3,
    };

    const response: QueryResponse = await Client.query(queryRequest);

    // Generate response with a small delay to simulate processing
    addMessage("bot", response.answer);
  };

  // Create new chat history
  const createNewChatHistory = () => {
    const newId = Date.now().toString();
    const newHistory = { id: newId, name: `Chat ${chatHistories.length + 1}` };
    setChatHistories((prev) => [...prev, newHistory]);
    setActiveChatHistory(newId);
    setMessages([]);
  };

  // Handle chat history selection
  const selectChatHistory = (id) => {
    setActiveChatHistory(id);
    // In a real app, you would load messages from storage/database here
    setMessages([]);
  };

  return (
    <div className="flex w-screen h-screen bg-gray-100">
      {/* Navigation Sidebar Component */}
      <NavSidebar
        chatHistories={chatHistories}
        activeChatHistory={activeChatHistory}
        onSelectChatHistory={selectChatHistory}
        onCreateNewChat={createNewChatHistory}
        files={files}
        directory={directory}
        activeFile={activeFile}
        onFileSelect={setActiveFile}
        onFileUpload={processFiles}
        onFileRemove={removeFile}
      />

      {/* Chat Window */}
      <ChatWindow messages={messages} onSendMessage={handleSendMessage} />
    </div>
  );
}

export default App;
