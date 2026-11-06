from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import uuid

from app.main import app
from app.db.session import Base, get_db
from app.core.security import validate_email_format, validate_password_complexity, hash_password
from app.models.user import User, StudentProfile
from app.models.request import Request

from sqlalchemy.pool import StaticPool

# Setup in-memory SQLite database for security tests using StaticPool
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

def setup_module(module):
    Base.metadata.create_all(bind=engine)

def teardown_module(module):
    Base.metadata.drop_all(bind=engine)


# ==========================================
# 1. EMAIL VALIDATION TESTS
# ==========================================
def test_email_validation():
    invalid_emails = [
        "abc",
        "abc@",
        "abc.com@",
        "@domain.com",
        "user@domain",
        "user domain.com",
        "user@@domain.com"
    ]
    for invalid in invalid_emails:
        assert validate_email_format(invalid) is False, f"Failed to reject invalid email: {invalid}"

    valid_emails = [
        "student@gmail.com",
        "student@example.com",
        "alex.chen@university.edu"
    ]
    for valid in valid_emails:
        assert validate_email_format(valid) is True, f"Failed to accept valid email: {valid}"


# ==========================================
# 2. PASSWORD COMPLEXITY TESTS
# ==========================================
def test_password_complexity():
    invalid_passwords = [
        "password",      # too short, no uppercase, no number, no special
        "Password",      # no number, no special
        "Password123",   # no special character
        "password123",   # no uppercase, no special
        "PASS@123",      # no lowercase
        "Short@1"        # less than 8 chars
    ]
    for invalid in invalid_passwords:
        is_valid, _ = validate_password_complexity(invalid)
        assert is_valid is False, f"Failed to reject weak password: {invalid}"

    valid_passwords = [
        "Campus@123",
        "SecureP@ss2026",
        "A1b2c3d4!"
    ]
    for valid in valid_passwords:
        is_valid, _ = validate_password_complexity(valid)
        assert is_valid is True, f"Failed to accept strong password: {valid}"


# ==========================================
# 3. REGISTRATION & LOGIN E2E FLOW
# ==========================================
def test_registration_and_login_flow():
    # 3.1 Reject invalid email
    res = client.post("/api/v1/auth/register", json={
        "email": "invalid-email@",
        "password": "Campus@123",
        "confirm_password": "Campus@123",
        "full_name": "Test User",
        "role": "student"
    })
    assert res.status_code == 400
    assert "valid email" in res.json()["detail"].lower()

    # 3.2 Reject password mismatch
    res = client.post("/api/v1/auth/register", json={
        "email": "user1@example.com",
        "password": "Campus@123",
        "confirm_password": "DifferentPassword@123",
        "full_name": "Test User",
        "role": "student"
    })
    assert res.status_code == 400
    assert "passwords do not match" in res.json()["detail"].lower()

    # 3.3 Reject weak password
    res = client.post("/api/v1/auth/register", json={
        "email": "user1@example.com",
        "password": "Password123",
        "confirm_password": "Password123",
        "full_name": "Test User",
        "role": "student"
    })
    assert res.status_code == 400

    # 3.4 Valid Registration
    res = client.post("/api/v1/auth/register", json={
        "email": "user1@example.com",
        "password": "Campus@123",
        "confirm_password": "Campus@123",
        "full_name": "Test User One",
        "role": "student"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "user1@example.com"
    token1 = data["access_token"]

    # 3.5 Reject registration with existing email
    res = client.post("/api/v1/auth/register", json={
        "email": "user1@example.com",
        "password": "Campus@123",
        "confirm_password": "Campus@123",
        "full_name": "Duplicate User",
        "role": "student"
    })
    assert res.status_code == 400

    # 3.6 Login with wrong password -> Generic 401 Error
    res = client.post("/api/v1/auth/login", json={
        "email": "user1@example.com",
        "password": "WrongPassword@123"
    })
    assert res.status_code == 401
    assert res.json()["detail"] == "Invalid email or password."

    # 3.7 Login with unknown email -> Generic 401 Error (Prevent enumeration)
    res = client.post("/api/v1/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "Campus@123"
    })
    assert res.status_code == 401
    assert res.json()["detail"] == "Invalid email or password."

    # 3.8 Successful Login
    res = client.post("/api/v1/auth/login", json={
        "email": "user1@example.com",
        "password": "Campus@123"
    })
    assert res.status_code == 200
    assert "access_token" in res.json()

    # 3.9 Access protected endpoint GET /api/v1/auth/me
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token1}"})
    assert res.status_code == 200
    assert res.json()["email"] == "user1@example.com"


# ==========================================
# 4. CHANGE PASSWORD TESTS
# ==========================================
def test_change_password_flow():
    # Register user
    res = client.post("/api/v1/auth/register", json={
        "email": "user2@example.com",
        "password": "Campus@123",
        "confirm_password": "Campus@123",
        "full_name": "Test User Two",
        "role": "student"
    })
    token2 = res.json()["access_token"]

    # 4.1 Wrong current password -> "Current password is incorrect."
    res = client.post("/api/v1/auth/change-password",
        headers={"Authorization": f"Bearer {token2}"},
        json={
            "current_password": "WrongCurrentPassword@123",
            "new_password": "NewCampus@456",
            "confirm_new_password": "NewCampus@456"
        }
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "Current password is incorrect."

    # 4.2 New password matches current password
    res = client.post("/api/v1/auth/change-password",
        headers={"Authorization": f"Bearer {token2}"},
        json={
            "current_password": "Campus@123",
            "new_password": "Campus@123",
            "confirm_new_password": "Campus@123"
        }
    )
    assert res.status_code == 400
    assert "different" in res.json()["detail"].lower()

    # 4.3 New password mismatch
    res = client.post("/api/v1/auth/change-password",
        headers={"Authorization": f"Bearer {token2}"},
        json={
            "current_password": "Campus@123",
            "new_password": "NewCampus@456",
            "confirm_new_password": "MismatchedPassword@456"
        }
    )
    assert res.status_code == 400
    assert "new passwords do not match" in res.json()["detail"].lower()

    # 4.4 Successful Password Change
    res = client.post("/api/v1/auth/change-password",
        headers={"Authorization": f"Bearer {token2}"},
        json={
            "current_password": "Campus@123",
            "new_password": "NewCampus@456",
            "confirm_new_password": "NewCampus@456"
        }
    )
    assert res.status_code == 200
    assert res.json()["status"] == "success"

    # 4.5 Old password no longer works
    res = client.post("/api/v1/auth/login", json={
        "email": "user2@example.com",
        "password": "Campus@123"
    })
    assert res.status_code == 401

    # 4.6 Login with new password succeeds
    res = client.post("/api/v1/auth/login", json={
        "email": "user2@example.com",
        "password": "NewCampus@456"
    })
    assert res.status_code == 200
    assert "access_token" in res.json()


# ==========================================
# 5. USER DATA ISOLATION TESTS
# ==========================================
def test_user_data_isolation():
    db = TestingSessionLocal()

    # Create User A and User B
    u_a = User(id=str(uuid.uuid4()), email="usera@example.com", full_name="User A", role="student")
    u_b = User(id=str(uuid.uuid4()), email="userb@example.com", full_name="User B", role="student")
    db.add_all([u_a, u_b])
    db.flush()

    sp_a = StudentProfile(id=str(uuid.uuid4()), user_id=u_a.id, roll_number="AP24110000001", admission_year=2024, department="CS", current_semester=6, cgpa=3.8, active_backlogs=0, credits_completed=100)
    sp_b = StudentProfile(id=str(uuid.uuid4()), user_id=u_b.id, roll_number="AP24110000002", admission_year=2024, department="CS", current_semester=6, cgpa=3.8, active_backlogs=0, credits_completed=100)
    db.add_all([sp_a, sp_b])
    db.flush()

    from app.models.workflow import Workflow

    # Create Workflow
    wf = Workflow(id=str(uuid.uuid4()), code="INTERNSHIP_NOC", name="Internship NOC Workflow")
    db.add(wf)
    db.flush()

    # Request owned by User A
    req_a = Request(id="req-user-a-001", student_id=sp_a.id, workflow_id=wf.id, status="in_review")
    db.add(req_a)
    req_id = req_a.id
    db.commit()
    db.close()

    # Register/login as User B
    res_b = client.post("/api/v1/auth/register", json={
        "email": "userb_test@example.com",
        "password": "Campus@123",
        "confirm_password": "Campus@123",
        "full_name": "User B",
        "role": "student"
    })
    token_b = res_b.json()["access_token"]

    # User B attempts to access User A's workflow request -> 403 Forbidden
    res = client.get(f"/api/v1/workflows/{req_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert res.status_code == 403
    assert "forbidden" in res.json()["detail"].lower()


def test_student_academic_profile_endpoint():
    """Test GET and PUT /api/v1/student/academic-profile endpoint with validation and session authorization."""
    res_reg = client.post("/api/v1/auth/register", json={
        "email": "acad_user@example.com",
        "password": "Campus@123",
        "confirm_password": "Campus@123",
        "full_name": "Academic Test User",
        "role": "student"
    })
    token = res_reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. GET academic profile for new student -> all academic fields None ("Not provided")
    res_get = client.get("/api/v1/student/academic-profile", headers=headers)
    assert res_get.status_code == 200
    pdata = res_get.json()
    assert pdata["cgpa"] is None
    assert pdata["current_semester"] is None
    assert pdata["active_backlogs"] is None
    assert pdata["credits_completed"] is None
    assert pdata["is_complete"] is False
    assert pdata["cgpa_source"] == "NOT_PROVIDED"

    # 2. Invalid CGPA update (> 10.0) -> 400 Bad Request
    res_bad = client.put("/api/v1/student/academic-profile", headers=headers, json={"cgpa": 11.5})
    assert res_bad.status_code == 400
    assert "enter a valid cgpa" in res_bad.json()["detail"].lower()

    # 3. Invalid semester update (> 8) -> 400 Bad Request
    res_bad_sem = client.put("/api/v1/student/academic-profile", headers=headers, json={"current_semester": 9})
    assert res_bad_sem.status_code == 400

    # 4. Valid academic profile update
    res_upd = client.put("/api/v1/student/academic-profile", headers=headers, json={
        "current_semester": 5,
        "cgpa": 3.75,
        "active_backlogs": 0,
        "credits_completed": 92.0
    })
    assert res_upd.status_code == 200
    upd_data = res_upd.json()["student_profile"]
    assert upd_data["current_semester"] == 5
    assert upd_data["cgpa"] == 3.75
    assert upd_data["active_backlogs"] == 0
    assert upd_data["credits_completed"] == 92.0
    assert upd_data["is_complete"] is True
    assert upd_data["cgpa_source"] == "SELF_REPORTED"

    # 5. Verify GET returns updated profile values
    res_get_2 = client.get("/api/v1/student/academic-profile", headers=headers)
    assert res_get_2.status_code == 200
    assert res_get_2.json()["cgpa"] == 3.75


def run_all_security_tests():
    print("\n==================================================")
    print(" RUNNING AUTHENTICATION & SECURITY TEST SUITE")
    print("==================================================")
    Base.metadata.create_all(bind=engine)
    
    test_email_validation()
    print("  [PASS] Email validation tests passed (accept valid, reject invalid formats).")

    test_password_complexity()
    print("  [PASS] Password complexity policy tests passed (accept Campus@123, reject weak passwords).")

    test_registration_and_login_flow()
    print("  [PASS] Registration & login E2E tests passed (reject email mismatch, generic 401 on wrong password).")

    test_change_password_flow()
    print("  [PASS] Change password tests passed (reject wrong current password, verify new password update).")

    test_user_data_isolation()
    print("  [PASS] User data isolation tests passed (User A cannot access User B's workflows).")

    test_student_academic_profile_endpoint()
    print("  [PASS] Student academic profile endpoint tests passed (GET/PUT validation & self-reported sources).")

    Base.metadata.drop_all(bind=engine)
    print("==================================================")
    print(" ALL SECURITY & AUTHORIZATION TESTS PASSED CLEANLY!")
    print("==================================================\n")

if __name__ == "__main__":
    run_all_security_tests()

