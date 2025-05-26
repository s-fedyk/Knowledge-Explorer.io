from typing import Generator, Dict, Any
from app.dependencies import get_global_engine, get_local_engine


def get_job_generator(jobType: str, query_params: Dict[str, Any], *args) -> Generator:
    global_engine = get_global_engine(query_params["top_k"])
    local_engine = get_local_engine(query_params["top_k"])

    jobTypeToJobStream = {
        "community_summary": global_engine.stream_answer_from_summary,
        "report-aggregation": global_engine.aggregate_answers_stream,
        "rerank": local_engine.rerank,
        "entity-extraction": local_engine.stream_entity_extraction,
        "entity-aggregation": local_engine.stream_answer_from_context
    }

    return jobTypeToJobStream[jobType](*args)
