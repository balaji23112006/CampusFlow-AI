import sys
sys.path.insert(0, '.')

print("=== Clearing synthetic data and ingesting real SRMAP docs ===")
from app.db.session import SessionLocal
from app.services.rag_service import RAGService
from app.models.policy import PolicyKnowledge

db = SessionLocal()
try:
    result = RAGService.seed_knowledge_base(db)

    print("")
    print("--- INGESTION RESULTS ---")
    print("Synthetic rows removed :", result["synthetic_removed"])
    print("Files found            :", result["files_found"])
    print("Files parsed           :", result["files_parsed"])
    print("Chunks total           :", result["chunks_total"])
    print("Chunks inserted        :", result["chunks_inserted"])
    print("Chunks updated         :", result["chunks_updated"])
    print("Files flagged (year)   :", result["files_flagged"])
    print("")

    total = db.query(PolicyKnowledge).count()
    real  = db.query(PolicyKnowledge).filter(PolicyKnowledge.source_file.isnot(None)).count()
    syn   = db.query(PolicyKnowledge).filter(PolicyKnowledge.source_file.is_(None)).count()
    print("DB verification:")
    print("  total_rows         :", total)
    print("  real_doc_chunks    :", real)
    print("  synthetic_remaining:", syn)

finally:
    db.close()
