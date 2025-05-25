from llama_index.core.base.response.schema import Response, StreamingResponse
from llama_index.core.query_engine import CustomQueryEngine
from llama_index.core.llms import LLM, ChatResponse
from llama_index.core import VectorStoreIndex
from llama_index.core.llms import ChatMessage
from llama_index.core import Settings
from typing import ClassVar, Generator, AsyncGenerator, List, Tuple
from pydantic import PrivateAttr
from app.rag.StreamingReranker import StreamingReranker
from llama_index.core.schema import (
    NodeWithScore,
    TextNode,
    QueryBundle
)

from app.logger import logger
import re


def dummy_generator() -> Generator:
    yield


class GraphRAGLocalQueryEngine(CustomQueryEngine):
    index: VectorStoreIndex
    _llm: LLM = PrivateAttr(default_factory=lambda: Settings.llm)
    similarity_top_k: int = 20
    ranker: ClassVar[StreamingReranker] = StreamingReranker(
        choice_batch_size=5,
        top_n=10,
    )

    def generate_answer_from_context(self, context, query):
        prompt = (
            f"Given the context extracted from a knowledge graph: {context}"
            f"how would you answer the following query? Query: {query}"
            f"Your answer can include markdown snippets"
        )
        messages = [
            ChatMessage(role="system", content=prompt),
            ChatMessage(
                role="user",
                content="I need an answer based on the above information.",
            ),
        ]
        response = self._llm.chat(messages)
        cleaned_response = re.sub(r"^assistant:\s*", "", str(response)).strip()
        return cleaned_response

    def stream_entity_extraction(self, query_str: str, max_entities: int = 5) -> Generator:

        prompt = f"""
        -Goal-
        Given a text query, extract up to {max_entities} entities relating to the query.
        An entity is a person, place, thing, object, or concept that can be used to index a semantic database.

        -What to Extract-
        - Named persons (people, characters, roles)
        - Named places (cities, buildings, locations)
        - Named organizations (companies, institutions)
        - Objects and items (products, tools, vehicles, etc.)
        - Concepts and topics (ideas, subjects, activities)
        - Events and occasions
        - Abstract entities (emotions, qualities, processes)

        -Critical Instructions-
        - Extract ONLY what is explicitly mentioned in the query
        - Do NOT add information, details, or assumptions not present in the original text
        - Do NOT resolve ambiguity by adding context
        - Use the EXACT form/spelling as it appears in the query
        - Include both named entities AND important nouns/objects

        -Steps-
        1. Identify all relevant entities including:
           - Proper nouns (John, Apple, Chicago)
           - Important common nouns (car, book, meeting, strategy)
           - Key concepts and topics mentioned

        2. For each entity:
           - Extract exactly as written in the query
           - Include singular/plural as given
           - Don't modify or expand the term

        -Output Format-
        1. <entity 1>
        2. <entity 2>
        ...
        {max_entities}. <entity {max_entities}>

        -Examples-
        Query: "When Tesla's Model S battery degrades, how do lithium-ion cells' thermal runaway risks compare to solid-state batteries being developed by quantumscape and toyota's research division?"
        1. Tesla
        2. Model S
        3. battery
        4. lithium-ion cells
        5. thermal runaway
        6. risks
        7. solid-state batteries
        8. quantumscape
        9. toyota
        10. research division

        Query: "Why did the Berlin Wall fall in 1989 during gorbachev's presidency?"
        1. Berlin Wall
        2. 1989
        3. gorbachev
        4. presidency

        Query: "What are the side effects of metformin for Type 2 diabetes patients with kidney disease?"
        1. side effects
        2. metformin
        3. Type 2 diabetes
        4. patients
        5. kidney disease

        Extract entities now. Do not provide explanations or follow-up questions.
        Think step-by-step, providing the answers after a newline.
        """
        messages = [
            ChatMessage(role="system", content=prompt),
            ChatMessage(
                role="user",
                content=query_str,
            ),
        ]
        response = self._llm.stream_chat(messages)
        return response

    def rerank(self, query: str, nodes_str: str) -> Tuple[Generator, str]:
        logger.info(
            "Node string=[%s]",
            nodes_str
        )

        def to_node(text: str) -> NodeWithScore:
            node = TextNode()
            node.set_content(text)
            node = NodeWithScore(node=node, score=0)
            return node

        nodes: list[NodeWithScore] = list(map(to_node, nodes_str))

        logger.info("Nodes are now: [%s]", nodes)
        generator, stringified_nodes = self.ranker.streaming_postprocess_nodes(
            nodes,
            query_bundle=QueryBundle(query)
        )

        return generator, stringified_nodes

    async def aresponse_generator(self,
                                  query_str,
                                  chunks: list[NodeWithScore],
                                  entities: list[NodeWithScore],
                                  relationships: list[NodeWithScore]
                                  ) -> AsyncGenerator:

        entity_generator = self.stream_entity_extraction(query_str)

        yield ChatResponse(message=ChatMessage(), delta="[ENTITYSTART]")
        for tok in entity_generator:
            yield tok
        yield ChatResponse(message=ChatMessage(), delta="[ENTITYEND]")

        logger.info("chunks are %s", chunks)
        logger.info("rels are %s", relationships)
        logger.info("entities are %s", entities)

        chunks = self.ranker.postprocess_nodes(
            chunks,
            query_str=query_str
        )
        entities = self.ranker.postprocess_nodes(
            entities,
            query_str=query_str
        )
        relationships = self.ranker.postprocess_nodes(
            relationships,
            query_str=query_str
        )

        def to_text(node: NodeWithScore) -> str:
            text = node.get_content()
            return text

        chunks = "\n".join(list(map(to_text, chunks)))
        entities = "\n".join(list(map(to_text, entities)))
        relationships = "\n".join(list(map(to_text, relationships)))

        context = f"""
        Chunks: {chunks}
        entities: {entities}
        relationships: {relationships}
        """

        generator = self.stream_answer_from_context(
            context,
            query_str
        )

        yield ChatResponse(message=ChatMessage(), delta="[FINALSTART]")
        for tok in generator:
            yield tok
        yield ChatResponse(message=ChatMessage(), delta="[FINALEND]")

    def stream_answer_from_context(self, context, query) -> Generator:
        prompt = (
            f"Given the context extracted from a knowledge graph: {context}"
            f"how would you answer the following query? Query: {query}"
            f"Your answer can include markdown snippets"
        )
        messages = [
            ChatMessage(role="system", content=prompt),
            ChatMessage(
                role="user",
                content="I need an answer based on the above information.",
            ),
        ]
        response = self._llm.stream_chat(messages)
        return response

    def custom_query(self, query_str: str) -> Response:
        """Process all community summaries to generate answers to a specific query."""

        retriever = self.index.as_retriever()
        response_context = retriever.retrieve(query_str)

        response = self.generate_answer_from_context(
            response_context,
            query_str
        )

        return Response(response)

    async def aretrieve_context(self, query_str: str) -> list[str]:
        retriever = self.index.as_retriever()
        response_context = await retriever.aretrieve(query_str)

        source, context = response_context[0].text.split(sep="[SPLIT]")
        chunks, relationships, entities = context.split("<>")

        chunks = chunks.split("|")
        entities = entities.split("|")
        relationships = relationships.split("|")

        logger.info("initial chunks =[%s]", chunks)
        logger.info("initial entities=[%s]", entities)
        logger.info("initial relationshps=[%s]", relationships)

        return [chunks, entities, relationships]

    async def acustom_query(self, query_str: str) -> StreamingResponse:
        """Process all community summaries to generate answers to a specific query."""

        retriever = self.index.as_retriever()
        response_context = await retriever.aretrieve(query_str)

        source, context = response_context[0].text.split(sep="[SPLIT]")
        chunks, relationships, entities = context.split("<>")

        chunks = chunks.split("|")
        entities = entities.split("|")
        relationships = relationships.split("|")

        def to_node(text: str) -> NodeWithScore:
            node = TextNode()
            node.set_content(text)
            node = NodeWithScore(node=node, score=0)
            return node

        chunks = list(map(to_node, chunks))
        entities = list(map(to_node, entities))
        relationships = list(map(to_node, relationships))
        logger.info(
            "entities are %s, %s",
            entities,
            relationships
        )

        response_generator = self.aresponse_generator(
            query_str,
            chunks,
            entities,
            relationships
        )
        return StreamingResponse(
            response_gen=response_generator,
            source_nodes=[int(source)]
        )
