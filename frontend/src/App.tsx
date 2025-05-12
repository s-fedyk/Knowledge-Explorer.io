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

import { GoogleOAuthProvider } from "@react-oauth/google";

// TODO putting this in public might be a bit more prod-ready.
import { pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function App() {
  return (
    <GoogleOAuthProvider clientId={OAUTH_CLIENT_ID}>
      <ApolloProvider client={client}>
        <TabProvider>
          <FileSystemProvider>
            <MessageProvider>
              {/* Use h-screen but remove w-screen */}
              <div className="flex h-screen w-screen bg-gray-100">
                {/* Navigation Sidebar Component */}
                <NavSidebar />
                {/* TabView with Chat and File tabs - no overflow-hidden here */}
                <div className="flex-1">
                  <TabView />
                </div>
              </div>
            </MessageProvider>
          </FileSystemProvider>
        </TabProvider>
      </ApolloProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
