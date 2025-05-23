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
import { QueryModeProvider } from "@context/QueryModeContext";
import NavSidebar from "./components/sidebar/NavSidebar";
import TabView from "./components/tabview/TabView";
import { GoogleOAuthProvider } from "@react-oauth/google";
// TODO putting this in public might be a bit more prod-ready.
import { pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <ApolloProvider client={client}>
      <QueryModeProvider>
        <TabProvider>
          <FileSystemProvider>
            <MessageProvider>
              <div
                className="flex h-screen w-screen border border-gray-400 bg-gray-100"
                style={{ height: "100dvh" }}
              >
                {/* Overlay for mobile when sidebar is open - blur backdrop with transition */}
                <div
                  className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ease-in-out ${
                    isSidebarOpen
                      ? "backdrop-blur-sm opacity-100 visible"
                      : "backdrop-blur-none opacity-0 invisible"
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                />

                {/* Navigation Sidebar - now responsive */}
                <div
                  className={`
                    fixed z-50 h-full transition-transform duration-300 ease-in-out will-change-transform
                    ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
                    md:relative md:translate-x-0
                  `}
                >
                  <NavSidebar onClose={() => setIsSidebarOpen(false)} />
                </div>

                {/* TabView with toggle button */}
                <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
                  <TabView
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                  />
                </div>
              </div>
            </MessageProvider>
          </FileSystemProvider>
        </TabProvider>
      </QueryModeProvider>
    </ApolloProvider>
  );
}

export default App;
