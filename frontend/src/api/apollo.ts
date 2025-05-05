import {
  gql,
  useQuery,
  ApolloClient,
  InMemoryCache,
  createHttpLink,
} from "@apollo/client";

export const API_BASE_URL = "http://localhost:8000";

const httpLink = createHttpLink({
  uri: `${API_BASE_URL}/graphql`,
});

export const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

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

interface UseNodesWithRelationsResult {
  loading: boolean;
  error?: any;
  data?: NodeAndRelationship;
  refetch: (variables?: NodesWithRelationsVariables) => Promise<any>;
}

export const useNodesWithRelations = (
  ids: string[],
): UseNodesWithRelationsResult => {
  const { loading, error, data, refetch } = useQuery<
    NodesWithRelationsResponse,
    NodesWithRelationsVariables
  >(NODES_WITH_RELATIONS_QUERY, {
    variables: { ids },
    fetchPolicy: "network-only",
  });

  return {
    loading,
    error,
    data: data?.nodesWithRelations,
    refetch,
  };
};
