import { gql } from "@apollo/client";

// Add these to your types file
export interface Document {
  uuid: string;
  name: string;
  mimetype: string;
  pages: string[];
}

export interface ListDocumentsParams {
  user_id?: string;
}

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
}

export interface SourcesResponse {
  sessionID: string;
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

// src/apollo/types.ts

// Define the GraphQL types
export interface Node {
  id: string;
  identity: string;
}

export interface Relationship {
  id: string;
  from: string;
  to: string;
}

export interface NodeAndRelationship {
  nodes: Node[];
  rels: Relationship[];
}

export interface NodesWithRelationsResponse {
  nodesWithRelations: NodeAndRelationship;
}

export interface NodesWithRelationsVariables {
  ids: string[];
}

// Define the GraphQL query
export const NODES_WITH_RELATIONS_QUERY = gql`
  query NodesWithRelations($ids: [ID!]!) {
    nodesWithRelations(ids: $ids) {
      nodes {
        id
        identity
      }
      rels {
        id
        from
        to
      }
    }
  }
`;
