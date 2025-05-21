from llama_index.core.base.response.schema import Response, StreamingResponse
from llama_index.core.query_engine import CustomQueryEngine
from llama_index.core.llms import LLM
from llama_index.core import VectorStoreIndex
from llama_index.core.postprocessor.llm_rerank import LLMRerank
from llama_index.core.llms import ChatMessage
from llama_index.core import Settings
from typing import Generator, AsyncGenerator
from pydantic import PrivateAttr
from llama_index.core.schema import (
    NodeWithScore,
    BaseNode,
    TextNode,
)

from app.logger import logger

import re


class GraphRAGLocalQueryEngine(CustomQueryEngine):
    index: VectorStoreIndex
    _llm: LLM = PrivateAttr(default_factory=lambda: Settings.llm)
    similarity_top_k: int = 20

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

        ranker = LLMRerank(
            choice_batch_size=5,
            top_n=10
        )
        chunks = ranker.postprocess_nodes(
            chunks,
            query_str=query_str
        )
        entities = ranker.postprocess_nodes(
            entities,
            query_str=query_str
        )
        relationships = ranker.postprocess_nodes(
            relationships,
            query_str=query_str
        )

        def to_text(node: NodeWithScore) -> str:
            text = node.get_content()
            return text

        chunks = "\n".join(list(map(to_text, chunks)))
        entities = "\n".join(list(map(to_text, entities)))
        relationships = "\n".join(list(map(to_text, relationships)))

        generator = self.stream_answer_from_context(
            context,
            query_str
        )

        async def gen(response) -> AsyncGenerator:
            for r in response:
                yield r

        return StreamingResponse(
            response_gen=gen(generator),
            source_nodes=[int(source)]
        )
