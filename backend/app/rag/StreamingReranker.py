from llama_index.core.indices.utils import (
    default_format_node_batch_fn,
    default_parse_choice_select_answer_fn,
)
import logging
from llama_index.core.prompts.mixin import PromptDictType
from llama_index.core.llms import LLM, ChatResponse
from llama_index.core import BasePromptTemplate
from llama_index.core.postprocessor.llm_rerank import LLMRerank
from llama_index.core.llms import ChatMessage
from llama_index.core import Settings
from typing import Callable, Generator, List, Optional, Tuple
from pydantic import Field, PrivateAttr, SerializeAsAny

from llama_index.core.schema import (
    NodeWithScore,
    QueryBundle
)

from app.rag.prompts import CHOICE_RERANKING_PROMPT

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class StreamingReranker(LLMRerank):
    """LLM-based reranker."""
    top_n: int = Field(description="Top N nodes to return.")
    choice_select_prompt: SerializeAsAny[BasePromptTemplate] = Field(
        description="Choice select prompt."
    )
    choice_batch_size: int = Field(description="Batch size for choice select.")
    llm: LLM = Field(description="The LLM to rerank with.")

    _format_node_batch_fn: Callable = PrivateAttr()
    _parse_choice_select_answer_fn: Callable = PrivateAttr()

    def __init__(
        self,
        llm: Optional[LLM] = None,
        choice_select_prompt: Optional[BasePromptTemplate] = None,
        choice_batch_size: int = 10,
        format_node_batch_fn: Optional[Callable] = None,
        parse_choice_select_answer_fn: Optional[Callable] = None,
        top_n: int = 10,
    ) -> None:
        choice_select_prompt = CHOICE_RERANKING_PROMPT
        llm = llm or Settings.llm

        super().__init__(
            llm=llm,
            choice_select_prompt=choice_select_prompt,
            choice_batch_size=choice_batch_size,
            top_n=top_n,
        )
        self._format_node_batch_fn = (
            format_node_batch_fn or default_format_node_batch_fn
        )
        self._parse_choice_select_answer_fn = (
            parse_choice_select_answer_fn or default_parse_choice_select_answer_fn
        )

    def _get_prompts(self) -> PromptDictType:
        """Get prompts."""
        return {"choice_select_prompt": self.choice_select_prompt}

    def _update_prompts(self, prompts: PromptDictType) -> None:
        """Update prompts."""
        if "choice_select_prompt" in prompts:
            self.choice_select_prompt = prompts["choice_select_prompt"]

    @classmethod
    def class_name(cls) -> str:
        return "LLMRerank"

    def streaming_postprocess_nodes(
        self,
        nodes: List[NodeWithScore],
        query_bundle: Optional[QueryBundle] = None,
    ) -> Tuple[Generator[str, None, None], str]:

        if query_bundle is None:
            raise ValueError("Query bundle must be provided.")

        # early exit
        if not nodes:
            def _empty_stream():
                yield "[no nodes to rerank]"
            return _empty_stream(), ""

        # 1) define your streamer
        def _stream():
            total = len(nodes)
            initial_results = []
            for i in range(0, total, self.choice_batch_size):
                if (i != 0):
                    yield ChatResponse(message=ChatMessage(), delta="\n")

                batch = nodes[i: i + self.choice_batch_size]
                context_str = [
                    f"Document {i}:\n{node.text}\n" for i, node in enumerate(batch)
                ]

                logger.info("context is = [%s]", context_str)

                result_str = ""
                for chunk in self.llm.stream(
                    self.choice_select_prompt,
                    context_str=context_str,
                    query_str=query_bundle.query_str,
                ):
                    result_str += chunk
                    yield ChatResponse(message=ChatMessage(), delta=chunk)

                logger.info("Full rerank is %s", result_str)
                # parse final response of this batch
                raw_choices, relevances = self._parse_choice_select_answer_fn(
                    "<full response if needed>", len(batch)
                )

                # …build partial NodeWithScore list…
                choice_idxs = [int(c) - 1 for c in raw_choices]
                for idx, rel in zip(choice_idxs, relevances or []):
                    node = batch[idx].node
                    initial_results.append(NodeWithScore(node=node, score=rel))

        def to_string(node: NodeWithScore) -> str:
            return node.text

        all_results = sorted(
            [
                NodeWithScore(node=n.node, score=n.score or 0.0)
                for n in nodes
            ],
            key=lambda x: x.score,
            reverse=True,
        )[:self.top_n]

        stringified_nodes = "\n".join(map(to_string, all_results))
        return _stream(), stringified_nodes
