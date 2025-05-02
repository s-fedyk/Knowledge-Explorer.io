import { useState } from "react";
import "./App.css";
import { NodeType } from "./components/sidebar/filesystem/Node";
import type { Folder } from "./components/sidebar/filesystem/Node";

import ChatWindow from "./components/ChatWindow";
import NavSidebar from "./components/sidebar/NavSidebar";

// Simple RAG implementation for demonstration
const useRAG = () => {
  const [documents, setDocuments] = useState({});

  // Add a document to the knowledge base
  const addDocument = (id, content, filename) => {
    setDocuments((prev) => ({
      ...prev,
      [id]: { content, filename },
    }));
  };

  // Remove a document from the knowledge base
  const removeDocument = (id) => {
    setDocuments((prev) => {
      const newDocs = { ...prev };
      delete newDocs[id];
      return newDocs;
    });
  };

  // Simple search function (in a real app, you'd use vector embeddings)
  const search = (query) => {
    const results = [];

    // Very basic search implementation
    Object.entries(documents).forEach(([id, doc]) => {
      const content = doc.content.toLowerCase();
      const queryTerms = query.toLowerCase().split(" ");

      // Check if any query terms exist in the document
      const relevance =
        queryTerms.filter((term) => content.includes(term)).length /
        queryTerms.length;

      if (relevance > 0) {
        // Find a snippet around the first matching term
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

    // Sort by relevance
    return results.sort((a, b) => b.relevance - a.relevance);
  };

  // Generate a response based on the query and documents
  const generateResponse = (query) => {
    const results = search(query);

    if (results.length === 0) {
      return "I couldn't find any relevant information in your documents to answer that question.";
    }

    // In a real RAG system, you would send the query and relevant document snippets
    // to an LLM API (like OpenAI) to generate a coherent response
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
    children: [],
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
        const fileId = `${Date.now()}-${file.name}`;
        const content = await readFileContent(file);

        return {
          id: fileId,
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
      children: [...directory.children, ...newFileNodes],
    };
    setDirectory(updatedDirectory);

    for (const file of uploadedFiles) {
      const fileId = Date.now() + "-" + file.name;

      // Read file content
      const content = await readFileContent(file);

      // Add to files state
      setFiles((prev) => ({
        ...prev,
        [fileId]: { name: file.name, content },
      }));

      // Add to RAG system
      addDocument(fileId, content, file.name);

      // Add system message
      addMessage("system", `File uploaded: ${file.name}`);
    }
  };

  const readFileContent = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsText(file);
    });
  };

  const removeFile = (fileId) => {
    setFiles((prev) => {
      const newFiles = { ...prev };
      delete newFiles[fileId];
      return newFiles;
    });

    // Remove from RAG
    removeDocument(fileId);

    // Add system message
    addMessage("system", `File removed: ${files[fileId].name}`);

    // Clear active file if it was the one removed
    if (activeFile === fileId) {
      setActiveFile(null);
    }
  };

  const addMessage = (sender, text) => {
    setMessages((prev) => [...prev, { sender, text, timestamp: new Date() }]);
  };

  const handleSendMessage = (userMessage) => {
    // Add user message
    addMessage("user", userMessage);

    // Generate response with a small delay to simulate processing
    setTimeout(() => {
      const response = generateResponse(userMessage);
      addMessage("bot", response);
    }, 500);
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
