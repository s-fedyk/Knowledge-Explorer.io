from llama_index.graph_stores.neo4j import Neo4jPropertyGraphStore
from llama_index.core.llms import ChatMessage
import re
import networkx as nx
from llama_index.core import Settings
from collections import defaultdict
from llama_index.core.schema import TextNode
from llama_index.core.vector_stores.utils import node_to_metadata_dict
from app.logger import logger

PROJECT_GRAPH = """
    MATCH (source)-[r]->(target)
    RETURN gds.graph.project(
      'louvrainGraph',
      source,
      target,
      {},
      { undirectedRelationshipTypes: ['*'] }
    )
"""

EXTRACT_COMMUNITIES = """
CALL gds.louvain.write(
  'louvrainGraph',
  {
    writeProperty: 'communities',
    includeIntermediateCommunities: true
  }
)
"""

FINISH_EXTRACTION = "CALL gds.graph.drop('louvrainGraph')"
PURGE_COMMUNITIES = "MATCH(n: __Community__) DETACH DELETE n"

SET_NODE_LEVEL = """
    MATCH (n)
    SET n.level = 0
"""

CREATE_COMMUNITY = """
MATCH (e:`__Entity__`)
UNWIND range(0, size(e.communities) - 1 , 1) AS index
CALL {
  WITH e, index
  WITH e, index
  WHERE index = 0
  MERGE (c:`__Community__` {id: toString(index) + '-' + toString(e.communities[index])})
  ON CREATE SET c.level = index, c.text=""
  MERGE (e)-[:IN_COMMUNITY]->(c)
  RETURN count(*) AS count_0
}
CALL {
  WITH e, index
  WITH e, index
  WHERE index > 0
  MERGE (current:`__Community__` {id: toString(index) + '-' + toString(e.communities[index])})
  ON CREATE SET current.level = index, current.text=""
  MERGE (previous:`__Community__` {id: toString(index - 1) + '-' + toString(e.communities[index - 1])})
  ON CREATE SET previous.level = index - 1, previous.text=""
  MERGE (previous)-[:IN_COMMUNITY]->(current)
  RETURN count(*) AS count_1
}
RETURN count(*)
"""

RANK_COMMUNITIES = """
MATCH (c:__Community__)<-[:IN_COMMUNITY*]-(:__Entity__)<-[:MENTIONS]-(chunk:Chunk)
WITH c, count(distinct chunk) AS rank
SET c.community_rank = rank;
"""

COMMUNITY_SUMMARY_PROMPT = """
You are a helpful assistant responsible for generating a comprehensive summary of the data provided below.
Given some amount of entities, and a list of descriptions, all related to the same entity or group of entities.
Please concatenate all of these into a single, comprehensive description. Make sure to include information collected from all the descriptions.
If the provided descriptions are contradictory, please resolve the contradictions and provide a single, coherent summary.
Make sure it is written in third person, and include the entity names so we the have full context.
"""

COMMUNITY_INFO_QUERY = """
MATCH (c:`__Community__`)<-[:IN_COMMUNITY*]-(e:__Entity__)
WITH c, collect(e ) AS nodes
WHERE size(nodes) > 1 AND c.level = $level
CALL apoc.path.subgraphAll(nodes[0], {
 whitelistNodes:nodes
})
YIELD relationships
RETURN c.id AS communityId,
       [n in nodes | {id: n.id, description: n.entity_description , type: [el in labels(n) WHERE el <> '__Entity__'][0]}] AS nodes,
       [r in relationships | {start: startNode(r).id, type: type(r), end: endNode(r).id, description: r.relationship_description}] AS rels
"""

SET_SUMMARY_QUERY = """
UNWIND $data AS row
MERGE (c:__Community__ {id:row.community})
SET c.text = row.text
SET c.embedding = row.embedding
"""

METADATA_QUERY = """
MATCH (e:__Entity__)
SET e += $content
"""

METADATA_QUERY_COMMUNITY = """
MATCH (e:__Community__)
SET e += $content
"""


def prepare_string(data):
    nodes_str = "Nodes are:\n"
    for node in data['nodes']:
        node_id = node['id']
        node_type = node['type']
        if 'description' in node and node['description']:
            node_description = f", description: {node['description']}"
        else:
            node_description = ""
        nodes_str += f"id: {node_id}, type: {node_type}{node_description}\n"

    rels_str = "Relationships are:\n"
    if 'rels' in data.keys():
        for rel in data['rels']:
            start = rel['start']
            end = rel['end']
            rel_type = rel['type']
            if 'description' in rel and rel['description']:
                description = f", description: {rel['description']}"
            else:
                description = ""
            rels_str += f"({start})-[:{rel_type}]->({end}){description}\n"

    return nodes_str + "\n" + rels_str


class GraphRAGStore(Neo4jPropertyGraphStore):
    community_summary = {}
    entity_info = None
    max_cluster_size = 5

    def generate_summaries(self, level: int):
        communities = self.structured_query(
            COMMUNITY_INFO_QUERY, {"level": level}
        )
        data = []
        for community in communities:
            stringify_info = prepare_string(community)
            logger.info("Stringified: %s", stringify_info)

            summary = self.generate_summary(stringify_info)
            embedding = Settings.embed_model.get_query_embedding(summary)

            data.append(
                {
                    "community": community['communityId'],
                    "text": summary,
                    "embedding": embedding
                }
            )
            logger.info("summary is %s", summary)

        self.structured_query(
            SET_SUMMARY_QUERY,
            {
                "data": data
            }
        )

    def create_community_summary(self, level: int):
        self.structured_query(CREATE_COMMUNITY, {})
        self.structured_query(RANK_COMMUNITIES, {})
        self.generate_summaries(0)

    def generate_summary(self, community_info):
        """Generate summary for a given text using an LLM."""
        messages = [
            ChatMessage(
                role="system",
                content=COMMUNITY_SUMMARY_PROMPT
            ),
            ChatMessage(
                role="user",
                content=community_info,
            ),
        ]
        response = Settings.llm.chat(messages)
        clean_response = re.sub(r"^assistant:\s*", "", str(response)).strip()
        return clean_response

    def generate_community_summary(self, text):
        """Generate summary for a given text using an LLM."""
        messages = [
            ChatMessage(
                role="system",
                content=(
                    "You are provided with a set of relationships from a knowledge graph, each represented as "
                    "entity1->entity2->relation->relationship_description. Your task is to create a summary of these "
                    "relationships. The summary should include the names of the entities involved and a concise synthesis "
                    "of the relationship descriptions. The goal is to capture the most critical and relevant details that "
                    "highlight the nature and significance of each relationship. Ensure that the summary is coherent and "
                    "integrates the information in a way that emphasizes the key aspects of the relationships."
                ),
            ),
            ChatMessage(role="user", content=text),
        ]
        response = Settings.llm.chat(messages)
        clean_response = re.sub(r"^assistant:\s*", "", str(response)).strip()
        return clean_response

    def rebuild_communities(self):
        res = self.structured_query(PURGE_COMMUNITIES, {})
        logger.info("community purge: %s", res)
        res = self.structured_query(PROJECT_GRAPH, {})
        logger.info("Project: %s", res)
        res = self.structured_query(EXTRACT_COMMUNITIES, {})
        logger.info("Extract: %s", res)
        res = self.structured_query(FINISH_EXTRACTION, {})

        res = self.structured_query(SET_NODE_LEVEL, {})

        logger.info("Creating community summaries...")
        self.create_community_summary(level=1)

    def build_communities(self):
        """Builds communities from the graph and summarizes them."""
        self.rebuild_communities()
        content = node_to_metadata_dict(
            TextNode(),
            remove_text=False,
            flat_metadata=False
        )

        self.structured_query(
            METADATA_QUERY,
            {
                "content": content
            }
        )
        self.structured_query(
            METADATA_QUERY_COMMUNITY,
            {
                "content": content
            }
        )

    def _collect_community_info(self, nx_graph, clusters):
        """
        Collect information for each node based on their community,
        allowing entities to belong to multiple clusters.
        """
        entity_info = defaultdict(set)
        community_info = defaultdict(list)

        for item in clusters:
            node = item.node
            cluster_id = item.cluster

            # Update entity_info
            entity_info[node].add(cluster_id)

            for neighbor in nx_graph.neighbors(node):
                edge_data = nx_graph.get_edge_data(node, neighbor)
                if edge_data:
                    detail = f"{node} -> {neighbor} -> {edge_data['relationship']} -> {edge_data['description']}"
                    community_info[cluster_id].append(detail)

        # Convert sets to lists for easier serialization if needed
        entity_info = {k: list(v) for k, v in entity_info.items()}

        return dict(entity_info), dict(community_info)

    def _summarize_communities(self, community_info):
        """Generate and store summaries for each community."""
        for community_id, details in community_info.items():
            details_text = (
                "\n".join(details) + "."
            )  # Ensure it ends with a period
            self.community_summary[
                community_id
            ] = self.generate_community_summary(details_text)

    def get_community_summaries(self):
        """Returns the community summaries, building them if not already done."""
        if not self.community_summary:
            self.build_communities()
        return self.community_summary
