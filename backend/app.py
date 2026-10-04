import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from agents import run_analysis


# ---------------------------------------------------------
# LOGGING
# ---------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

logger = logging.getLogger("finintel")


# ---------------------------------------------------------
# APP
# ---------------------------------------------------------

app = FastAPI(
    title="FinIntel",
    description="AI Financial Intelligence Terminal"
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# REQUEST MODEL
# ---------------------------------------------------------

class QueryRequest(BaseModel):
    query: str


# ---------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------

@app.get("/")
def root():
    return {
        "name": "FinIntel",
        "status": "running"
    }


# ---------------------------------------------------------
# ANALYSIS
# ---------------------------------------------------------

@app.post("/analyze")
def analyze(request: QueryRequest):

    query = request.query.strip()

    # Empty query protection
    if not query:
        return JSONResponse(
            status_code=400,
            content={
                "error": "INVALID_QUERY",
                "message": "Please enter a financial question."
            }
        )

    try:

        logger.info("Analysis request received: %s", query)

        result = run_analysis(query)

        logger.info("Analysis completed successfully")

        return result

    except Exception as exc:

        logger.exception("Analysis failed")

        return JSONResponse(
            status_code=500,
            content={
                "error": "ANALYSIS_FAILED",
                "message": "FinIntel could not complete this analysis.",
                "detail": str(exc)
            }
        )