from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from core import db, NO_ID, uid, now_iso, track, notify
from auth import get_current_user, get_user_optional
from predictor import run_prediction
from email_service import send_email, deadline_digest_html

router = APIRouter(tags=["student"])
COL_PROJ = {"_id": 0, "reviews": 0, "faqs": 0, "about": 0, "admission_process": 0, "facilities": 0, "recruiters": 0}


class ProfileIn(BaseModel):
    class_year: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    home_state: Optional[str] = None
    preferred_states: Optional[List[str]] = None
    exam_id: Optional[str] = None
    rank: Optional[int] = None
    percentile: Optional[float] = None
    score: Optional[float] = None
    category: Optional[str] = None
    gender: Optional[str] = None
    preferred_courses: Optional[List[str]] = None
    college_type: Optional[str] = None
    budget: Optional[int] = None
    hostel_required: Optional[bool] = None
    priorities: Optional[List[str]] = None
    career_goal: Optional[str] = None
    board_percentage: Optional[float] = None
    notification_prefs: Optional[dict] = None
    parent_email: Optional[str] = None
    parent_share_ai: Optional[bool] = None


@router.get("/profile")
async def get_profile(user=Depends(get_current_user)):
    return await db.student_profiles.find_one({"user_id": user["user_id"]}, NO_ID) or {"user_id": user["user_id"]}


@router.put("/profile")
async def update_profile(body: ProfileIn, user=Depends(get_current_user)):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    data["updated_at"] = now_iso()
    await db.student_profiles.update_one({"user_id": user["user_id"]}, {"$set": data, "$setOnInsert": {"user_id": user["user_id"]}}, upsert=True)
    if not user.get("onboarded") and data.get("exam_id"):
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"onboarded": True}})
        await track("onboarding_completed", user["user_id"])
    return await db.student_profiles.find_one({"user_id": user["user_id"]}, NO_ID)


class PredictIn(BaseModel):
    exam_id: str
    rank: Optional[int] = None
    percentile: Optional[float] = None
    score: Optional[float] = None
    category: str = "General"
    home_state: Optional[str] = None
    gender: Optional[str] = None
    prefs: Optional[dict] = None
    save_to_profile: bool = False


@router.post("/predict")
async def predict(body: PredictIn, user=Depends(get_user_optional)):
    uid_ = user and user["user_id"]
    await track("prediction_started", uid_, {"exam": body.exam_id})
    try:
        result = await run_prediction(body.exam_id, rank=body.rank, percentile=body.percentile, score=body.score, category=body.category, home_state=body.home_state, gender=body.gender, prefs=body.prefs)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if uid_:
        await db.predictions.insert_one({"id": uid("pred_"), "user_id": uid_, "input": body.model_dump(), "total": result["total"], "counts": {k: len(result[k]) for k in ("dream", "target", "safe")}, "created_at": now_iso()})
        if body.save_to_profile:
            await db.student_profiles.update_one({"user_id": uid_}, {"$set": {"exam_id": body.exam_id, "rank": body.rank, "percentile": body.percentile, "score": body.score, "category": body.category, "home_state": body.home_state or None, "updated_at": now_iso()}, "$setOnInsert": {"user_id": uid_}}, upsert=True)
    await track("prediction_completed", uid_, {"exam": body.exam_id, "total": result["total"]})
    return result


@router.get("/predictions/mine")
async def my_predictions(user=Depends(get_current_user)):
    p = await db.student_profiles.find_one({"user_id": user["user_id"]}, NO_ID)
    if not p or not p.get("exam_id") or not (p.get("rank") or p.get("percentile") or p.get("score")):
        return {"total": 0, "dream": [], "target": [], "safe": [], "needs_profile": True}
    try:
        res = await run_prediction(p["exam_id"], rank=p.get("rank"), percentile=p.get("percentile"), score=p.get("score"), category=p.get("category", "General"), home_state=p.get("home_state"), gender=p.get("gender"), prefs={"budget": p.get("budget")} if p.get("budget") else None)
    except ValueError:
        return {"total": 0, "dream": [], "target": [], "safe": [], "needs_profile": True}
    return res


@router.get("/dashboard")
async def dashboard(user=Depends(get_current_user)):
    u = user["user_id"]
    profile = await db.student_profiles.find_one({"user_id": u}, NO_ID) or {}
    saved = await db.saved_colleges.find({"user_id": u}, NO_ID).to_list(100)
    apps = await db.applications.find({"user_id": u}, NO_ID).sort("deadline", 1).to_list(50)
    docs = await db.documents.find({"user_id": u}, NO_ID).to_list(50)
    deadlines = await db.deadlines.find({"$or": [{"exam_id": profile.get("exam_id")}, {"exam_id": None}]}, NO_ID).sort("date", 1).limit(5).to_list(5)
    unread = await db.notifications.count_documents({"user_id": u, "read": False})
    checklist = [
        {"label": "Academic profile", "done": bool(profile.get("class_year") and profile.get("state"))},
        {"label": "Exam score", "done": bool(profile.get("exam_id") and (profile.get("rank") or profile.get("percentile") or profile.get("score")))},
        {"label": "College preferences", "done": bool(profile.get("preferred_courses"))},
        {"label": "Shortlist (3+ colleges)", "done": len(saved) >= 3},
        {"label": "Documents", "done": bool(docs) and all(d["done"] for d in docs)},
        {"label": "Application deadlines tracked", "done": len(apps) > 0},
    ]
    readiness = int(round(100 * sum(c["done"] for c in checklist) / len(checklist)))
    counts = {b: sum(1 for s in saved if s["bucket"] == b) for b in ("dream", "target", "safe")}
    recommended = []
    if checklist[1]["done"]:
        try:
            pred = await run_prediction(profile["exam_id"], rank=profile.get("rank"), percentile=profile.get("percentile"), score=profile.get("score"), category=profile.get("category", "General"), home_state=profile.get("home_state"), gender=profile.get("gender"), limit=60)
            counts = {"dream": len(pred["dream"]), "target": len(pred["target"]), "safe": len(pred["safe"]), "total": pred["total"]}
            recommended = (pred["target"][:3] + pred["safe"][:2] + pred["dream"][:1])[:6]
        except ValueError:
            pass
    return {"profile": profile, "readiness": readiness, "checklist": checklist, "prediction_counts": counts, "deadlines": deadlines, "applications": apps[:4], "recommended": recommended, "unread": unread, "saved_count": len(saved)}


class SaveIn(BaseModel):
    college_id: str
    course_id: Optional[str] = None
    bucket: str = "target"


@router.get("/shortlist")
async def shortlist(user=Depends(get_current_user)):
    saved = await db.saved_colleges.find({"user_id": user["user_id"]}, NO_ID).sort("created_at", 1).to_list(100)
    cols = {c["id"]: c for c in await db.colleges.find({"id": {"$in": [s["college_id"] for s in saved]}}, COL_PROJ).to_list(100)}
    crs = {c["id"]: c for c in await db.courses.find({}, {"_id": 0, "id": 1, "name": 1, "slug": 1}).to_list(300)}
    profile = await db.student_profiles.find_one({"user_id": user["user_id"]}, NO_ID) or {}
    probs = {}
    if profile.get("exam_id") and (profile.get("rank") or profile.get("percentile") or profile.get("score")):
        try:
            pred = await run_prediction(profile["exam_id"], rank=profile.get("rank"), percentile=profile.get("percentile"), score=profile.get("score"), category=profile.get("category", "General"), home_state=profile.get("home_state"), gender=profile.get("gender"), limit=500)
            for b in ("dream", "target", "safe"):
                for r in pred[b]:
                    probs[(r["college_id"], r["course_id"])] = r
        except ValueError:
            pass
    for s in saved:
        s["college"] = cols.get(s["college_id"])
        s["course"] = crs.get(s.get("course_id"))
        pr = probs.get((s["college_id"], s.get("course_id")))
        s["probability"] = pr["probability"] if pr else None
        s["predicted_bucket"] = pr["bucket"] if pr else None
    return saved


@router.post("/shortlist")
async def save_college(body: SaveIn, user=Depends(get_current_user)):
    if body.bucket not in ("dream", "target", "safe"):
        raise HTTPException(400, "Invalid bucket")
    existing = await db.saved_colleges.find_one({"user_id": user["user_id"], "college_id": body.college_id, "course_id": body.course_id}, NO_ID)
    if existing:
        await db.saved_colleges.update_one({"id": existing["id"]}, {"$set": {"bucket": body.bucket}})
        return {**existing, "bucket": body.bucket}
    doc = {"id": uid("sv_"), "user_id": user["user_id"], "college_id": body.college_id, "course_id": body.course_id, "bucket": body.bucket, "created_at": now_iso()}
    await db.saved_colleges.insert_one(doc)
    await track("college_saved", user["user_id"], {"college_id": body.college_id})
    doc.pop("_id", None)
    return doc


@router.patch("/shortlist/{item_id}")
async def move_saved(item_id: str, body: dict, user=Depends(get_current_user)):
    await db.saved_colleges.update_one({"id": item_id, "user_id": user["user_id"]}, {"$set": {"bucket": body.get("bucket", "target")}})
    return {"ok": True}


@router.delete("/shortlist/{item_id}")
async def remove_saved(item_id: str, user=Depends(get_current_user)):
    await db.saved_colleges.delete_one({"id": item_id, "user_id": user["user_id"]})
    return {"ok": True}


class AppIn(BaseModel):
    title: str
    college_id: Optional[str] = None
    kind: str = "application"
    status: str = "Not Started"
    deadline: Optional[str] = None
    notes: Optional[str] = ""


@router.get("/applications")
async def list_apps(user=Depends(get_current_user)):
    return await db.applications.find({"user_id": user["user_id"]}, NO_ID).sort("deadline", 1).to_list(200)


@router.post("/applications")
async def add_app(body: AppIn, user=Depends(get_current_user)):
    doc = {"id": uid("app_"), "user_id": user["user_id"], **body.model_dump(), "created_at": now_iso()}
    await db.applications.insert_one(doc)
    await track("application_added", user["user_id"])
    doc.pop("_id", None)
    return doc


@router.patch("/applications/{app_id}")
async def update_app(app_id: str, body: dict, user=Depends(get_current_user)):
    allowed = {k: v for k, v in body.items() if k in ("title", "status", "deadline", "notes", "kind", "college_id")}
    await db.applications.update_one({"id": app_id, "user_id": user["user_id"]}, {"$set": allowed})
    return await db.applications.find_one({"id": app_id}, NO_ID)


@router.delete("/applications/{app_id}")
async def delete_app(app_id: str, user=Depends(get_current_user)):
    await db.applications.delete_one({"id": app_id, "user_id": user["user_id"]})
    return {"ok": True}


DEFAULT_DOCS = ["Aadhaar", "Class 10 certificate", "Class 12 certificate", "Entrance exam scorecard", "Rank card", "Category certificate", "Domicile certificate", "Income certificate", "Passport photos", "Transfer certificate", "Migration certificate"]


@router.get("/documents")
async def list_docs(user=Depends(get_current_user)):
    docs = await db.documents.find({"user_id": user["user_id"]}, NO_ID).to_list(50)
    if not docs:
        profile = await db.student_profiles.find_one({"user_id": user["user_id"]}, NO_ID) or {}
        names = list(DEFAULT_DOCS)
        if profile.get("category") in (None, "General"):
            names.remove("Category certificate")
        if profile.get("exam_id") == "neet":
            names.append("NEET admit card")
        docs = [{"id": uid("doc_"), "user_id": user["user_id"], "name": n, "done": False, "created_at": now_iso()} for n in names]
        await db.documents.insert_many([dict(d) for d in docs])
        docs = [{k: v for k, v in d.items() if k != "_id"} for d in docs]
    return docs


@router.patch("/documents/{doc_id}")
async def toggle_doc(doc_id: str, body: dict, user=Depends(get_current_user)):
    await db.documents.update_one({"id": doc_id, "user_id": user["user_id"]}, {"$set": {"done": bool(body.get("done"))}})
    return {"ok": True}


@router.post("/documents")
async def add_doc(body: dict, user=Depends(get_current_user)):
    doc = {"id": uid("doc_"), "user_id": user["user_id"], "name": body.get("name", "Document"), "done": False, "created_at": now_iso()}
    await db.documents.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/notifications")
async def list_notifs(user=Depends(get_current_user)):
    return await db.notifications.find({"user_id": user["user_id"]}, NO_ID).sort("created_at", -1).to_list(100)


@router.post("/notifications/read-all")
async def read_all(user=Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["user_id"]}, {"$set": {"read": True}})
    return {"ok": True}


@router.post("/notifications/email-digest")
async def email_digest(user=Depends(get_current_user)):
    profile = await db.student_profiles.find_one({"user_id": user["user_id"]}, NO_ID) or {}
    apps = await db.applications.find({"user_id": user["user_id"], "deadline": {"$ne": None}}, NO_ID).sort("deadline", 1).to_list(10)
    dls = await db.deadlines.find({"$or": [{"exam_id": profile.get("exam_id")}, {"exam_id": None}]}, NO_ID).sort("date", 1).limit(6).to_list(6)
    items = [{"title": a["title"], "date": a["deadline"]} for a in apps] + [{"title": d["title"], "date": d["date"]} for d in dls]
    if not items:
        raise HTTPException(400, "No deadlines to send")
    eid = await send_email(to=user["email"], subject="Your upcoming admission deadlines", html=deadline_digest_html(user["name"], items))
    await notify(user["user_id"], "Deadline digest emailed", f"We sent {len(items)} upcoming deadlines to {user['email']}.", "info")
    return {"ok": True, "email_id": eid, "count": len(items)}


@router.post("/compare")
async def compare(body: dict, user=Depends(get_user_optional)):
    slugs = body.get("slugs", [])[:4]
    cols = await db.colleges.find({"slug": {"$in": slugs}}, NO_ID).to_list(4)
    cols.sort(key=lambda c: slugs.index(c["slug"]))
    await track("college_compared", user and user["user_id"], {"slugs": slugs})
    return cols


@router.post("/fees/calculate")
async def fees_calc(body: dict):
    tuition = float(body.get("tuition", 0)); hostel = float(body.get("hostel", 0)); mess = float(body.get("mess", 0)); transport = float(body.get("transport", 0)); books = float(body.get("books", 0)); other = float(body.get("other", 0)); scholarship = float(body.get("scholarship", 0)); years = int(body.get("years", 4)); inflation = float(body.get("inflation", 0.05))
    annual = tuition + hostel + mess + transport + books + other - scholarship
    total = sum(annual * ((1 + inflation) ** y) for y in range(years))
    return {"annual": round(annual), "total": round(total), "years": years, "breakdown": {"tuition": tuition, "hostel": hostel, "mess": mess, "transport": transport, "books": books, "other": other, "scholarship": -scholarship}}


@router.post("/roi/calculate")
async def roi_calc(body: dict):
    total_cost = float(body.get("total_cost", 0)); avg_package = float(body.get("avg_package_lpa", 0)) * 100000; growth = float(body.get("salary_growth", 0.1)); years = int(body.get("years", 4))
    take_home = avg_package * 0.75
    payback_years = round(total_cost / take_home, 1) if take_home else None
    five_year_earn = sum(avg_package * ((1 + growth) ** y) for y in range(5))
    roi_score = round(min(100, (five_year_earn / total_cost) * 10), 0) if total_cost else None
    return {"total_cost": round(total_cost), "avg_package": round(avg_package), "expected_salary_year1": round(take_home), "payback_years": payback_years, "five_year_earnings": round(five_year_earn), "roi_score": roi_score, "disclaimer": "Salary and ROI figures are estimates based on average placement data and assumed growth; actual outcomes vary."}


@router.get("/parent/view")
async def parent_view(user=Depends(get_current_user)):
    saved = await shortlist(user)
    apps = await db.applications.find({"user_id": user["user_id"]}, NO_ID).sort("deadline", 1).to_list(50)
    profile = await db.student_profiles.find_one({"user_id": user["user_id"]}, NO_ID) or {}
    return {"student": {"name": user["name"]}, "shortlist": saved, "applications": apps, "budget": profile.get("budget"), "parent_email": profile.get("parent_email"), "share_ai": profile.get("parent_share_ai", False)}


@router.delete("/account")
async def delete_account(user=Depends(get_current_user)):
    u = user["user_id"]
    for coll in ("student_profiles", "saved_colleges", "applications", "documents", "notifications", "ai_conversations", "ai_messages", "predictions", "user_sessions", "events"):
        await db[coll].delete_many({"user_id": u})
    await db.users.delete_one({"user_id": u})
    return {"ok": True}
