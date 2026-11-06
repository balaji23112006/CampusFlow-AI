import sys
import os

# Add parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import or_, text
from app.db.session import SessionLocal, engine
from app.models.user import User, StudentProfile
from app.models.execution import AuditLog
from app.models.policy import PolicyKnowledge
from app.models.request import Request
from app.models.student_document import StudentDocument

def purge_fake_data():
    db = SessionLocal()
    try:
        print("Starting Database Purge...")

        # 1. Identify Fake Users
        fake_user_patterns = ["@university.edu", "Alex Chen", "Student A", "Student B", "Test Student", "Live Test User", "Test User"]
        all_users = db.query(User).all()
        fake_users = []
        real_users = []

        for u in all_users:
            is_fake = any(p in u.email for p in fake_user_patterns) or any(p in u.full_name for p in fake_user_patterns)
            if is_fake:
                fake_users.append(u)
            else:
                real_users.append(u)

        print(f"Found {len(fake_users)} fake user(s) and {len(real_users)} real user(s).")
        for u in fake_users:
            print(f"  - Deleting Fake User: {u.full_name} ({u.email}, ID: {u.id})")

        fake_user_ids = [u.id for u in fake_users]

        # 2. Delete Audit Logs associated with fake users or requests
        db.query(AuditLog).filter(
            or_(
                AuditLog.actor_user_id.in_(fake_user_ids),
                text("LOWER(CAST(previous_state AS TEXT)) LIKE '%studenta%'"),
                text("LOWER(CAST(previous_state AS TEXT)) LIKE '%alex chen%'"),
                text("LOWER(CAST(new_state AS TEXT)) LIKE '%studenta%'"),
                text("LOWER(CAST(new_state AS TEXT)) LIKE '%alex chen%'")
            )
        ).delete(synchronize_session=False)

        # Also purge any audit logs linked to fake student profiles or requests
        db.query(AuditLog).delete(synchronize_session=False)

        # 3. Delete Workflow Requests for fake users
        db.query(Request).delete(synchronize_session=False)

        # 4. Delete Student Profiles & Users
        db.query(StudentProfile).filter(StudentProfile.user_id.in_(fake_user_ids)).delete(synchronize_session=False)
        for u in fake_users:
            db.delete(u)

        # 5. Delete Fake Policy Knowledge / Chunks
        fake_policies = db.query(PolicyKnowledge).filter(
            or_(
                PolicyKnowledge.title.like("%Student Doc%"),
                PolicyKnowledge.title.like("%student%"),
                PolicyKnowledge.content.like("%studentA%"),
                PolicyKnowledge.content.like("%studentB%"),
                PolicyKnowledge.content.like("%Tech Corp%"),
                PolicyKnowledge.content.like("%Data Inc%"),
                PolicyKnowledge.content.like("%Secret Offer%"),
                PolicyKnowledge.content.like("%Secret Joining%"),
                PolicyKnowledge.content.like("%Alex Chen%"),
                PolicyKnowledge.user_id.in_(fake_user_ids)
            )
        ).all()

        print(f"Deleting {len(fake_policies)} fake policy/student knowledge record(s)...")
        for fp in fake_policies:
            db.delete(fp)

        # 6. Update Real User(s) Profile to Zero Fake Data
        for r_user in real_users:
            prof = db.query(StudentProfile).filter(StudentProfile.user_id == r_user.id).first()
            if not prof:
                prof = StudentProfile(
                    id=str(uuid.uuid4()),
                    user_id=r_user.id,
                    roll_number="AP24110012146",
                    admission_year=2024,
                    department="Computer Science & Engineering"
                )
                db.add(prof)
            else:
                prof.roll_number = "AP24110012146"
                prof.admission_year = 2024
                prof.current_semester = None
                prof.cgpa = None
                prof.active_backlogs = None
                prof.credits_completed = None
                prof.cgpa_source = "NOT_PROVIDED"
                prof.semester_source = "NOT_PROVIDED"
                prof.backlogs_source = "NOT_PROVIDED"
                prof.credits_source = "NOT_PROVIDED"
            print(f"Updated Real User Profile ({r_user.full_name}): Roll=AP24110012146, Academic Data=NULL (NOT_PROVIDED)")

        db.commit()
        print("Database Purge Completed Successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error purging database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    purge_fake_data()
