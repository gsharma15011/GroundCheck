"""Main FastAPI application for GroundCheck.
"""
import logging
import threading
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from .config import settings
from .api.endpoints import router as api_router
from .engine.retrieval import hybrid_retriever
from .engine.embeddings import embedding_manager
from .engine.nli_verifier import nli_verifier

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("GroundCheck")


def background_model_warmup():
    """Warms up local embedding and NLI models in a background worker thread.
    """
    logger.info("Starting background model initialization...")
    # Initialize hybrid retrieval index first (fast)
    hybrid_retriever.build_index()
    # Initialize embedding model
    embedding_manager.initialize()
    # Re-build index with precomputed dense embeddings once model is loaded
    if embedding_manager.is_ready:
        hybrid_retriever.build_index()
    # Initialize NLI model
    nli_verifier.initialize()
    logger.info("Background model initialization complete.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.app_name} v{settings.app_version}...")
    # Start thread for model loading so API starts instantly without blocking
    thread = threading.Thread(target=background_model_warmup, daemon=True)
    thread.start()
    yield
    logger.info("Shutting down GroundCheck...")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Evidence-first AI answer verification and verifier stress-testing.",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Structured error handling
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    req_id = f"REQ-{uuid.uuid4().hex[:8]}"
    logger.warning(f"Validation error on {request.url.path}: {exc.errors()}")
    # Format details safely without exposing sensitive internals
    details = "; ".join([f"{'.'.join(str(l) for l in err['loc'])}: {err['msg']}" for err in exc.errors()])
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error_code": "VALIDATION_ERROR",
            "detail": details,
            "request_id": req_id,
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    req_id = f"REQ-{uuid.uuid4().hex[:8]}"
    logger.error(f"Internal server error [{req_id}]: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error_code": "INTERNAL_SERVER_ERROR",
            "detail": "An internal server error occurred while processing the verification request.",
            "request_id": req_id,
        },
    )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
    }


# Include main API router
app.include_router(api_router)
