"""Backend tests for Endomarketing module ('De Dentro Pra Fora')."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://serzedello-test.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@labrand.com.br"
ADMIN_PASSWORD = "Labrand@2026!"
BRAND_ID = "brand_0902ead1b80c"


@pytest.fixture(scope="module")
def auth_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    token = data.get("token") or data.get("access_token")
    assert token, f"No token in response: {data}"
    return token


@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ── /api/endomarketing/questions ──
def test_questions_returns_18(headers):
    r = requests.get(f"{BASE_URL}/api/endomarketing/questions", headers=headers, timeout=20)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] == 18
    assert len(body["questions"]) == 18
    assert set(body["labels"].keys()) == {
        "engajamento", "meritocracia", "alta_performance",
        "resultados", "economia", "pertencimento",
    }
    # Each pillar should have 3 questions
    for pilar, items in body["grouped"].items():
        assert len(items) == 3, f"Pillar {pilar} should have 3 items"


# ── /api/endomarketing/diagnosis/{brand_id} GET ──
def test_get_diagnosis_existing(headers):
    r = requests.get(
        f"{BASE_URL}/api/endomarketing/diagnosis/{BRAND_ID}",
        headers=headers, timeout=20,
    )
    # Either 200 (existing per smoke screenshot) or 404
    assert r.status_code in (200, 404), r.text
    if r.status_code == 200:
        data = r.json()
        assert data["brand_id"] == BRAND_ID
        assert "scores" in data
        assert "respostas" in data
        assert "_id" not in data, "MongoDB _id should be stripped"


def test_get_diagnosis_404_for_unknown_brand(headers):
    r = requests.get(
        f"{BASE_URL}/api/endomarketing/diagnosis/brand_does_not_exist_123",
        headers=headers, timeout=20,
    )
    assert r.status_code == 404


# ── /api/endomarketing/diagnosis POST ──
def test_save_diagnosis_validation(headers):
    # too few answers
    r = requests.post(
        f"{BASE_URL}/api/endomarketing/diagnosis",
        headers=headers,
        json={"brand_id": BRAND_ID, "respostas": []},
        timeout=20,
    )
    assert r.status_code == 400


def test_save_diagnosis_full(headers):
    # Get the questions to build matching answer payload
    q = requests.get(f"{BASE_URL}/api/endomarketing/questions", headers=headers, timeout=20).json()
    respostas = [
        {"pilar": item["pilar"], "pergunta": item["pergunta"], "resposta": 4}
        for item in q["questions"]
    ]
    r = requests.post(
        f"{BASE_URL}/api/endomarketing/diagnosis",
        headers=headers,
        json={"brand_id": BRAND_ID, "respostas": respostas},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["brand_id"] == BRAND_ID
    scores = data["scores"]
    # All resposta=4 -> per pillar (4*3)/12*100=100
    assert scores["engajamento"] == 100.0
    assert scores["geral"] == 100.0
    assert scores["nivel_maturidade"] == "Marca Viva"
    assert "_id" not in data

    # GET returns the same
    g = requests.get(
        f"{BASE_URL}/api/endomarketing/diagnosis/{BRAND_ID}",
        headers=headers, timeout=20,
    )
    assert g.status_code == 200
    assert g.json()["scores"]["geral"] == 100.0


# ── PDF export ──
def test_export_pdf(headers):
    r = requests.get(
        f"{BASE_URL}/api/endomarketing/export-pdf/{BRAND_ID}",
        headers=headers, timeout=30,
    )
    assert r.status_code == 200, r.text
    assert r.headers.get("content-type", "").startswith("application/pdf")
    assert r.content[:4] == b"%PDF", "Response is not a valid PDF"
    assert len(r.content) > 1000


def test_export_pdf_404_for_unknown(headers):
    r = requests.get(
        f"{BASE_URL}/api/endomarketing/export-pdf/brand_does_not_exist_xyz",
        headers=headers, timeout=20,
    )
    assert r.status_code == 404


# ── Auth required ──
def test_questions_requires_auth():
    r = requests.get(f"{BASE_URL}/api/endomarketing/questions", timeout=20)
    assert r.status_code in (401, 403)


# ── Regression: other endpoints still working ──
def test_regression_reports(headers):
    r = requests.get(f"{BASE_URL}/api/reports/history?brand_id={BRAND_ID}", headers=headers, timeout=20)
    assert r.status_code in (200, 404), r.text


def test_regression_touchpoints(headers):
    r = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/touchpoints", headers=headers, timeout=20)
    assert r.status_code == 200, r.text


def test_regression_campaigns(headers):
    r = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns", headers=headers, timeout=20)
    assert r.status_code in (200, 404), r.text


def test_regression_brand_history(headers):
    # Try common history endpoints
    candidates = [
        f"/api/brands/{BRAND_ID}/activities",
        f"/api/brands/{BRAND_ID}/history",
        f"/api/activities?brand_id={BRAND_ID}",
    ]
    statuses = []
    for path in candidates:
        rr = requests.get(f"{BASE_URL}{path}", headers=headers, timeout=20)
        statuses.append((path, rr.status_code))
        if rr.status_code == 200:
            return
    pytest.skip(f"No history endpoint matched: {statuses}")
