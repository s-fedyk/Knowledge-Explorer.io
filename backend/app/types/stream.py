from typing import Generator
from app.dependencies import get_global_engine, get_local_engine


def get_job_generator(jobType: str, top_k: int = 3, *args) -> Generator:
    global_engine = get_global_engine(top_k)
    local_engine = get_local_engine(top_k)

    jobTypeToJobStream = {
        "community_summary": global_engine.stream_answer_from_summary,
        "report-aggregation": global_engine.aggregate_answers_stream,
        "rerank": local_engine.rerank,
        "entity-extraction": local_engine.stream_entity_extraction,
        "entity-aggregation": local_engine.stream_answer_from_context
    }

    return jobTypeToJobStream[jobType](*args)
