from llama_index.core.base.response.schema import StreamingResponse
from llama_index.core.query_engine import CustomQueryEngine
from llama_index.core.llms import LLM, ChatResponse
from llama_index.core import VectorStoreIndex
from llama_index.core.llms import ChatMessage
from llama_index.core import Settings
from typing import Generator, AsyncGenerator

from pydantic import PrivateAttr
from app.logger import logger

from .GraphRagStore import GraphRAGStore

import re


class GraphRAGQueryEngine(CustomQueryEngine):
    graph_store: GraphRAGStore
    index: VectorStoreIndex
    _llm: LLM = PrivateAttr(default_factory=lambda: Settings.llm)
    similarity_top_k: int = 20

    def custom_query(self, query_str: str) -> StreamingResponse:
        """Process all community summaries to generate answers to a specific query."""

        response_gen = self.response_generator(query_str)
        logger.info("Response generator created...")

        return StreamingResponse(response_gen=response_gen)

    async def acustom_query(self, query_str: str) -> StreamingResponse:
        summaries, source_nodes = await self.aget_summaries(query_str)
        response_gen = self.aresponse_generator(query_str, summaries)

        return StreamingResponse(
            response_gen=response_gen,
            source_nodes=source_nodes
        )

    def response_generator(self, query_str: str, community_summaries) -> Generator:
        logger.info("Synchronous Reponse generator!")
        logger.info("Summaries: {%s}", community_summaries)
        community_answers = []

        for community_summary in community_summaries:
            community_answers.append("")
            summary_generator = self.stream_answer_from_summary(
                community_summary,
                query_str
            )

            yield ChatResponse(message=ChatMessage(), delta="[SUMSTART]")
            for tok in summary_generator:
                logger.info("summary token %s", tok)
                yield tok
                community_summary[-1] += tok
            yield ChatResponse(message=ChatMessage(), delta="[SUMEND]")

            community_summary = community_summary

        logger.info("Community answers: {%s}", community_answers)
        response_gen = self.aggregate_answers_stream(community_answers)

        yield ChatResponse(message=ChatMessage(), delta="[FINALSTART]")
        for tok in response_gen:
            yield tok
        yield ChatResponse(message=ChatMessage(), delta="[FINALEND]")

    async def aresponse_generator(self, query_str: str, community_summaries) -> AsyncGenerator:
        community_answers = []

        for community_summary in community_summaries:
            summary_generator = self.stream_answer_from_summary(
                community_summary,
                query_str
            )

            summary = []

            yield ChatResponse(message=ChatMessage(), delta="[SUMSTART]")
            for tok in summary_generator:
                yield tok
                summary.append(tok.delta)
            yield ChatResponse(message=ChatMessage(), delta="[SUMEND]")

            # yield ChatResponse(message=ChatMessage(), delta="\n")
            summary = ' '.join(summary)
            community_answers.append(summary)

        logger.info("Community answers: {%s}", community_answers)
        response_gen = self.aggregate_answers_stream(community_answers)
        for tok in response_gen:
            yield tok

    def get_summaries(self, query_str):
        # Use the async version of the retriever
        retriever = self.index.as_retriever(
            similarity_top_k=self.similarity_top_k
        )
        # Use the async retrieve method
        nodes_retrieved = retriever.retrieve(query_str)

        summaries = []
        for node in nodes_retrieved:
            summaries.append(node.text)

        return summaries, nodes_retrieved

    async def aget_summaries(self, query_str):
        """Async version of get_summaries"""
        # Use the async version of the retriever
        retriever = self.index.as_retriever(
            similarity_top_k=self.similarity_top_k
        )
        # Use the async retrieve method
        nodes_retrieved = await retriever.aretrieve(query_str)

        summaries = []
        for node in nodes_retrieved:
            summaries.append(node.text)

        return summaries, nodes_retrieved

    def generate_answer_from_summary(self, community_summary, query):
        """Generate an answer from a community summary based on a given query using LLM."""
        prompt = (
            f"Given the community summary: {community_summary}, "
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

    def stream_answer_from_summary(self, community_summary, query) -> Generator:
        """Generate an answer from a community summary based on a given query using LLM."""
        prompt = (
            f"Given the community summary: {community_summary}, "
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

    def aggregate_answers(self, community_answers):
        """Aggregate individual community answers into a final, coherent response."""
        prompt = "Combine the following intermediate answers into a final, concise response."
        messages = [
            ChatMessage(role="system", content=prompt),
            ChatMessage(
                role="user",
                content=f"Intermediate answers: {community_answers}",
            ),
        ]
        final_response = self._llm.chat(messages)
        cleaned_final_response = re.sub(
            r"^assistant:\s*", "", str(final_response)
        ).strip()
        return cleaned_final_response

    def aggregate_answers_stream(self, community_answers) -> Generator:
        """
        Aggregate individual community answers and return a generator that streams the response.
        This method returns a generator directly, not a coroutine.
        """
        prompt = "Combine the following intermediate answers into a final, concise response."
        messages = [
            ChatMessage(role="system", content=prompt),
            ChatMessage(
                role="user",
                content=f"Intermediate answers: {community_answers}",
            ),
        ]
        logger.info("Streaming started...")
        return self._llm.stream_chat(messages)
