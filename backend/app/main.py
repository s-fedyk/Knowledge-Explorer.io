# Import necessary FastAPI modules and other dependencies
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# Import routers for different API endpoints
from app.api.endpoints import document
from app.api.endpoints import query
from app.api.endpoints import gql
# Import utility for managing application lifespan events
from contextlib import asynccontextmanager
# Import clients for MongoDB and S3
from app.client.mongo_client import get_mongo_client
from app.client.s3_client import get_s3_client
# Import settings initialization function
from app.dependencies import init_settings
import os

# The lifespan context manager handles setup and teardown operations for the application.
# It ensures that resources like database connections are established before the app starts
# and cleaned up when the app shuts down.
@asynccontextmanager
async def lifespan(_: FastAPI):
    # Code here runs before the application starts.
    # Initialize MongoDB client
    await get_mongo_client()
    # Initialize S3 client
    get_s3_client()
    # Initialize application settings
    init_settings()
    yield # This yield separates startup and shutdown logic. Code after yield runs on shutdown.
    # Add any cleanup code here (e.g., closing database connections) if necessary.

# Initialize the FastAPI application instance.
# - title, description, version: Provide metadata for the API documentation.
# - lifespan: Registers the lifespan context manager to handle startup and shutdown events.
app = FastAPI(
    title="RAG API",
    description="Retrieval-Augmented Generation API using LlamaIndex",
    version="0.1.0",
    lifespan=lifespan
)

# Determine the environment (development or production)
env: str = os.getenv("ENV", "dev")

# Define allowed origins for CORS (Cross-Origin Resource Sharing).
# In development, allow all origins ("*"). In production, restrict to the frontend domain.
origins = ["*"]
if env == "produdction": # Note: "produdction" likely a typo, should be "production"
    origins = ["http://knowledge-explorer.io"]

# Add CORS (Cross-Origin Resource Sharing) middleware to the application.
# This allows the frontend (running on a different domain/port) to make requests to this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Specifies which origins are allowed to make requests.
    allow_credentials=True, # Allows cookies to be included in cross-origin requests.
    allow_methods=["*"],    # Allows all HTTP methods.
    allow_headers=["*"],    # Allows all HTTP headers.
)


# Include API routers. Each router handles a specific set of related endpoints.
# - document.router: Handles document-related operations (upload, list, etc.).
# - query.router: Handles query and RAG-related operations.
# - gql.router: Handles GraphQL specific endpoints.
app.include_router(document.router, prefix="/api/v1") # All document routes will be prefixed with /api/v1
app.include_router(query.router, prefix="/api/v1")     # All query routes will be prefixed with /api/v1
app.include_router(gql.router, prefix="/graphql")       # GraphQL endpoint

# Define a simple root endpoint for health checks or basic API information.
@app.get("/")
async def root():
    return {"message": "Welcome to the RAG API"}

# Define a health check endpoint.
# This can be used by monitoring services to verify that the API is running.
@app.get("/health")
async def health():
    return {"status": "healthy"}
