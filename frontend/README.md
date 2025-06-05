# Frontend Application

This directory contains the frontend of the RAG document chat application, built with React and Vite.

## Features

- User-friendly interface for interacting with the RAG backend.
- File uploading and management for documents to be processed.
- Chat interface for asking questions and receiving answers from the RAG system.
- Graph visualization of document relationships and knowledge connections.
- Multiple query modes for different information retrieval strategies.
- Tabbed view for managing multiple chats, documents, or graph views.

## Project Structure

The `src` directory contains the core of the application:

- **`main.jsx`**: The entry point of the application.
- **`App.tsx`**: The main application component that sets up routing and layout.
- **`api/`**: Contains Apollo Client setup (`apollo.ts`) and GraphQL queries (`query.ts`) for backend communication.
- **`assets/`**: Static assets like fonts and images.
- **`components/`**: Reusable React components.
    - **`sidebar/`**: Components for the main navigation sidebar, including query mode selection and file system navigation.
        - `NavSidebar.tsx`: The main sidebar component.
        - `QueryModeSelector.tsx`: Allows users to switch between different RAG query modes.
        - `filesystem/`: Components for displaying and interacting with the file system.
    - **`tabview/`**: Components related to the tabbed interface.
        - `TabView.tsx`: Manages the tabs and their content.
        - `Tab.tsx`: Represents an individual tab.
        - `ChatWindow.jsx`: The component for the chat interface.
        - `FileView.jsx`: Component for displaying document content.
        - `GraphView.tsx`: Component for visualizing the knowledge graph.
        - `MessageBlocks.tsx`, `MessageBubble.tsx`, `MessageList.tsx`: Components for rendering chat messages.
- **`context/`**: React Context providers for managing global application state.
    - `ChatHistoryContext.tsx`: Manages chat history.
    - `FileSystemContext.tsx`: Manages file system state.
    - `FileViewerContext.tsx`: Manages the state of the file viewer.
    - `GraphViewContext.tsx`: Manages graph view state.
    - `MessageContext.tsx`: Manages incoming messages.
    - `QueryModeContext.tsx`: Manages the selected query mode.
    - `TabContext.tsx`: Manages the state of the tabs.
- **`types/`**: TypeScript type definitions, organized by domain (api, filesystem).

## Getting Started

### Prerequisites

- Node.js (version 18.x or later recommended)
- npm or yarn

### Setup & Development

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Set up environment variables:**
    Create a `.env.development` file in the `frontend` directory. You'll likely need to configure the backend API endpoint. For example:
    ```
    VITE_API_BASE_URL=http://localhost:8000/api/v1
    ```
    Refer to `.env.development` or consult the backend setup for the correct API URL.

4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    # yarn dev
    ```
    This will start the Vite development server, typically at `http://localhost:5173`.

### Building for Production

1.  **Build the application:**
    ```bash
    npm run build
    # or
    # yarn build
    ```
    This command compiles the React application and outputs the static files to the `dist` directory.

2.  **Preview the production build (optional):**
    ```bash
    npm run preview
    # or
    # yarn preview
    ```

## Key Components Overview

-   **`App.tsx`**: The root component, orchestrates the main layout including the `NavSidebar` and `TabView`.
-   **`NavSidebar.tsx`**: Provides navigation, file system browsing, and query mode selection.
-   **`TabView.tsx`**: Allows users to open multiple tabs, each potentially containing a `ChatWindow`, `FileView`, or `GraphView`.
-   **`ChatWindow.jsx`**: Handles the user interaction for sending queries to the backend and displaying the responses.
-   **`GraphView.tsx`**: Renders the knowledge graph data fetched from the backend, showing relationships between entities.
-   **`FileView.jsx`**: Displays the content of selected documents, often PDFs.

## State Management

The application uses React Context for managing global state across different parts of the application. Key contexts include:
- `TabContext`: Manages the active tabs and their content.
- `FileSystemContext`: Handles the state of the browsable file system.
- `QueryModeContext`: Keeps track of the currently selected query mode for the RAG system.
