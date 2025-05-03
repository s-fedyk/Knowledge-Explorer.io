export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

export const API_VERSION = "v1";

export const API_ENDPOINTS = {
  QUERY: `${API_BASE_URL}/api/${API_VERSION}/query`,
  UPLOAD: `${API_BASE_URL}/api/${API_VERSION}/upload`,
};

export interface QueryRequest {
  query: string;
  similarity_top_k?: number;
}

export interface Source {
  text: string;
  score: number;
  document: string;
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
}

export interface UploadDocumentRequest {
  file: File;
}

export interface UploadDocumentResponse {
  success: boolean;
  documentId: string;
  filename: string;
}

export interface ApiError {
  error: string;
  message: string;
  status: number;
}
