from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from controllers.businesses_controller import router as businesses_router
from controllers.ingest_controller import router as ingest_router
from controllers.runway_controller import router as runway_router
from controllers.decide_controller import router as decide_router
from controllers.recommend_controller import router as recommend_router
from controllers.transactions_controller import router as transactions_router

app = FastAPI(
    title="CashFlow Copilot API",
    description=(
        "4-layer financial decision engine for SMEs. "
        "Layers 2 and 3 are deterministic math only; "
        "LLM (Gemini) is used only in Layer 1 (OCR) and Layer 4 (CoT)."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Open for hackathon dev; tighten before production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Businesses — selector
app.include_router(businesses_router, prefix="/api", tags=["Businesses"])

# Layer 1 — Document Ingestion (Gemini Flash)
app.include_router(ingest_router, prefix="/api", tags=["Layer 1 — Ingestion"])

# Layer 2 — Runway Detection (pure math)
app.include_router(runway_router, prefix="/api", tags=["Layer 2 — Runway"])

# Layer 3 — Decision Sandbox (pure math)
app.include_router(decide_router, prefix="/api", tags=["Layer 3 — Decision"])

# Layer 4 — Recommendation Engine (Gemini Pro)
app.include_router(recommend_router, prefix="/api", tags=["Layer 4 — Recommendation"])

# Transactions — Obligations Ledger CRUD
app.include_router(transactions_router, prefix="/api", tags=["Transactions"])


@app.get("/", tags=["Health"])
async def root():
    return {"message": "CashFlow Copilot API is running", "docs": "/docs"}
