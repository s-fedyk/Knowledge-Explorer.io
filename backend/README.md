# LLM RAG Backend with Neo4j

A Retrieval-Augmented Generation (RAG) backend using FastAPI, LlamaIndex, Neo4j, and Docker.

## Features

- FastAPI server with structured API endpoints
- Document processing and indexing with LlamaIndex
- Graph-based vector similarity search using Neo4j
- Knowledge graph capabilities for enhanced retrieval
- OpenAI integration for embeddings and LLM completions
- Containerized with Docker

## Getting Started

### Prerequisites

- Docker and Docker Compose
- OpenAI API key

### Setup

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd llm-rag-backend
   ```

2. Create a `.env` file with your API keys and configuration:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   LLM_MODEL=gpt-3.5-turbo  # or gpt-4, etc.
   
   # Neo4j configuration
   NEO4J_URI=bolt://neo4j:7687
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=password
   NEO4J_DATABASE=neo4j
   ```

3. Build and start the services:
   ```bash
   docker-compose up -d
   ```

4. The API will be available at http://localhost:8000

## API Endpoints

### Health Check

```
GET /health
```

Checks if the API is running.

### Query Documents

```
POST /api/v1/query
```

Query the RAG system with a natural language question.

**Request Body:**
```json
{
  "query": "What is RAG?",
  "similarity_top_k": 3
}
```

**Response:**
```json
{
  "answer": "RAG (Retrieval-Augmented Generation) is...",
  "sources": [
    {
      "text": "...",
      "score": 0.85,
      "document": "document.pdf"
    }
  ]
}
```

### Upload Documents

```
POST /api/v1/upload
```

Upload a document to be indexed by the RAG system.

**Form Data:**
- `file`: PDF file to upload

**Response:**
```json
{
  "filename": "document.pdf",
  "status": "Document uploaded and being processed"
}
```

### List Documents

```
GET /api/v1/documents
```

List all documents that have been uploaded and processed.

**Response:**
```json
[
  "document1.pdf",
  "document2.pdf"
]
```

### Get Graph Data

```
GET /api/v1/graph
```

Get the graph data for visualization. This endpoint returns nodes and relationships from Neo4j.

**Response:**
```json
{
  "nodes": [
    {
      "id": 123,
      "text": "This is a document chunk...",
      "metadata": {
        "filename": "document.pdf",
        "page": 1
      }
    }
  ],
  "relationships": [
    {
      "source": 123,
      "target": 456,
      "type": "RELATED_TO"
    }
  ]
}
```

## Architecture

This application uses:

- **FastAPI** for the web server
- **LlamaIndex** for document indexing and retrieval
- **Neo4j** for vector storage and graph relationships
- **OpenAI** for embeddings and LLM
- **Docker** for containerization

### Neo4j Graph Database

The application uses Neo4j as both a vector database and a graph database. This provides several advantages:

1. **Vector similarity search** - Find documents semantically similar to queries
2. **Graph relationships** - Connect related documents and concepts
3. **Knowledge graph capabilities** - Represent complex relationships between entities
4. **Graph algorithms** - Use Neo4j's graph algorithms for enhanced retrieval

You can access the Neo4j browser at http://localhost:7474 with username 'neo4j' and password 'password' to visualize and query the graph directly.

## Customization

- Change LLM model in `.env` file
- Adjust chunk size and overlap in `.env`
- Extend with additional document types by adding more readers

## License

[Your License]
