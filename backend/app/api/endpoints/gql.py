from typing import List, Dict
import strawberry
from strawberry.fastapi import GraphQLRouter
from app.dependencies import get_neo4j_driver
driver = get_neo4j_driver()


@strawberry.type
class Node:
    id: strawberry.ID
    caption: str
    description: str


@strawberry.type
class Relationship:
    id: strawberry.ID
    from_: strawberry.ID = strawberry.field(name="from")
    to: strawberry.ID
    caption: str


@strawberry.type
class NodeAndRelationship:
    nodes: list[Node]
    rels: list[Relationship]


def _fetch_nodes_by_ids(tx, ids: List[str]) -> List[Dict]:
    result = tx.run(
        """
        MATCH (c:Node)
        WHERE c.id IN $ids
        RETURN
          c.id               AS id,
          elementid(c) as identity,
          c.text              AS text
        """,
        {"ids": ids},
    )

    return [
        {
            "id": rec["id"],
            "text": rec["text"],
            "identity": rec["identity"]
        }
        for rec in result
    ]


def _fetch_related_nodes(tx, ids: List[str]):
    result = tx.run(
        """
        MATCH (n:`__Node__`)
        WHERE n.id IN $ids

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
                caption: node1.id
            }
          ) +
          COLLECT(DISTINCT
            node2 {
                .*,
                id: ID(node2),
                caption: node2.id
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
    def nodes_by_ids(self, ids: List[strawberry.ID]) -> List[Node]:
        records = []
        with driver.session() as session:
            result = session.execute_read(_fetch_nodes_by_ids, ids)
            for rec in result:
                records.append(
                    Node(
                        id=rec["id"],
                        caption=rec["caption"]
                    )
                )
        return records

    @strawberry.field
    def nodes_with_relations(self, ids: List[strawberry.ID]) -> NodeAndRelationship:
        result_nodes = []
        result_rels = []

        with driver.session() as session:
            nodes, rels = session.execute_read(
                _fetch_related_nodes,
                ids
            )

            for rec in nodes:
                result_nodes.append(
                    Node(
                        id=rec["id"],
                        caption=rec["caption"],
                        description=rec["entity_description"] if "entity_description" in rec.keys(
                        ) else rec["text"]  # We only have entities or text nodes.
                    )
                )

            for rec in rels:
                result_rels.append(
                    Relationship(
                        id=rec["_id"],
                        from_=rec["from"],
                        to=rec["to"],
                        caption=rec["caption"]
                    )
                )

        return NodeAndRelationship(nodes=result_nodes, rels=result_rels)


schema = strawberry.Schema(query=Query)

router = GraphQLRouter(schema)
