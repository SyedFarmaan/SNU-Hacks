from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.controllers import router as api_router

app = FastAPI(title="CashFlow Copilot API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for hackathon development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Welcome to CashFlow Copilot API"}
