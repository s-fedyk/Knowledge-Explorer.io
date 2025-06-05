# LLM RAG Backend with Neo4j, MongoDB, and S3

A Retrieval-Augmented Generation (RAG) backend using FastAPI, LlamaIndex, Neo4j, MongoDB, S3, and Docker.

## Features

- FastAPI server with structured API endpoints
- Document processing and indexing with LlamaIndex
- Graph-based vector similarity search using Neo4j
- Knowledge graph capabilities for enhanced retrieval
- OpenAI integration for embeddings and LLM completions
- Document and metadata storage using MongoDB
- Page image storage using AWS S3 (or MinIO for local development)
- Containerized with Docker

## Background Processing

When documents are uploaded, they undergo a background processing pipeline:
1.  **Parsing & Chunking:** The document content is parsed, and text is divided into manageable chunks (nodes).
2.  **Embedding:** Text chunks are converted into vector embeddings using an OpenAI model.
3.  **Graph Construction:** Entities and relationships are extracted from the text to build a knowledge graph in Neo4j. Questions relevant to the text are also generated and linked.
4.  **Indexing:** Text embeddings and graph structures are indexed in Neo4j for efficient retrieval.
5.  **Page Storage (S3):** If the document is a PDF, it's split into individual page images which are uploaded to an S3 bucket.
6.  **Metadata Storage (MongoDB):** Metadata about the document (original filename, UUID, S3 paths for pages, number of pages, MIME type) is stored in MongoDB.

This pipeline allows the system to perform semantic searches, leverage graph relationships, and provide source references down to the page level.

## Getting Started

### Prerequisites

- Docker and Docker Compose
- OpenAI API key
- AWS S3 bucket and credentials (or a running MinIO instance for local S3-compatible storage)

### Setup

1.  **Clone the repository** (if you haven't already).
2.  **Navigate to the backend directory:**
    The `docker-compose.yml` file is located in this `backend/` directory.
    ```bash
    # If you are in the root of the project:
    cd backend
    ```

3.  **Create a `.env` file** in the `backend/` directory with your API keys and configuration:
    ```env
    # OpenAI Configuration
    OPENAI_API_KEY=your_openai_api_key_here
    LLM_MODEL=gpt-3.5-turbo  # or gpt-4, etc.

    # Neo4j Configuration
    # When running with docker-compose, NEO4J_URI should use the service name 'neo4j'.
    NEO4J_URI=bolt://neo4j:7687
    NEO4J_USERNAME=neo4j
    NEO4J_PASSWORD=password # Change this for production
    NEO4J_DATABASE=neo4j

    # MongoDB Configuration
    MONGO_URI=mongodb://mongo:27017/ # 'mongo' is the service name in docker-compose
    MONGO_DB_NAME=rag_db

    # S3 Configuration (for document page storage)
    S3_BUCKET_NAME=your-s3-bucket-name
    AWS_ACCESS_KEY_ID=your_aws_access_key_id
    AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
    AWS_REGION=your_aws_region
    # For local development with MinIO, you might also need:
    # S3_ENDPOINT_URL=http://minio:9000
    ```

4.  **Build and start the services using Docker Compose:**
    Ensure Docker is running. Execute this command from the `backend/` directory (where `docker-compose.yml` is located):
    ```bash
    docker-compose up -d
    ```

5.  The API will be available at `http://localhost:8000`.
6.  The Neo4j browser will be available at `http://localhost:7474` (Credentials: `neo4j`/`password` or as set in `.env`).

## API Endpoints

All endpoints are prefixed with `/api/v1`.

### Health Check

-   **`GET /health`**
    -   Checks if the API is running.
    -   **Response:** `{"status": "healthy"}`

### Querying

-   **`POST /query`**
    -   Initiates a query against the RAG system. This endpoint is suitable for queries that might involve multiple processing stages (defined by the `mode` in the request).
    -   **Request Body:**
        ```json
        {
          "query": "What is Retrieval-Augmented Generation?",
          "top_k": 3, // Optional: Number of top similar chunks to consider
          "mode": "local" // Optional: Query mode, e.g., "local", "graph"
        }
        ```
    -   **Response:** Returns a `query_id` to track the query and the number of `stages` involved in processing this query based on its mode.
        ```json
        {
          "query_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
          "stages": 2
        }
        ```

-   **`POST /step/{query_id}/{step}`**
    -   Executes a specific stage of a multi-stage query initiated via `POST /query`.
    -   `query_id`: The ID received from the `POST /query` endpoint.
    -   `step`: The stage number to execute (0-indexed).
    -   **Response:** Details about the jobs created or processed in this step, and potentially source information if available at this stage.
        ```json
        {
          "jobs": [["job_type_1", ["job_id_1a", "job_id_1b"]]],
          "sources": [1, 5, 10]
        }
        ```
        *(Response structure is illustrative)*

-   **`GET /stream/{query_id}`**
    -   Streams the final answer for a given `query_id`. This is typically used after all stages of a query are processed or for direct RAG responses.
    -   The response is a Server-Sent Events (SSE) stream.
    -   **Example Event:** `data: "token_of_the_answer"\n\n`
    -   The stream ends with `data: "[DONE]"\n\n`.

-   **`GET /stream_job/{job_id}`**
    -   Streams the result of a specific background job (e.g., summarization of a community in the graph).
    -   `job_id`: The ID of the job, often obtained from the `/step/...` endpoint response.
    -   The response is a Server-Sent Events (SSE) stream.
    -   **Example Event:** `data: "token_of_job_result"\n\n`
    -   The stream ends with `data: "[DONE]"\n\n`.

-   **`GET /sources/{query_id}`**
    -   Retrieves the source nodes (document chunks, graph elements) that contributed to the answer for a given `query_id`.
    -   **Response:**
        ```json
        {
          "query_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
          "sources": [
            { "text": "Chunk content...", "score": 0.9, "document_name": "doc1.pdf", "page_number": 2 },
            { "graph_element_id": "node_id_123", "type": "entity", "name": "RAG" }
          ]
        }
        ```
        *(Response structure is illustrative and depends on query mode and processing results)*

### Documents

-   **`POST /upload`**
    -   Uploads a document to be processed and indexed by the RAG system.
    -   **Request:** `multipart/form-data` with a `file` field.
    -   **Response:**
        ```json
        {
          "filename": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.pdf",
          "status": "Document uploaded and scheduled for processing."
        }
        ```
        *(Filename is the UUID-based storage name)*

-   **`GET /documents`**
    -   Lists all documents that have been uploaded and processed.
    -   **Response:** A list of document objects, including their original name, UUID, MIME type, extension, and pre-signed URLs for page images (if applicable).
        ```json
        {
          "documents": [
            {
              "name": "original_document_name.pdf",
              "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
              "mimetype": "application/pdf",
              "pages": ["url_to_page_1.png", "url_to_page_2.png"],
              "extension": "pdf"
            }
          ]
        }
        ```

-   **`GET /document/{uuid}`**
    -   Downloads the original document file specified by its storage `uuid`.
    -   **Response:** The document file.

### Graph Data

-   **`GET /graph`**
    -   Fetches nodes and relationships from the Neo4j database for general graph visualization or exploration.
    -   **Response:**
        ```json
        {
          "nodes": [
            { "id": "node_id_1", "labels": ["DocumentChunk"], "properties": {"text": "...", "filename": "doc1.pdf"} }
          ],
          "relationships": [
            { "id": "rel_id_1", "type": "HAS_ENTITY", "startNode": "node_id_1", "endNode": "entity_id_1", "properties": {} }
          ]
        }
        ```
        *(Response structure illustrative, actual fields may vary)*

-   **`POST /graphql`**
    -   Provides a GraphQL interface for more complex or specific queries against the knowledge graph stored in Neo4j.
    -   This endpoint is typically used by the frontend for advanced graph visualizations or targeted data fetching.
    -   **Request:** A standard GraphQL query.
        ```json
        {
          "query": "query MyGraphQuery { nodesWithRelations(ids: [1, 2, 3]) { nodes { id labels caption } rels { id from to caption } } }"
        }
        ```
    -   **Response:** The result of the GraphQL query.

## Architecture

This application uses:

-   **FastAPI:** For the web server and API endpoints.
-   **LlamaIndex:** For document parsing, chunking, embedding generation, and building the Property Graph Index.
-   **Neo4j:** As a graph database to store the knowledge graph (nodes, relationships, communities) and also for vector similarity search on embeddings.
-   **MongoDB:** To store metadata about uploaded documents (original name, UUID, S3 paths, page count, etc.).
-   **AWS S3 (or MinIO):** For storing page images generated from PDF documents.
-   **OpenAI:** For generating text embeddings and for powering the language model in the RAG pipeline.
-   **Docker & Docker Compose:** For containerization and orchestration of services.

You can access the Neo4j browser at `http://localhost:7474` (default credentials: `neo4j`/`password` unless changed in `.env`) to visualize and query the graph directly.

## Customization

-   Change LLM model and other OpenAI settings in the `.env` file.
-   Adjust chunk size, overlap, and other LlamaIndex parameters in the application code (e.g., `document.py`).
-   Extend with additional document types by adding more LlamaIndex readers and adjusting the processing logic.
-   Modify S3/MinIO and MongoDB configurations in the `.env` file as needed.

## License

[Your License]
<!-- If you have a LICENSE file, link to it, e.g., [MIT License](LICENSE) -->
