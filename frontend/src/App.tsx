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
// Configuration for react-pdf to load its worker.
// This is essential for PDF rendering capabilities within the application.
import { pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// The main App component, serving as the root of the React application.
function App() {
  // State to manage the visibility of the navigation sidebar, especially on mobile devices.
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // The entire application is wrapped in various context providers.
  // This allows descendant components to access shared state and functions.
  // - ApolloProvider: Connects the app to the GraphQL backend via Apollo Client.
  // - QueryModeProvider: Manages the current RAG query mode (e.g., local, global).
  // - TabProvider: Manages the state of open tabs in the TabView.
  // - FileSystemProvider: Manages the state of the file system navigation.
  // - MessageProvider: Manages messages, likely for chat or notifications.
  return (
    <ApolloProvider client={client}>
      <QueryModeProvider>
        <TabProvider>
          <FileSystemProvider>
            <MessageProvider>
              {/* Main application container. Uses flexbox for layout. */}
              {/* `h-screen` and `w-screen` make it take full viewport height and width. */}
              {/* `style={{ height: "100dvh" }}` ensures it respects mobile viewport height. */}
              <div
                className="flex h-screen w-screen border border-gray-400 bg-gray-100"
                style={{ height: "100dvh" }} // Dynamic viewport height for mobile browsers
              >
                {/* Overlay for mobile/tablet when sidebar is open. */}
                {/* This darkens or blurs the background and allows closing the sidebar by clicking outside. */}
                <div
                  className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ease-in-out ${
                    isSidebarOpen
                      ? "backdrop-blur-sm opacity-100 visible" // Visible with blur when sidebar is open
                      : "backdrop-blur-none opacity-0 invisible" // Hidden when sidebar is closed
                  }`}
                  onClick={() => setIsSidebarOpen(false)} // Closes sidebar on overlay click.
                />

                {/* Navigation Sidebar container. */}
                {/* Handles responsive behavior:
                    - Mobile: Slides in from the left, overlays content.
                    - Desktop (md breakpoint and up): Stays fixed on the left.
                */}
                <div
                  className={`
                    fixed z-50 h-full transition-transform duration-300 ease-in-out will-change-transform
                    ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} // Slides in/out on mobile
                    md:relative md:translate-x-0 // Static position on desktop
                  `}
                >
                  {/* The NavSidebar component itself. */}
                  {/* `onClose` prop allows the sidebar to close itself (e.g., via an internal button). */}
                  <NavSidebar onClose={() => setIsSidebarOpen(false)} />
                </div>

                {/* Main content area, primarily holding the TabView. */}
                {/* `flex-1` allows it to take remaining space. `flex-col` for vertical layout. */}
                {/* `min-h-0` and `min-w-0` are important for flex items to shrink correctly. */}
                {/* `overflow-hidden` prevents content from spilling out. */}
                <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
                  {/* TabView component, which manages different views like chat, file display, graph. */}
                  {/* `onToggleSidebar` prop provides a function to the TabView (e.g., for a hamburger button)
                      to control the sidebar's visibility. */}
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
