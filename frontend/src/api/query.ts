// src/api/types.ts
import type {
  QueryRequest,
  Source,
  QueryResponse,
  UploadDocumentRequest,
  UploadDocumentResponse,
  ApiError,
} from "../types/api/api";

export const API_BASE_URL = "http://localhost:8000";

export const API_VERSION = "v1";

export const API_ENDPOINTS = {
  QUERY: `${API_BASE_URL}/api/${API_VERSION}/query`,
  UPLOAD: `${API_BASE_URL}/api/${API_VERSION}/upload`,
};

export class APIClient {
  /**
   * Query the RAG system with a natural language question
   * @param queryRequest The query request object
   * @returns Promise with the query response
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

  /**
   * Upload a document to the RAG system
   * @param uploadRequest The upload request object containing the file
   * @returns Promise with the upload response
   */
  public async uploadDocument(
    uploadRequest: UploadDocumentRequest,
  ): Promise<UploadDocumentResponse> {
    try {
      const formData = new FormData();
      formData.append("file", uploadRequest.file);

      const response = await fetch(API_ENDPOINTS.UPLOAD, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw this.createApiError(errorData, response.status);
      }

      return (await response.json()) as UploadDocumentResponse;
    } catch (error) {
      if ((error as ApiError).status) {
        throw error;
      }
      throw this.createApiError(
        {
          error: "network_error",
          message: `Failed to upload document: ${(error as Error).message}`,
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
