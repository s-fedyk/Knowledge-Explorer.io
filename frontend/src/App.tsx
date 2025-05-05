import { useState, useEffect } from "react";
import "./App.css";
import { NodeType } from "./types/filesystem/Node";
import type { Folder } from "./types/filesystem/Node";
import { nanoid } from "nanoid";
import { Client } from "./api/query.ts";

import NavSidebar from "./components/sidebar/NavSidebar";
import TabView from "./components/tabview/TabView";

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

  return { addDocument, removeDocument, documents };
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
  const [chatHistories, setChatHistories] = useState([
    { id: "1", name: "Research Project" },
    { id: "2", name: "Meeting Notes" },
    { id: "3", name: "Personal Chat" },
  ]);
  const [activeChatHistory, setActiveChatHistory] = useState(null);

  const testGraphAPI = async () => {
    try {
      const documentIds = Object.keys(directory.children);
      const testGraphResponse = await Client.getGraphData({
        documentIds,
        limit: 20,
      });

      console.log("Test graph API response:", testGraphResponse);
      addMessage(
        "system",
        `Graph data retrieved: ${testGraphResponse.nodes.length} nodes and ${testGraphResponse.relationships.length} relationships`,
      );

      console.log("here", testGraphResponse.nodes);
      // build your new "Graph" tab
      const graphTab = {
        id: nanoid(), // or whatever unique id you like
        name: "Graph",
        type: "graph",
        nodes: testGraphResponse.nodes,
        relationships: testGraphResponse.relationships,
      };
    } catch (error) {
      console.error("Test graph API failed:", error);
      addMessage("system", `Failed to retrieve graph data: ${error.message}`);
    }
  };

  useEffect(() => {
    // Only run this once when the component is mounted
    testGraphAPI();
  }, []);

  const { addDocument, removeDocument } = useRAG();

  // Process uploaded files
  const processFiles = async (uploadedFiles) => {
    const newFileNodes: File[] = await Promise.all(
      Array.from(uploadedFiles).map(async (file) => {
        const content = await readFileContent(file);
        const fileId = nanoid();

        // Determine file type
        let fileType = "text";
        if (file.type === "application/pdf") {
          fileType = "pdf";
        }

        // Store file in RAG system
        addDocument(fileId, content, file.name);

        return {
          id: fileId,
          name: file.name,
          type: NodeType.File,
          size: file.size,
          mimeType: file.type,
          fileType: fileType,
          content: content,
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

      if (file.type === "application/pdf") {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const removeFile = (fileId) => {
    const updatedDirectory: Folder = {
      ...directory,
    };

    delete updatedDirectory.children[fileId];
    setDirectory(updatedDirectory);

    // Close tab if open
    closeTab(fileId);

    // Remove from RAG system
    removeDocument(fileId);
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

    try {
      const response: QueryResponse = await Client.query(queryRequest);

      // Add bot response
      addMessage("bot", response.answer);

      // Extract and open file references
      extractReferences(response.answer);
    } catch (error) {
      // Fallback response if API call fails
      addMessage("bot", generateResponse(userMessage));
    }
  };

  // Extract file references from bot response
  const extractReferences = (text) => {
    // Look for file references in the format "document name"
    const fileRegex = /"([^"]+)"/g;
    const matches = [...text.matchAll(fileRegex)];

    matches.forEach((match) => {
      const filename = match[1];
      // Find the file by name
      const fileEntry = Object.values(directory.children).find(
        (file) => file.name === filename,
      );

      if (fileEntry) {
        openFileTab(
          fileEntry.id,
          fileEntry.name,
          fileEntry.fileType,
          fileEntry.content,
        );
      }
    });
  };

  // Close a tab
  const closeTab = (tabId) => {
    // Don't allow closing the chat tab
    if (tabId === "chat") return;

    // If the active tab is being closed, switch to chat
    if (activeTabId === tabId) {
      setActiveTabId("chat");
    }
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

  // Handle file selection from sidebar
  const handleFileSelect = (fileId) => {
    const fileNode = directory.children[fileId];
    if (fileNode) {
      // Determine file type based on mime type
      let fileType = "text";
      if (fileNode.mimeType === "application/pdf") {
        fileType = "pdf";
      }

      openFileTab(fileId, fileNode.name, fileType, fileNode.content);
    }
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
        onFileSelect={handleFileSelect}
        onFileUpload={processFiles}
        onFileRemove={removeFile}
      />

      {/* TabView with Chat and File tabs */}
      <TabView
        chatID={1}
        chatProps={{
          messages: messages,
          onSendMessage: handleSendMessage,
        }}
      />
    </div>
  );
}

export default App;
