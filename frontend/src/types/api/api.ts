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
  sources: string[];
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

// New interfaces for graph data
export interface GraphNode {
  id: string;
}

export interface GraphRelationship {
  source: string;
  target: string;
  type: string;
  properties?: Record<string, any>;
}

export interface GraphRequest {
  documentIds?: string[];
  query?: string;
  limit?: number;
}

export interface GraphResponse {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
}
