import { useState, useRef, useEffect } from 'react';
import './App.css'; // Keep this if you're keeping some of the original styles

// Simple RAG implementation for demonstration
const useRAG = () => {
  const [documents, setDocuments] = useState({});
  
  // Add a document to the knowledge base
  const addDocument = (id, content, filename) => {
    setDocuments(prev => ({
      ...prev,
      [id]: { content, filename }
    }));
  };
  
  // Remove a document from the knowledge base
  const removeDocument = (id) => {
    setDocuments(prev => {
      const newDocs = {...prev};
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
      const queryTerms = query.toLowerCase().split(' ');
      
      // Check if any query terms exist in the document
      const relevance = queryTerms.filter(term => 
        content.includes(term)
      ).length / queryTerms.length;
      
      if (relevance > 0) {
        // Find a snippet around the first matching term
        const firstMatch = queryTerms.find(term => content.includes(term));
        if (firstMatch) {
          const matchIndex = content.indexOf(firstMatch);
          const start = Math.max(0, matchIndex - 100);
          const end = Math.min(content.length, matchIndex + 100);
          const snippet = content.substring(start, end);
          
          results.push({
            id,
            relevance,
            snippet: `...${snippet}...`,
            filename: doc.filename
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
  const [inputValue, setInputValue] = useState('');
  const [files, setFiles] = useState({});
  const [activeFile, setActiveFile] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { addDocument, removeDocument, generateResponse, documents } = useRAG();

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = async (e) => {
    const uploadedFiles = Array.from(e.target.files);
    
    for (const file of uploadedFiles) {
      const fileId = Date.now() + '-' + file.name;
      
      // Read file content
      const content = await readFileContent(file);
      
      // Add to files state
      setFiles(prev => ({
        ...prev,
        [fileId]: { name: file.name, content }
      }));
      
      // Add to RAG system
      addDocument(fileId, content, file.name);
      
      // Add system message
      addMessage('system', `File uploaded: ${file.name}`);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
    setFiles(prev => {
      const newFiles = {...prev};
      delete newFiles[fileId];
      return newFiles;
    });
    
    // Remove from RAG
    removeDocument(fileId);
    
    // Add system message
    addMessage('system', `File removed: ${files[fileId].name}`);
    
    // Clear active file if it was the one removed
    if (activeFile === fileId) {
      setActiveFile(null);
    }
  };

  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, { sender, text, timestamp: new Date() }]);
  };

  const handleSendMessage = () => {
    if (inputValue.trim() === '') return;
    
    // Add user message
    addMessage('user', inputValue);
    
    // Generate response
    setTimeout(() => {
      const response = generateResponse(inputValue);
      addMessage('bot', response);
    }, 500);
    
    // Clear input
    setInputValue('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* File System Sidebar */}
      <div className="w-64 bg-white shadow-md p-4 flex flex-col">
        <h2 className="text-lg font-bold mb-4">Documents</h2>
        
        {/* Upload Button */}
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-500 text-white p-2 rounded mb-4 hover:bg-blue-600 flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload Files
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileUpload} 
          multiple 
        />
        
        {/* File List */}
        <div className="flex-grow overflow-y-auto">
          {Object.keys(files).length === 0 ? (
            <div className="text-gray-500 text-center italic">
              No files uploaded
            </div>
          ) : (
            <ul>
              {Object.entries(files).map(([id, file]) => (
                <li 
                  key={id} 
                  className={`p-2 flex justify-between items-center mb-1 rounded cursor-pointer ${
                    activeFile === id ? 'bg-blue-100' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveFile(id)}
                >
                  <div className="truncate flex-grow">{file.name}</div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(id);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      {/* Chat Area */}
      <div className="flex-grow flex flex-col">
        {/* Chat Header */}
        <div className="bg-white p-4 shadow-sm">
          <h1 className="text-xl font-bold">Document Chatbot</h1>
          <p className="text-sm text-gray-500">
            Chat with your documents using RAG ({Object.keys(files).length} document{Object.keys(files).length !== 1 ? 's' : ''} loaded)
          </p>
        </div>
        
        {/* Messages */}
        <div className="flex-grow p-4 overflow-y-auto bg-gray-50">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <p>Upload documents and start chatting</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex ${
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div 
                    className={`max-w-md p-3 rounded-lg ${
                      message.sender === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : message.sender === 'system' 
                          ? 'bg-gray-200 text-gray-800' 
                          : 'bg-white text-gray-800 shadow'
                    }`}
                  >
                    <div className="text-sm">{message.text}</div>
                    <div className="text-xs text-right mt-1 opacity-70">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Input Area */}
        <div className="bg-white p-4 shadow-inner">
          <div className="flex">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your documents..."
              className="flex-grow p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              className="bg-blue-500 text-white p-2 rounded-r hover:bg-blue-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
