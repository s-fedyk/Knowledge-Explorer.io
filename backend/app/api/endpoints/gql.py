from typing import List, Optional, Dict, Any
import strawberry
from strawberry.fastapi import GraphQLRouter
from fastapi import Depends, HTTPException
from neo4j import GraphDatabase
from app.dependencies import get_neo4j_driver
from app.config import settings
from app.logger import logger

driver = get_neo4j_driver()


@strawberry.type
class Node:
    id: strawberry.ID
    identity: strawberry.ID


@strawberry.type
class Relationship:
    id: strawberry.ID
    from_: strawberry.ID = strawberry.field(name="from")
    to: strawberry.ID


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
        OPTIONAL MATCH (n)-[r]-(m)
        WITH
          collect(
            DISTINCT n {
              .*,
              _id: ID(n)
            }
          )
          +
          collect(
            DISTINCT m {
              .*,
              _id: ID(m)
            }
          )
            AS nodes,
          collect(DISTINCT r {
              .*,
              from: ID(n),
              to: ID(m),
              _id: ID(r)
            }

          ) AS relationships

        RETURN
          nodes,
          relationships;        
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
                        text=rec["text"],
                        identity=rec["identity"]
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
                        identity=rec["_id"],
                    )
                )

            for rec in rels:
                result_rels.append(
                    Relationship(
                        id=rec["_id"],
                        from_=rec["from"],
                        to=rec["to"],
                    )
                )

        return NodeAndRelationship(nodes=result_nodes, rels=result_rels)


schema = strawberry.Schema(query=Query)

router = GraphQLRouter(schema)
