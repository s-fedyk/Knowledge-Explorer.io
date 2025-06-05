import { useMemo, useRef, useEffect } from "react";
import {
  gql, // Utility for writing GraphQL queries.
  useQuery, // Hook for executing queries.
  ApolloClient, // The main Apollo Client class.
  InMemoryCache, // Recommended cache implementation.
  createHttpLink, // Utility to create an HTTP link for Apollo Client.
} from "@apollo/client";

// Assumes API_BASE_URL is an environment variable or global constant
// (e.g., `import.meta.env.VITE_API_BASE_URL` or `process.env.REACT_APP_API_BASE_URL`)
// Example: const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

// Create an HTTP link to the GraphQL endpoint.
// The URI is constructed using a base API URL and appending '/graphql'.
const httpLink = createHttpLink({
  uri: `${API_BASE_URL}/graphql`, // e.g., "http://localhost:8000/api/v1/graphql"
});

// Initialize the Apollo Client.
// It's configured with the HTTP link to communicate with the GraphQL server
// and an in-memory cache for storing query results.
export const client = new ApolloClient({
  link: httpLink, // The link that determines how GraphQL operations are fetched.
  cache: new InMemoryCache(), // Cache for storing query results to avoid redundant network requests.
});

// TypeScript interface defining the structure of a Node object in the graph.
export interface Node {
  id: string; // Unique identifier for the node.
  caption?: string; // Optional display caption for the node.
  description?: string; // Optional detailed description.
  labels: string[]; // Array of labels categorizing the node (e.g., "Document", "Person").
  file?: string; // Optional associated file name or path.
  pageNumber?: number; // Optional page number if the node refers to a specific page.
}

// TypeScript interface for a Relationship object in the graph.
export interface Relationship {
  id: string; // Unique identifier for the relationship.
  from: string; // ID of the source/starting node.
  to: string; // ID of the target/ending node.
  caption?: string; // Optional display caption for the relationship.
  description?: string; // Optional detailed description.
  file?: string; // Optional associated file name or path (e.g., where the relationship was found).
  pageNumber?: number; // Optional page number relevant to the relationship.
}

// Interface for the combined result of nodes and their relationships.
export interface NodeAndRelationship {
  nodes: Node[]; // Array of nodes.
  rels: Relationship[]; // Array of relationships.
}

// Interface for the expected response structure from the NODES_WITH_RELATIONS_QUERY.
export interface NodesWithRelationsResponse {
  nodesWithRelations: NodeAndRelationship; // The field in the GraphQL response containing nodes and rels.
}

// Interface for the variables required by the NODES_WITH_RELATIONS_QUERY.
export interface NodesWithRelationsVariables {
  ids: string[]; // An array of node IDs (as strings) to fetch.
  // Note: The GraphQL query itself uses [Int!] for $ids. This mismatch should be resolved.
  // Assuming GraphQL schema expects Int, but client-side uses string IDs. Casting might be needed or schema alignment.
  // For now, this interface reflects client-side usage, but query definition needs checking.
}

// GraphQL query string to fetch nodes and their relationships based on a list of IDs.
// The query is named `NodesWithRelations` and accepts an array of `Int!` (non-null integers) as `$ids`.
// It returns a `nodesWithRelations` object containing `nodes` and `rels`.
export const NODES_WITH_RELATIONS_QUERY = gql`
  query NodesWithRelations($ids: [Int!]!) { # GraphQL variable $ids is defined as array of Ints.
    nodesWithRelations(ids: $ids) { # The resolver/query field on the server.
      nodes { # Requested fields for each node.
        id # Expecting string ID from server, but query defines $ids as Int.
        labels
        caption
        description
        file
        pageNumber
      }
      rels { # Requested fields for each relationship.
        id
        from
        to
        caption
        description
        file
        pageNumber
      }
    }
  }
`;

// Interface for the return type of the `useNodesWithRelations` custom hook.
interface UseNodesWithRelationsResult {
  loading: boolean; // True if the query is in flight.
  error?: any; // Error object if the query fails.
  data?: NodeAndRelationship; // The fetched nodes and relationships.
  refetch: (variables?: NodesWithRelationsVariables) => Promise<any>; // Function to manually refetch the query.
}

/**
 * Custom React hook to fetch nodes and their relationships using Apollo Client.
 * It handles memoization of IDs to prevent unnecessary refetches and manages fetch policies.
 *
 * @param initialIds An array of node IDs (as strings client-side, but sent as numbers to GraphQL due to query def).
 * @returns An object containing loading state, error, fetched data, and a refetch function.
 */
export const useNodesWithRelations = (
  initialIds: string[], // Changed from int[] to string[] to match usage and typical client-side ID types.
): UseNodesWithRelationsResult => {
  // Ref to store the previously used set of IDs to detect changes.
  const previousIdsRef = useRef<string[]>([]);

  // Memoize and sort the IDs to ensure stability and prevent unnecessary re-renders/refetches
  // if the order of IDs changes but the set of IDs remains the same.
  const stableIds = useMemo(() => {
    // Ensure all IDs are strings before sorting, and filter out any non-string values if necessary.
    // The GraphQL query expects Ints, so conversion happens at the time of query.
    const processedIds = initialIds.map(String).sort();
    return processedIds;
  }, [initialIds]);

  // Determine if the query should be skipped (e.g., if no IDs are provided).
  const shouldSkip = stableIds.length === 0;

  // Check if the set of stable IDs has actually changed compared to the previous render.
  // This is a shallow comparison of sorted arrays (as strings).
  const hasIdsChanged = JSON.stringify(previousIdsRef.current) !== JSON.stringify(stableIds);

  // Determine the fetch policy:
  // - 'network-only': If IDs have changed, fetch fresh data from the server.
  // - 'cache-first': If IDs are the same, try to load from cache first.
  const fetchPolicy = hasIdsChanged ? "network-only" : "cache-first";

  // Update the `previousIdsRef` when `stableIds` change.
  useEffect(() => {
    if (hasIdsChanged) {
      previousIdsRef.current = stableIds;
    }
  }, [stableIds, hasIdsChanged]);

  // Execute the GraphQL query using Apollo's `useQuery` hook.
  const { loading, error, data, refetch } = useQuery<
    NodesWithRelationsResponse, // Expected data structure of the response.
    NodesWithRelationsVariables // Variables to be passed to the query.
  >(NODES_WITH_RELATIONS_QUERY, {
    // Convert string IDs to numbers for the GraphQL query, as it expects [Int!]
    // This assumes node IDs are indeed numeric strings.
    variables: { ids: stableIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id)) },
    fetchPolicy, // Dynamically set fetch policy.
    skip: shouldSkip, // Skip query if no IDs.
    notifyOnNetworkStatusChange: true, // Useful for updating loading state on refetches.
  });

  // useEffect for logging data when it changes (for debugging purposes).
  useEffect(() => {
    if (data) {
      console.log("Graph Data Received:", data);
    }
    if (error) {
      console.error("Error fetching graph data:", error);
    }
  }, [data, error]);

  // Return the relevant data and functions for the component using this hook.
  return {
    loading,
    error,
    data: data?.nodesWithRelations, // Extract the nested data structure.
    refetch, // Allow components to trigger a manual refetch.
  };
};
