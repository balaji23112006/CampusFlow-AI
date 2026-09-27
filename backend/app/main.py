from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="CampusFlow AI Backend",
    description="Autonomous University Service Agent Backend API",
    version="0.1.0"
)

# Configure CORS for local development & cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
@app.get("/api/health")
def get_health():
    """
    Health check endpoint returning system status.
    """
    return {
        "status": "ok",
        "service": "CampusFlow AI Backend"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
