import csv
import io
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from core import db, NO_ID, uid, now_iso
from auth import require_admin

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])
COLLECTIONS = {"colleges", "courses", "exams", "cutoffs", "scholarships", "deadlines", "knowledge"}


def _check(name: str):
    if name not in COLLECTIONS:
        raise HTTPException(404, "Unknown collection")


@router.get("/kpis")
async def kpis():
    async def count(coll, f=None):
        return await db[coll].count_documents(f or {})
    return {
        "students": await count("users", {"role": "student"}), "active_users": len(await db.events.distinct("user_id", {"user_id": {"$ne": None}})),
        "predictions": await count("predictions"), "ai_conversations": await count("ai_conversations"), "college_searches": await count("events", {"event": "college_search"}), "applications_tracked": await count("applications"),
        "colleges": await count("colleges"), "cutoffs": await count("cutoffs"), "scholarships": await count("scholarships"),
    }


@router.get("/analytics")
async def analytics():
    async def top(event, key, n=6):
        pipe = [{"$match": {"event": event}}, {"$group": {"_id": f"$meta.{key}", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}, {"$limit": n}]
        return [{"label": r["_id"], "count": r["count"]} async for r in db.events.aggregate(pipe) if r["_id"]]
    events = [{"event": r["_id"], "count": r["count"]} async for r in db.events.aggregate([{"$group": {"_id": "$event", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}])]
    funnel_keys = ["signup", "onboarding_completed", "prediction_completed", "college_saved", "application_added"]
    ev_map = {e["event"]: e["count"] for e in events}
    return {"top_colleges": await top("college_viewed", "slug"), "top_courses": await top("course_viewed", "slug"), "top_exams": await top("prediction_completed", "exam"), "recent_questions": [{"label": r["meta"].get("q"), "count": 1} for r in await db.events.find({"event": "ai_question_asked"}, NO_ID).sort("created_at", -1).limit(8).to_list(8)], "events": events, "funnel": [{"step": k, "count": ev_map.get(k, 0)} for k in funnel_keys]}


@router.get("/students")
async def students():
    users = await db.users.find({"role": "student"}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    profiles = {p["user_id"]: p for p in await db.student_profiles.find({}, NO_ID).to_list(1000)}
    for u in users:
        u["profile"] = profiles.get(u["user_id"])
    return users


@router.delete("/students/{user_id}")
async def delete_student(user_id: str):
    for coll in ("student_profiles", "saved_colleges", "applications", "documents", "notifications", "ai_conversations", "ai_messages", "predictions", "user_sessions"):
        await db[coll].delete_many({"user_id": user_id})
    await db.users.delete_one({"user_id": user_id, "role": "student"})
    return {"ok": True}


@router.get("/{coll}")
async def list_items(coll: str, limit: int = 500, skip: int = 0):
    _check(coll)
    total = await db[coll].count_documents({})
    return {"items": await db[coll].find({}, NO_ID).skip(skip).limit(limit).to_list(limit), "total": total}


@router.post("/{coll}")
async def create_item(coll: str, body: dict):
    _check(coll)
    body.pop("_id", None)
    body.setdefault("id", body.get("slug") or uid())
    body["updated_at"] = now_iso()
    body.pop("demo", None)
    await db[coll].insert_one(dict(body))
    body.pop("_id", None)
    return body


@router.put("/{coll}/{item_id}")
async def update_item(coll: str, item_id: str, body: dict):
    _check(coll)
    body.pop("_id", None)
    body["updated_at"] = now_iso()
    r = await db[coll].update_one({"id": item_id}, {"$set": body})
    if not r.matched_count:
        raise HTTPException(404, "Not found")
    return await db[coll].find_one({"id": item_id}, NO_ID)


@router.delete("/{coll}/{item_id}")
async def delete_item(coll: str, item_id: str):
    _check(coll)
    await db[coll].delete_one({"id": item_id})
    return {"ok": True}


@router.post("/cutoffs/import")
async def import_cutoffs(file: UploadFile = File(...), replace: bool = False):
    content = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    required = {"exam_id", "college_id", "course_id", "category", "year", "closing"}
    if not reader.fieldnames or not required.issubset({f.strip() for f in reader.fieldnames}):
        raise HTTPException(400, f"CSV must include columns: {', '.join(sorted(required))} (optional: opening, round, quota, gender, metric)")
    exams = {e["id"]: e for e in await db.exams.find({}, NO_ID).to_list(100)}
    docs, errors = [], []
    for i, row in enumerate(reader, start=2):
        row = {k.strip(): (v or "").strip() for k, v in row.items() if k}
        try:
            ex = exams.get(row["exam_id"])
            if not ex:
                raise ValueError(f"unknown exam_id {row['exam_id']}")
            docs.append({"id": uid("cut_"), "exam_id": row["exam_id"], "college_id": row["college_id"], "course_id": row["course_id"], "category": row["category"], "gender": row.get("gender") or "all", "quota": row.get("quota") or "AI", "year": int(row["year"]), "round": int(row.get("round") or 1), "opening": float(row["opening"]) if row.get("opening") else None, "closing": float(row["closing"]), "metric": row.get("metric") or ("score" if ex["metric_type"] == "score" else "rank"), "demo": False, "imported_at": now_iso()})
        except Exception as e:
            errors.append(f"Row {i}: {e}")
    if replace and docs:
        await db.cutoffs.delete_many({})
    if docs:
        await db.cutoffs.insert_many(docs)
    return {"imported": len(docs), "errors": errors[:20], "error_count": len(errors)}
