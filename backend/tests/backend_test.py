"""CollegePredict AI – backend regression tests."""
import os
import io
import json
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://college-match-india-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

STUDENT_EMAIL = "student@demo.com"
STUDENT_PW = "Student@123"
ADMIN_EMAIL = "admin@collegepredict.ai"
ADMIN_PW = "Admin@123"


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def student_token():
    return _login(STUDENT_EMAIL, STUDENT_PW)


@pytest.fixture(scope="session")
def admin_token():
    return _login(ADMIN_EMAIL, ADMIN_PW)


@pytest.fixture
def student_headers(student_token):
    return {"Authorization": f"Bearer {student_token}", "Content-Type": "application/json"}


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------- health / stats ----------
class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_stats(self):
        r = requests.get(f"{API}/stats", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["colleges"] >= 40
        assert d["courses"] >= 30
        assert d["exams"] >= 18


# ---------- auth ----------
class TestAuth:
    def test_login_student(self):
        r = requests.post(f"{API}/auth/login", json={"email": STUDENT_EMAIL, "password": STUDENT_PW})
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and "user" in d
        assert d["user"]["email"] == STUDENT_EMAIL

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": STUDENT_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_with_bearer(self, student_headers):
        r = requests.get(f"{API}/auth/me", headers=student_headers)
        assert r.status_code == 200
        assert r.json()["email"] == STUDENT_EMAIL

    def test_register_and_duplicate(self):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={"name": "Test User", "email": email, "password": "Test@12345"})
        assert r.status_code == 200, r.text
        assert r.json()["user"]["email"] == email
        r2 = requests.post(f"{API}/auth/register", json={"name": "Test User", "email": email, "password": "Test@12345"})
        assert r2.status_code == 400


# ---------- predictor ----------
class TestPredictor:
    def test_jee_main_percentile(self):
        r = requests.post(f"{API}/predict", json={"exam_id": "jee-main", "percentile": 96.2, "category": "General"}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["total"] > 0
        found = False
        for b in ("dream", "target", "safe"):
            assert isinstance(d[b], list)
            for item in d[b]:
                for k in ("probability", "bucket", "confidence", "historical_cutoff", "expected_cutoff_range", "reason"):
                    assert k in item, f"missing {k}"
                found = True
        assert found

    def test_neet_score(self):
        r = requests.post(f"{API}/predict", json={"exam_id": "neet", "score": 650, "category": "OBC"}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["total"] >= 0

    def test_missing_score(self):
        r = requests.post(f"{API}/predict", json={"exam_id": "neet", "category": "General"}, timeout=30)
        assert r.status_code == 400


# ---------- catalog ----------
class TestCatalog:
    def test_colleges_filters(self):
        r = requests.get(f"{API}/colleges", params={"state": "Delhi", "type": "Government", "exam": "jee-main", "max_fee": 300000, "sort": "placement", "page": 1})
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "total" in d

    def test_college_detail(self):
        r = requests.get(f"{API}/colleges/iit-delhi")
        assert r.status_code == 200
        d = r.json()
        assert d["slug"] == "iit-delhi"
        assert "cutoffs" in d and "similar" in d and "courses" in d
        if d["courses"]:
            assert "course" in d["courses"][0]

    def test_college_404(self):
        r = requests.get(f"{API}/colleges/unknown-xyz")
        assert r.status_code == 404

    def test_courses_list_and_detail(self):
        assert requests.get(f"{API}/courses").status_code == 200
        r = requests.get(f"{API}/courses/computer-science-engineering")
        assert r.status_code == 200
        d = r.json()
        assert "top_colleges" in d and "exam_details" in d

    def test_exams(self):
        assert requests.get(f"{API}/exams").status_code == 200
        r = requests.get(f"{API}/exams/jee-main")
        assert r.status_code == 200
        assert r.json()["slug"] == "jee-main"

    def test_cutoffs(self):
        r = requests.get(f"{API}/cutoffs", params={"exam": "jee-advanced", "college": "iit-delhi", "category": "General"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_scholarships(self):
        r = requests.get(f"{API}/scholarships", params={"category": "SC", "gender": "Female"})
        assert r.status_code == 200

    def test_deadlines(self):
        assert requests.get(f"{API}/deadlines").status_code == 200

    def test_search(self):
        r = requests.get(f"{API}/search", params={"q": "iit"})
        assert r.status_code == 200
        d = r.json()
        assert "colleges" in d


# ---------- student (authenticated) ----------
class TestStudent:
    def test_dashboard(self, student_headers):
        r = requests.get(f"{API}/dashboard", headers=student_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ("readiness", "checklist", "prediction_counts", "recommended", "deadlines"):
            assert k in d

    def test_profile_get_put(self, student_headers):
        r = requests.get(f"{API}/profile", headers=student_headers)
        assert r.status_code == 200
        r = requests.put(f"{API}/profile", headers=student_headers, json={"city": "Jaipur"})
        assert r.status_code == 200
        assert r.json().get("city") == "Jaipur"

    def test_predictions_mine(self, student_headers):
        r = requests.get(f"{API}/predictions/mine", headers=student_headers)
        assert r.status_code == 200

    def test_shortlist_crud(self, student_headers):
        r = requests.post(f"{API}/shortlist", headers=student_headers, json={"college_id": "iit-delhi", "course_id": "computer-science-engineering", "bucket": "dream"})
        assert r.status_code == 200
        item = r.json()
        item_id = item["id"]
        r = requests.get(f"{API}/shortlist", headers=student_headers)
        assert r.status_code == 200 and any(s["id"] == item_id for s in r.json())
        r = requests.patch(f"{API}/shortlist/{item_id}", headers=student_headers, json={"bucket": "target"})
        assert r.status_code == 200
        r = requests.delete(f"{API}/shortlist/{item_id}", headers=student_headers)
        assert r.status_code == 200

    def test_applications_crud(self, student_headers):
        r = requests.post(f"{API}/applications", headers=student_headers, json={"title": "TEST_app", "status": "Not Started"})
        assert r.status_code == 200
        app_id = r.json()["id"]
        assert requests.get(f"{API}/applications", headers=student_headers).status_code == 200
        r = requests.patch(f"{API}/applications/{app_id}", headers=student_headers, json={"status": "In Progress"})
        assert r.status_code == 200
        assert r.json()["status"] == "In Progress"
        assert requests.delete(f"{API}/applications/{app_id}", headers=student_headers).status_code == 200

    def test_documents(self, student_headers):
        r = requests.get(f"{API}/documents", headers=student_headers)
        assert r.status_code == 200
        docs = r.json()
        assert isinstance(docs, list) and len(docs) > 0
        did = docs[0]["id"]
        r = requests.patch(f"{API}/documents/{did}", headers=student_headers, json={"done": True})
        assert r.status_code == 200

    def test_notifications(self, student_headers):
        assert requests.get(f"{API}/notifications", headers=student_headers).status_code == 200
        assert requests.post(f"{API}/notifications/read-all", headers=student_headers).status_code == 200

    def test_compare(self, student_headers):
        r = requests.post(f"{API}/compare", headers=student_headers, json={"slugs": ["iit-delhi", "dtu"]})
        assert r.status_code == 200
        assert len(r.json()) == 2

    def test_fees_calculate(self):
        r = requests.post(f"{API}/fees/calculate", json={"tuition": 200000, "hostel": 50000, "years": 4})
        assert r.status_code == 200
        d = r.json()
        assert "annual" in d and "total" in d

    def test_roi_calculate(self):
        r = requests.post(f"{API}/roi/calculate", json={"total_cost": 1000000, "avg_package_lpa": 15, "years": 4})
        assert r.status_code == 200
        assert "roi_score" in r.json()

    def test_parent_view(self, student_headers):
        r = requests.get(f"{API}/parent/view", headers=student_headers)
        assert r.status_code == 200

    def test_email_digest_demo_rejects(self, student_headers):
        # Expected 502 because provider rejects demo.com domain (per task note). Accept 200 if ok too.
        r = requests.post(f"{API}/notifications/email-digest", headers=student_headers, timeout=30)
        assert r.status_code in (200, 400, 502), r.text


# ---------- AI ----------
class TestAI:
    def test_chat_sse(self, student_headers):
        # Use requests streaming
        with requests.post(f"{API}/ai/chat", headers={"Authorization": student_headers["Authorization"]}, json={"message": "Can I get NIT Trichy CSE?"}, stream=True, timeout=90) as r:
            assert r.status_code == 200
            got_start = got_done = False
            delta_count = 0
            cards = None
            for line in r.iter_lines(decode_unicode=True):
                if not line or not line.startswith("data: "):
                    continue
                evt = json.loads(line[6:])
                t = evt.get("type")
                if t == "start":
                    got_start = True
                elif t == "delta":
                    delta_count += 1
                elif t == "done":
                    got_done = True
                    cards = evt.get("cards", [])
                elif t == "error":
                    pytest.skip(f"AI error: {evt.get('message')}")
            assert got_start and got_done
            assert delta_count > 0

    def test_conversations_list(self, student_headers):
        r = requests.get(f"{API}/ai/conversations", headers=student_headers)
        assert r.status_code == 200
        convs = r.json()
        assert isinstance(convs, list)
        if convs:
            cid = convs[0]["id"]
            r2 = requests.get(f"{API}/ai/conversations/{cid}", headers=student_headers)
            assert r2.status_code == 200
            assert "messages" in r2.json()

    def test_compare_summary(self, student_headers):
        r = requests.post(f"{API}/ai/compare-summary", headers=student_headers, json={"slugs": ["iit-delhi", "dtu"]}, timeout=90)
        assert r.status_code == 200, r.text
        assert "summary" in r.json() and len(r.json()["summary"]) > 10

    def test_cutoff_insight(self):
        r = requests.post(f"{API}/ai/cutoff-insight", json={"series": [{"year": 2023, "DTU · CSE": 4000}, {"year": 2024, "DTU · CSE": 3900}], "metric": "rank"}, timeout=90)
        assert r.status_code == 200
        assert "insight" in r.json()


# ---------- admin ----------
class TestAdmin:
    def test_kpis(self, admin_headers):
        r = requests.get(f"{API}/admin/kpis", headers=admin_headers)
        assert r.status_code == 200
        assert "students" in r.json()

    def test_analytics(self, admin_headers):
        assert requests.get(f"{API}/admin/analytics", headers=admin_headers).status_code == 200

    def test_students_colleges(self, admin_headers):
        assert requests.get(f"{API}/admin/students", headers=admin_headers).status_code == 200
        assert requests.get(f"{API}/admin/colleges", headers=admin_headers).status_code == 200

    def test_knowledge_crud(self, admin_headers):
        r = requests.post(f"{API}/admin/knowledge", headers=admin_headers, json={"title": "TEST_kb", "content": "test", "slug": f"test-kb-{uuid.uuid4().hex[:6]}"})
        assert r.status_code == 200
        item_id = r.json()["id"]
        r = requests.put(f"{API}/admin/knowledge/{item_id}", headers=admin_headers, json={"title": "TEST_kb2"})
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_kb2"
        r = requests.delete(f"{API}/admin/knowledge/{item_id}", headers=admin_headers)
        assert r.status_code == 200

    def test_cutoffs_import_csv(self, admin_token):
        csv_data = "exam_id,college_id,course_id,category,year,closing,round,quota\njee-main,dtu,computer-science-engineering,General,2024,3900,6,AI\n"
        files = {"file": ("test.csv", io.BytesIO(csv_data.encode()), "text/csv")}
        r = requests.post(f"{API}/admin/cutoffs/import", headers={"Authorization": f"Bearer {admin_token}"}, files=files)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["imported"] >= 1

    def test_forbidden_for_student(self, student_headers):
        r = requests.get(f"{API}/admin/kpis", headers=student_headers)
        assert r.status_code == 403
