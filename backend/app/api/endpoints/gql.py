from typing import List, Dict, Optional
import strawberry
from strawberry.fastapi import GraphQLRouter
from app.dependencies import get_neo4j_driver
from app.logger import logger
driver = get_neo4j_driver()


@strawberry.type
class Node:
    id: strawberry.ID
    labels: list[str]
    caption: str
    description: Optional[str]
    file: Optional[str]
    page_number: Optional[int]


@strawberry.type
class Relationship:
    id: strawberry.ID
    from_: strawberry.ID = strawberry.field(name="from")
    to: strawberry.ID
    caption: str
    description: Optional[str]
    file: Optional[str]
    page_number: Optional[int]


@strawberry.type
class NodeAndRelationship:
    nodes: list[Node]
    rels: list[Relationship]


def _fetch_related_nodes(tx, ids: List[int]):
    result = tx.run(
        """
        MATCH (n)
        WHERE id(n) IN $ids AND (
        n:__Community__ OR n:__Entity__ OR n:Chunk
        )

        // Find direct relationships and collect all nodes involved
        OPTIONAL MATCH (n)-[r1]-(m)
        WITH COLLECT(DISTINCT n) AS startNodes, COLLECT(DISTINCT m) AS neighborNodes

        // Combine all nodes into a single collection
        WITH startNodes + neighborNodes AS allNodes

        // Now find ALL relationships between ANY of these collected nodes
        UNWIND allNodes AS node1
        UNWIND allNodes AS node2
        MATCH (node1)-[r2]-(node2)
        WITH 
          COLLECT(DISTINCT
            node1 {
                .*,
                id: ID(node1),
                caption: node1.id,
                labels: [label IN labels(node1) WHERE NOT label STARTS WITH '__']            
                }
          ) +
          COLLECT(DISTINCT
            node2 {
                .*,
                id: ID(node2),
                caption: node2.id,
                labels: [label IN labels(node2) WHERE NOT label STARTS WITH '__']            
                }
          ) AS n1,
          COLLECT(DISTINCT
            r2 {
                .*,
                from: ID(node1),
                to: ID(node2),
                _id: ID(r2),
                caption: type(r2)
            }
            ) AS r1
        RETURN
            apoc.coll.toSet(n1) as nodes,
            apoc.coll.toSet(r1) as relationships
          """,
        {"ids": ids},
    )

    record = result.single()
    return record["nodes"], record["relationships"]


@strawberry.type
class Query:
    @strawberry.field
    def nodes_with_relations(self, ids: List[int]) -> NodeAndRelationship:
        result_nodes = []
        result_rels = []

        typed_ids = [int(id) for id in ids]

        with driver.session() as session:
            nodes, rels = session.execute_read(
                _fetch_related_nodes,
                typed_ids
            )

            for rec in nodes:
                logger.info(rec)
                result_nodes.append(
                    Node(
                        id=rec["id"],
                        caption=rec["caption"],
                        description=rec["entity_description"] if "entity_description" in rec.keys(
                        ) else rec["text"],  # We only have entities or text nodes.
                        file=rec["file_name"] if "file_name" in rec.keys(
                        ) else None,
                        page_number=int(rec["page_label"]) if "page_label" in rec.keys(
                        ) and rec["page_label"] != "" else None,
                        labels=rec["labels"]
                    )
                )

            for rec in rels:
                result_rels.append(
                    Relationship(
                        id=rec["_id"],
                        from_=rec["from"],
                        to=rec["to"],
                        caption=rec["caption"],
                        description=rec["relationship_description"] if "relationship_description" in rec.keys(
                        ) else None,
                        file=rec["file_name"] if "file_name" in rec.keys(
                        ) else None,
                        page_number=int(rec["page_label"]) if "page_label" in rec.keys(
                        ) and rec["page_label"] != "" else None
                    )
                )

        return NodeAndRelationship(nodes=result_nodes, rels=result_rels)


schema = strawberry.Schema(query=Query)

router = GraphQLRouter(schema)
