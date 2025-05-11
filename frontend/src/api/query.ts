import type {
  QueryRequest,
  Source,
  QueryResponse,
  UploadDocumentRequest,
  UploadDocumentResponse,
  DocumentDownloadResponse,
  GraphRequest,
  GraphNode,
  GraphRelationship,
  GraphResponse,
  ApiError,
  SourcesResponse,
} from "@types/api/api";

export const API_BASE_URL = "http://localhost:8000";
export const API_VERSION = "v1";
export const API_ENDPOINTS = {
  QUERY: `${API_BASE_URL}/api/${API_VERSION}/query`,
  STREAM: `${API_BASE_URL}/api/${API_VERSION}/stream`,
  UPLOAD: `${API_BASE_URL}/api/${API_VERSION}/upload`,
  GRAPH: `${API_BASE_URL}/api/${API_VERSION}/graph`,
  SESSION: `${API_BASE_URL}/api/${API_VERSION}/session`,
  SOURCES: `${API_BASE_URL}/api/${API_VERSION}/sources`,
  DOCUMENTS: `${API_BASE_URL}/api/${API_VERSION}/documents`,
};

export class APIClient {
  /**
   * Retrieves a list of documents, optionally filtered by user_id
   * @param params Optional parameters including user_id
   * @returns Promise with the documents response
   */
  public async listDocuments(
    params?: ListDocumentsParams,
  ): Promise<Document[]> {
    try {
      // Construct URL with query parameters if provided
      let url = API_ENDPOINTS.DOCUMENTS;
      if (params?.user_id) {
        url += `?user_id=${encodeURIComponent(params.user_id)}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw this.createApiError(errorData, response.status);
      }

      const resp = (await response.json()) as DocumentsResponse;

      return resp.documents;
    } catch (error) {
      if ((error as ApiError).status) {
        throw error;
      }
      throw this.createApiError(
        {
          error: "network_error",
          message: `Failed to retrieve documents: ${(error as Error).message}`,
        },
        500,
      );
    }
  }

  /**
   * Query the RAG system with a natural language question and stream the response
   * using the post-then-get pattern.
   * @param queryRequest The query request object
   * @param onToken Callback function that receives tokens as they arrive
   * @param onComplete Callback function called when streaming is complete
   * @param onError Callback function called when an error occurs
   */
  public async queryStream(
    queryRequest: QueryRequest,
    onToken: (token: string) => void,
    onComplete?: (sessionID) => void,
    onError?: (error: ApiError) => void,
  ): Promise<() => void> {
    try {
      const response = await fetch(API_ENDPOINTS.QUERY, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(queryRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw this.createApiError(errorData, response.status);
      }

      const data = await response.json();
      const queryId = data.query_id;

      if (!queryId) {
        throw this.createApiError(
          {
            error: "invalid_response",
            message: "No session ID returned from server",
          },
          500,
        );
      }

      // Step 2: Connect to the stream endpoint with the session ID
      const streamUrl = `${API_ENDPOINTS.STREAM}/${queryId}`;
      const eventSource = new EventSource(streamUrl, {
        withCredentials: false,
      });

      // Handle incoming messages (tokens)
      eventSource.onmessage = (event) => {
        if (event.data === "[DONE]") {
          // Stream is complete
          eventSource.close();
          // Clean up the session

          if (onComplete) onComplete(queryId);
          return;
        }

        onToken(event.data);
      };

      eventSource.onerror = (error) => {
        eventSource.close();
        if (onError) {
          onError(
            this.createApiError(
              {
                error: "stream_error",
                message: "Error in SSE stream connection",
              },
              500,
            ),
          );
        }
      };

      return () => {
        eventSource.close();
      };
    } catch (error) {
      if (onError) {
        onError(
          this.createApiError(
            {
              error: "network_error",
              message: `Failed to establish streaming connection: ${(error as Error).message}`,
            },
            500,
          ),
        );
      }

      return () => {};
    }
  }

  public async getSources(queryId: string): Promise<SourcesResponse> {
    try {
      const response = await fetch(`${API_ENDPOINTS.SOURCES}/${queryId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw this.createApiError(errorData, response.status);
      }

      return (await response.json()) as SourcesResponse;
    } catch (error) {
      if ((error as ApiError).status) {
        throw error;
      }
      throw this.createApiError(
        {
          error: "network_error",
          message: `Failed to retrieve sources: ${(error as Error).message}`,
        },
        500,
      );
    }
  }

  /**
   * Gets the status of a session
   * @param queryId The session ID to check
   * @returns The session status
   */
  public async getSessionStatus(
    queryId: string,
  ): Promise<{ status: string; session_id: string }> {
    try {
      const response = await fetch(`${API_ENDPOINTS.SESSION}/${queryId}`, {
        method: "GET",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw this.createApiError(errorData, response.status);
      }

      return await response.json();
    } catch (error) {
      throw this.createApiError(
        {
          error: "network_error",
          message: `Failed to get session status: ${(error as Error).message}`,
        },
        500,
      );
    }
  }

  /**
   * Query the RAG system with a natural language question (non-streaming version)
   * @param queryRequest The query request object
   * @returns Promise with the query response
   * @deprecated Use queryStream for better user experience
   */
  public async query(queryRequest: QueryRequest): Promise<QueryResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.QUERY, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(queryRequest),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw this.createApiError(errorData, response.status);
      }
      return (await response.json()) as QueryResponse;
    } catch (error) {
      if ((error as ApiError).status) {
        throw error;
      }
      throw this.createApiError(
        {
          error: "network_error",
          message: `Failed to query documents: ${(error as Error).message}`,
        },
        500,
      );
    }
  }

  private createApiError(
    errorData: Partial<ApiError>,
    status: number,
  ): ApiError {
    return {
      error: errorData.error || "unknown_error",
      message: errorData.message || "An unknown error occurred",
      status: status,
    };
  }
}

// Create a singleton instance to use throughout the application
export const Client = new APIClient();
