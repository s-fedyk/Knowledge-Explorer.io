from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import rag
from app.api.endpoints import gql

app = FastAPI(
    title="RAG API",
    description="Retrieval-Augmented Generation API using LlamaIndex",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(rag.router, prefix="/api/v1")
app.include_router(gql.router, prefix="/graphql")


@app.get("/")
async def root():
    return {"message": "Welcome to the RAG API"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
