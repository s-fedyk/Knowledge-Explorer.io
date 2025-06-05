from llama_index.core.base.response.schema import StreamingResponse
from llama_index.core.query_engine import CustomQueryEngine
from llama_index.core.llms import LLM, ChatResponse
from llama_index.core import VectorStoreIndex
from llama_index.core.llms import ChatMessage
from llama_index.core import Settings
from typing import Generator, AsyncGenerator

from llama_index.core.schema import NodeWithScore
from pydantic import PrivateAttr
from app.logger import logger

from .GraphRagStore import GraphRAGStore

import re


def parse_numbered(text: str) -> list[str]:
    # Pattern: digit(s) followed by period and space, capturing the questions
    pattern = r'\d+\.\s+'
    # Split the text using the pattern
    elements = re.split(pattern, text)

    # Remove any empty strings from the beginning if the text starts with a number
    if elements and not elements[0]:
        elements.pop(0)

    return elements

# The GraphRAGQueryEngine class is a custom query engine designed to perform
# Retrieval-Augmented Generation (RAG) using a graph-based approach.
# It leverages community summaries from a graph store and a vector index
# to generate comprehensive answers to user queries.
class GraphRAGQueryEngine(CustomQueryEngine):
    graph_store: GraphRAGStore # Stores graph data and community summaries.
    index: VectorStoreIndex # Vector index for efficient similarity search over summaries.
    _llm: LLM = PrivateAttr(default_factory=lambda: Settings.llm) # Language Model instance.
    similarity_top_k: int = 20 # Number of top similar summaries to retrieve.

    def custom_query(self, query_str: str) -> StreamingResponse:
        """
        Synchronously processes a query.
        It retrieves relevant community summaries, generates individual answers from them,
        aggregates these answers, and streams the final response.
        This is the primary entry point for non-asynchronous queries.

        Args:
            query_str: The user's query string.

        Returns:
            A StreamingResponse object containing the generated response and source nodes.
        """
        summaries, source_nodes = self.get_summaries(query_str)

        response_gen = self.response_generator(query_str, summaries)
        logger.info("Response generator created...")

        return StreamingResponse(
            response_gen=response_gen,
            source_nodes=source_nodes
        )

    async def acustom_query(self, query_str: str) -> StreamingResponse:
        """
        Asynchronously processes a query. This is the asynchronous counterpart to `custom_query`.
        It retrieves relevant community summaries, generates individual answers,
        aggregates them, and streams the final response. It's suitable for use in
        async FastAPI endpoints.

        Args:
            query_str: The user's query string.

        Returns:
            A StreamingResponse object containing the generated response and source nodes.
        """
        logger.info("Using llm, %s", self._llm)

        # Retrieve relevant community summaries and their source nodes asynchronously.
        summaries, source_nodes = await self.aget_summaries(query_str)
        # Generate the response asynchronously by processing the summaries.
        response_gen = self.aresponse_generator(query_str, summaries)

        return StreamingResponse(
            response_gen=response_gen, # The asynchronous generator for the response stream.
            source_nodes=source_nodes   # List of source nodes used for the response.
        )

    def combine_summaries(self, summaries: list[str]):
        # This method is currently a placeholder and does not implement any logic.
        # It might be intended for a future feature to combine summaries before processing.
        return

    def response_generator(self, query_str: str, community_summaries) -> Generator:
        """
        Synchronously generates a response by processing community summaries.
        It streams answers from each summary and then aggregates them.
        Special tokens [SUMSTART], [SUMEND], [FINALSTART], [FINALEND] are used
        to demarcate different parts of the streamed response.

        Args:
            query_str: The user's query.
            community_summaries: A list of community summaries to process.

        Yields:
            Tokens of the generated response.
        """
        logger.info("Synchronous Reponse generator!")
        logger.info("Summaries: {%s}", community_summaries)
        community_answers = [] # Stores answers generated from each summary.

        # Iterate through each community summary to generate an answer.
        for community_summary in community_summaries:
            community_answers.append("") # Initialize an empty string for the current answer.
            # Stream an answer from the current community summary.
            summary_generator = self.stream_answer_from_summary(
                community_summary,
                query_str
            )

            yield ChatResponse(message=ChatMessage(), delta="[SUMSTART]") # Signal start of a summary-based answer.
            for tok in summary_generator:
                logger.info("summary token %s", tok)
                yield tok # Stream the token.
                community_answers[-1] += tok # Append token to the current community answer.
            yield ChatResponse(message=ChatMessage(), delta="[SUMEND]") # Signal end of a summary-based answer.

            # The line `community_summary = community_summary` seems redundant and has no effect.
            # It might be a leftover from previous code.

        logger.info("Community answers: {%s}", community_answers)
        # Aggregate the individual community answers into a final response stream.
        response_gen = self.aggregate_answers_stream(community_answers)

        yield ChatResponse(message=ChatMessage(), delta="[FINALSTART]") # Signal start of the final aggregated answer.
        for tok in response_gen:
            yield tok # Stream tokens of the final answer.
        yield ChatResponse(message=ChatMessage(), delta="[FINALEND]") # Signal end of the final aggregated answer.

    async def aresponse_generator(self, query_str: str, community_summaries) -> AsyncGenerator:
        """
        Asynchronously generates a response by processing community summaries.
        It streams answers from each summary and then aggregates them. This is the async
        version of `response_generator`.
        Special tokens [SUMSTART], [SUMEND], [FINALSTART], [FINALEND] are used
        to demarcate different parts of the streamed response.

        Args:
            query_str: The user's query.
            community_summaries: A list of community summaries to process.

        Yields:
            Tokens of the generated response asynchronously.
        """
        community_answers = [] # Stores answers generated from each summary.
        # Iterate through each community summary to generate an answer.
        for community_summary in community_summaries:
            # Stream an answer from the current community summary.
            summary_generator = self.stream_answer_from_summary(
                community_summary,
                query_str
            )
            summary_parts = [] # Collect parts of the current summary's answer.
            yield ChatResponse(message=ChatMessage(), delta="[SUMSTART]") # Signal start of a summary-based answer.
            for tok in summary_generator:
                yield tok # Stream the token.
                if hasattr(tok, 'delta') and tok.delta: # Ensure token has a delta attribute
                    summary_parts.append(tok.delta)
            yield ChatResponse(message=ChatMessage(), delta="[SUMEND]") # Signal end of a summary-based answer.
            community_answers.append(' '.join(summary_parts)) # Join parts to form the complete answer for this summary.

        logger.info("Community answers: {%s}", community_answers)
        # Aggregate the individual community answers into a final response stream.
        response_gen = self.aggregate_answers_stream(community_answers)
        yield ChatResponse(message=ChatMessage(), delta="[FINALSTART]") # Signal start of the final aggregated answer.
        for tok in response_gen:
            yield tok # Stream tokens of the final answer.
        yield ChatResponse(message=ChatMessage(), delta="[FINALEND]") # Signal end of the final aggregated answer.

    def get_summaries(self, query_str):
        """
        Synchronously retrieves relevant community summaries based on the query.
        It uses a vector index retriever to find the top_k most similar summaries.

        Args:
            query_str: The user's query.

        Returns:
            A tuple containing a list of summary texts and the retrieved NodeWithScore objects.
        """
        # Configure a retriever from the vector index.
        retriever = self.index.as_retriever(
            similarity_top_k=self.similarity_top_k
        )
        # Retrieve nodes (summaries) based on similarity to the query.
        nodes_retrieved: list[NodeWithScore] = retriever.retrieve(query_str)

        summaries = []
        for node in nodes_retrieved:
            summaries.append(node.text) # Extract the text of each summary.

        return summaries, nodes_retrieved

    async def aget_summaries(self, query_str: str) -> tuple[list[str], list[int]]:
        """
        Asynchronously retrieves relevant community summaries based on the query.
        It uses a vector index retriever to find the top_k most similar summaries.
        This version also parses out a source identifier from the node text.

        Args:
            query_str: The user's query string.

        Returns:
            A tuple containing:
                - A list of summary texts.
                - A list of integer source identifiers corresponding to each summary.
        """
        # Configure an asynchronous retriever from the vector index.
        retriever = self.index.as_retriever(
            similarity_top_k=self.similarity_top_k
        )

        # Asynchronously retrieve nodes (summaries) based on similarity to the query.
        nodes_retrieved: list[NodeWithScore] = await retriever.aretrieve(query_str)
        logger.info(nodes_retrieved)

        summaries = [] # List to store the text of the summaries.
        sources = []   # List to store the source identifiers for each summary.
        for node in nodes_retrieved:
            # Expects node text to be formatted as "source_id[SPLIT]summary_text"
            try:
                source, text = node.text.split(sep="[SPLIT]", maxsplit=1)
                summaries.append(text)
                sources.append(int(source)) # Convert source part to integer.
            except ValueError:
                # Handle cases where splitting or int conversion fails.
                logger.error(f"Could not parse source from node text: {node.text}")
                # Fallback: use the full text as summary and a placeholder for source.
                summaries.append(node.text)
                sources.append(-1) # Or some other indicator of a parsing failure.


        return summaries, sources

    def generate_answer_from_summary(self, community_summary: str, query: str) -> str:
        """
        Generates a single, non-streamed answer from a community summary based on a given query using the LLM.
        This method is useful when a complete answer is needed at once, rather than streamed.

        Args:
            community_summary: The text of the community summary.
            query: The user's query.

        Returns:
            A string containing the generated answer, cleaned of assistant prefixes.
        """
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
        response = self._llm.chat(messages) # Get a complete chat response from the LLM.
        # Clean the response by removing any "assistant: " prefix.
        cleaned_response = re.sub(r"^assistant:\s*", "", str(response)).strip()
        return cleaned_response

    def stream_answer_from_summary(self, community_summary: str, query: str) -> Generator:
        """
        Streams an answer from a single community summary based on a given query using the LLM.
        This method is used within the response generators to provide incremental updates.

        Args:
            community_summary: The text of the community summary.
            query: The user's query.

        Returns:
            A generator that yields tokens of the LLM's response.
        """
        logger.info(
            "community=%s\nquery=%s",
            community_summary,
            query
        )
        prompt = (
            f"Given the community summary: {community_summary}, "
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
        response = self._llm.stream_chat(messages) # Stream chat response from the LLM.
        return response

    def aggregate_answers(self, community_answers: list[str]) -> str:
        """
        Aggregates individual community answers into a final, coherent, non-streamed response using the LLM.
        This is useful when a single, consolidated answer is required after processing all summaries.

        Args:
            community_answers: A list of answers generated from individual community summaries.

        Returns:
            A string containing the final aggregated answer, cleaned of assistant prefixes.
        """
        prompt = (
            f"Logically combine the following intermediate answers into a final, coherent, concise response."
            f"Your answer can include markdown snippets"
        )
        messages = [
            ChatMessage(role="system", content=prompt),
            ChatMessage(
                role="user",
                content=f"Intermediate answers: {community_answers}",
            ),
        ]
        final_response = self._llm.chat(messages) # Get a complete aggregated response.
        # Clean the response.
        cleaned_final_response = re.sub(
            r"^assistant:\s*", "", str(final_response)
        ).strip()
        return cleaned_final_response

    def aggregate_answers_stream(self, community_answers: list[str]) -> Generator:
        """
        Aggregates individual community answers and returns a generator that streams the final response.
        This method is used by the response generators to stream the final consolidated answer.

        Args:
            community_answers: A list of answers generated from individual community summaries.

        Returns:
            A generator that yields tokens of the final aggregated LLM response.
        """
        prompt = (
            f"Logically combine the following intermediate answers into a final, coherent, concise response."
            f"Your answer can include markdown snippets"
        )
        messages = [
            ChatMessage(role="system", content=prompt),
            ChatMessage(
                role="user",
                content=f"Intermediate answers: {community_answers}",
            ),
        ]
        logger.info("Streaming aggregated answer started...")
        return self._llm.stream_chat(messages) # Stream the aggregated chat response.
