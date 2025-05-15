from llama_index.core.base.response.schema import Response, StreamingResponse
from llama_index.core.query_engine import CustomQueryEngine
from llama_index.core.llms import LLM, ChatResponse
from llama_index.core import VectorStoreIndex
from llama_index.core.llms import ChatMessage
from llama_index.core import Settings
from typing import Generator, AsyncGenerator

from llama_index.core.vector_stores.types import VectorStore
from pydantic import PrivateAttr
from app.logger import logger

import re

AGGREGATE_PROMPT = """
You are a query engine aggregator. You task is to combine information from a knowledge graph into a concise answer to a user provided query. The answer should effectively incorporate data to answer all aspects of the query.
"""


class GraphRAGLocalQueryEngine(CustomQueryEngine):
    index: VectorStoreIndex
    _llm: LLM = PrivateAttr(default_factory=lambda: Settings.llm)
    similarity_top_k: int = 20

    def generate_answer_from_context(self, context, query):
        prompt = (
            f"Given the context extracted from a knowledge graph: {context}"
            f"how would you answer the following query? Query: {query}"
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

        logger.info(response_context[0])

        source, context = response_context[0].text.split(sep="[SPLIT]")

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
