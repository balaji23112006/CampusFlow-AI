from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine
from app.db.base import Base
from app.api.v1.api import api_router

# Ensure all database tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Autonomous University Service Agent Backend API"
)

# Configure CORS for local development & cross-origin requests
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)


from fastapi.responses import HTMLResponse, Response

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def root_landing_page():
    """
    Renders an HTML landing page when visiting http://localhost:8000 in a browser.
    """
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CampusFlow AI – Backend API System</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-6 md:p-12">
    <div class="max-w-4xl mx-auto space-y-8">
        <!-- Header Banner -->
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div class="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="flex items-center justify-between flex-wrap gap-4">
                <div class="space-y-2">
                    <div class="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-semibold">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Backend API Engine Online & Ready
                    </div>
                    <h1 class="text-3xl font-extrabold text-white tracking-tight">CampusFlow AI Backend API</h1>
                    <p class="text-slate-400 text-sm max-w-xl">
                        Autonomous University Administrative Service System powered by FastAPI, 15-node LangGraph state machine, RAG vector retrieval, and PostgreSQL.
                    </p>
                </div>
                <div class="flex items-center gap-3">
                    <a href="/docs" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2">
                        <span>Interactive Swagger Docs</span>
                        <span>→</span>
                    </a>
                    <a href="/redoc" class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700">
                        ReDoc
                    </a>
                </div>
            </div>
        </div>

        <!-- Endpoint Quick Links -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href="/api/v1/health" target="_blank" class="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 p-5 rounded-2xl transition-all block group">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase text-indigo-400">System Health</span>
                    <span class="text-slate-500 group-hover:text-indigo-400">↗</span>
                </div>
                <p class="text-sm font-semibold text-slate-200 mt-2">/api/v1/health</p>
                <p class="text-xs text-slate-400 mt-1">Database connection & system status check</p>
            </a>

            <a href="/api/v1/approvals/pending" target="_blank" class="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 p-5 rounded-2xl transition-all block group">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase text-amber-400">Approvals Queue</span>
                    <span class="text-slate-500 group-hover:text-indigo-400">↗</span>
                </div>
                <p class="text-sm font-semibold text-slate-200 mt-2">/api/v1/approvals/pending</p>
                <p class="text-xs text-slate-400 mt-1">Pending human approval decision queue</p>
            </a>

            <a href="/api/v1/documents" target="_blank" class="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 p-5 rounded-2xl transition-all block group">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase text-emerald-400">Documents API</span>
                    <span class="text-slate-500 group-hover:text-indigo-400">↗</span>
                </div>
                <p class="text-sm font-semibold text-slate-200 mt-2">/api/v1/documents</p>
                <p class="text-xs text-slate-400 mt-1">Uploaded supporting documents & verification</p>
            </a>
        </div>

        <!-- API Service Catalog -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h2 class="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                <span>Core API Service Catalog</span>
            </h2>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-300">
                    <thead class="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                        <tr>
                            <th class="p-3">HTTP Method</th>
                            <th class="p-3">Endpoint Path</th>
                            <th class="p-3">Description</th>
                            <th class="p-3">Access Level</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800/60">
                        <tr>
                            <td class="p-3 font-mono font-bold text-emerald-400">GET</td>
                            <td class="p-3 font-mono text-slate-200">/api/v1/health</td>
                            <td class="p-3 text-slate-400">System and database connectivity status check</td>
                            <td class="p-3"><span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">Public</span></td>
                        </tr>
                        <tr>
                            <td class="p-3 font-mono font-bold text-emerald-400">GET</td>
                            <td class="p-3 font-mono text-slate-200">/api/v1/workflows</td>
                            <td class="p-3 text-slate-400">Fetch authenticated user workflow requests</td>
                            <td class="p-3"><span class="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px]">Student / Auth</span></td>
                        </tr>
                        <tr>
                            <td class="p-3 font-mono font-bold text-emerald-400">GET</td>
                            <td class="p-3 font-mono text-slate-200">/api/v1/approvals/pending</td>
                            <td class="p-3 text-slate-400">Fetch requests requiring human staff sign-off</td>
                            <td class="p-3"><span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">Staff Only</span></td>
                        </tr>
                        <tr>
                            <td class="p-3 font-mono font-bold text-indigo-400">POST</td>
                            <td class="p-3 font-mono text-slate-200">/api/v1/approvals/decide</td>
                            <td class="p-3 text-slate-400">Submit human decision (Approve, Request Changes, Reject)</td>
                            <td class="p-3"><span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">Staff Only</span></td>
                        </tr>
                        <tr>
                            <td class="p-3 font-mono font-bold text-indigo-400">POST</td>
                            <td class="p-3 font-mono text-slate-200">/api/v1/documents/upload</td>
                            <td class="p-3 text-slate-400">Secure 10MB PDF document upload and validation</td>
                            <td class="p-3"><span class="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px]">Authenticated</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</body>
</html>"""
    return HTMLResponse(content=html_content)

@app.get("/favicon.ico", include_in_schema=False)
def favicon_handler():
    """Handle browser favicon request cleanly"""
    return Response(content=b"", media_type="image/x-icon")


# Mount API Routers under /api/v1 and /api
app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router, prefix=settings.API_PREFIX)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)


