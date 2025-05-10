import { useState, useEffect } from "react";
import "./App.css";
import { NodeType } from "./types/filesystem/Node";
import type { Folder } from "./types/filesystem/Node";
import { nanoid } from "nanoid";
import { client } from "./api/apollo.ts";
import { ApolloProvider } from "@apollo/client";
import { TabProvider } from "@context/TabContext";
import { MessageProvider } from "@context/MessageContext";
import { FileSystemProvider } from "@context/FileSystemContext";

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
    <ApolloProvider client={client}>
      <TabProvider>
        <FileSystemProvider>
          <MessageProvider>
            {/* Use h-screen but remove w-screen */}
            <div className="flex h-screen w-screen bg-gray-100">
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

              {/* TabView with Chat and File tabs - no overflow-hidden here */}
              <div className="flex-1">
                <TabView />
              </div>
            </div>
          </MessageProvider>
        </FileSystemProvider>
      </TabProvider>
    </ApolloProvider>
  );
}

export default App;
