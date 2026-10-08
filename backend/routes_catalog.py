from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from core import db, NO_ID, track
from auth import get_user_optional

router = APIRouter(tags=["catalog"])
COLLEGE_LIST_PROJ = {"_id": 0, "reviews": 0, "faqs": 0, "about": 0, "admission_process": 0, "facilities": 0, "recruiters": 0}


@router.get("/stats")
async def stats():
    colleges, courses, exams, cutoffs = await db.colleges.count_documents({}), await db.courses.count_documents({}), await db.exams.count_documents({}), await db.cutoffs.count_documents({})
    students = await db.users.count_documents({"role": "student"})
    return {"colleges": colleges, "courses": courses, "exams": exams, "cutoffs": cutoffs, "students_helped": 12400 + students, "demo": True}


@router.get("/exams")
async def list_exams():
    return await db.exams.find({}, NO_ID).sort("name", 1).to_list(100)


@router.get("/exams/{slug}")
async def get_exam(slug: str):
    exam = await db.exams.find_one({"slug": slug}, NO_ID)
    if not exam:
        raise HTTPException(404, "Exam not found")
    colleges = await db.colleges.find({"exams": exam["id"]}, COLLEGE_LIST_PROJ).sort("nirf_rank", 1).to_list(100)
    courses = await db.courses.find({"exams": exam["id"]}, NO_ID).to_list(100)
    return {**exam, "colleges": colleges, "courses": courses}


@router.get("/colleges")
async def list_colleges(q: Optional[str] = None, state: Optional[str] = None, city: Optional[str] = None, type: Optional[str] = None, exam: Optional[str] = None, course: Optional[str] = None, max_fee: Optional[int] = None, min_package: Optional[float] = None, hostel: Optional[bool] = None, sort: str = "ranking", page: int = 1, limit: int = Query(12, le=50), user=Depends(get_user_optional)):
    f = {}
    if q:
        f["$or"] = [{"name": {"$regex": q, "$options": "i"}}, {"short_name": {"$regex": q, "$options": "i"}}, {"city": {"$regex": q, "$options": "i"}}]
    if state and state != "Any":
        f["state"] = state
    if city:
        f["city"] = {"$regex": city, "$options": "i"}
    if type and type != "Any":
        f["type"] = type
    if exam:
        f["exams"] = exam
    if course:
        f["courses.course_id"] = course
    if max_fee:
        f["fee_annual"] = {"$lte": max_fee}
    if min_package:
        f["avg_package"] = {"$gte": min_package}
    if hostel:
        f["hostel.available"] = True
    sort_map = {"ranking": [("nirf_rank", 1)], "fees": [("fee_annual", 1)], "fees_desc": [("fee_annual", -1)], "placement": [("avg_package", -1)], "name": [("name", 1)], "best_match": [("nirf_rank", 1)]}
    total = await db.colleges.count_documents(f)
    items = await db.colleges.find(f, COLLEGE_LIST_PROJ).sort(sort_map.get(sort, sort_map["ranking"])).skip((page - 1) * limit).limit(limit).to_list(limit)
    if q:
        await track("college_search", user and user["user_id"], {"q": q})
    return {"items": items, "total": total, "page": page, "pages": max(1, -(-total // limit))}


@router.get("/colleges/filters")
async def college_filters():
    states = sorted(await db.colleges.distinct("state"))
    types = sorted(await db.colleges.distinct("type"))
    return {"states": states, "types": types}


@router.get("/colleges/by-slugs")
async def by_slugs(slugs: str):
    arr = [s for s in slugs.split(",") if s]
    return await db.colleges.find({"slug": {"$in": arr}}, COLLEGE_LIST_PROJ).to_list(20)


@router.get("/colleges/{slug}")
async def get_college(slug: str, user=Depends(get_user_optional)):
    col = await db.colleges.find_one({"slug": slug}, NO_ID)
    if not col:
        raise HTTPException(404, "College not found")
    course_ids = [c["course_id"] for c in col.get("courses", [])]
    courses = {c["id"]: c for c in await db.courses.find({"id": {"$in": course_ids}}, NO_ID).to_list(100)}
    for c in col["courses"]:
        c["course"] = courses.get(c["course_id"])
    cutoffs = await db.cutoffs.find({"college_id": col["id"], "gender": "all", "quota": "AI", "round": {"$gte": 5}}, NO_ID).to_list(2000)
    similar = await db.colleges.find({"slug": {"$ne": slug}, "$or": [{"state": col["state"]}, {"exams": {"$in": col["exams"]}}]}, COLLEGE_LIST_PROJ).sort("nirf_rank", 1).limit(4).to_list(4)
    await track("college_viewed", user and user["user_id"], {"slug": slug})
    await db.colleges.update_one({"slug": slug}, {"$inc": {"views": 1}})
    return {**col, "cutoffs": cutoffs, "similar": similar}


@router.get("/courses")
async def list_courses(stream: Optional[str] = None, q: Optional[str] = None):
    f = {}
    if stream and stream != "All":
        f["stream"] = stream
    if q:
        f["name"] = {"$regex": q, "$options": "i"}
    return await db.courses.find(f, NO_ID).sort("name", 1).to_list(200)


@router.get("/courses/{slug}")
async def get_course(slug: str, user=Depends(get_user_optional)):
    course = await db.courses.find_one({"slug": slug}, NO_ID)
    if not course:
        raise HTTPException(404, "Course not found")
    colleges = await db.colleges.find({"courses.course_id": course["id"]}, COLLEGE_LIST_PROJ).sort("nirf_rank", 1).limit(12).to_list(12)
    exams = await db.exams.find({"id": {"$in": course.get("exams", [])}}, NO_ID).to_list(20)
    await track("course_viewed", user and user["user_id"], {"slug": slug})
    return {**course, "top_colleges": colleges, "exam_details": exams}


@router.get("/cutoffs")
async def list_cutoffs(exam: Optional[str] = None, college: Optional[str] = None, course: Optional[str] = None, category: str = "General", year: Optional[int] = None, round: Optional[int] = None, quota: str = "AI", limit: int = Query(300, le=1000)):
    f = {"category": category, "gender": "all", "quota": quota}
    if exam:
        f["exam_id"] = exam
    if college:
        f["college_id"] = college
    if course:
        f["course_id"] = course
    if year:
        f["year"] = year
    if round:
        f["round"] = round
    items = await db.cutoffs.find(f, NO_ID).sort([("year", 1), ("round", 1)]).to_list(limit)
    cols = {c["id"]: c for c in await db.colleges.find({}, {"_id": 0, "id": 1, "short_name": 1, "name": 1, "slug": 1}).to_list(500)}
    crs = {c["id"]: c["name"] for c in await db.courses.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(500)}
    for i in items:
        c = cols.get(i["college_id"], {})
        i["college_name"], i["college_slug"], i["course_name"] = c.get("short_name"), c.get("slug"), crs.get(i["course_id"])
    return items


@router.get("/scholarships")
async def list_scholarships(category: Optional[str] = None, gender: Optional[str] = None, max_income: Optional[int] = None, q: Optional[str] = None):
    f = {}
    if category and category != "Any":
        f["categories"] = {"$in": [category, "OBC-NCL" if category == "OBC" else category]}
    if gender and gender != "Any":
        f["gender"] = {"$in": ["All", gender]}
    if max_income:
        f["$or"] = [{"max_income": None}, {"max_income": {"$gte": max_income}}]
    if q:
        f["name"] = {"$regex": q, "$options": "i"}
    return await db.scholarships.find(f, NO_ID).sort("deadline", 1).to_list(200)


@router.get("/deadlines")
async def list_deadlines(exam: Optional[str] = None):
    f = {}
    if exam:
        f["$or"] = [{"exam_id": exam}, {"exam_id": None}]
    return await db.deadlines.find(f, NO_ID).sort("date", 1).to_list(100)


@router.get("/search")
async def global_search(q: str, limit: int = 6):
    rx = {"$regex": q, "$options": "i"}
    colleges = await db.colleges.find({"$or": [{"name": rx}, {"short_name": rx}, {"city": rx}]}, {"_id": 0, "name": 1, "slug": 1, "city": 1, "short_name": 1}).limit(limit).to_list(limit)
    courses = await db.courses.find({"name": rx}, {"_id": 0, "name": 1, "slug": 1, "stream": 1}).limit(limit).to_list(limit)
    exams = await db.exams.find({"$or": [{"name": rx}, {"short_name": rx}]}, {"_id": 0, "name": 1, "slug": 1}).limit(limit).to_list(limit)
    schol = await db.scholarships.find({"name": rx}, {"_id": 0, "name": 1, "id": 1}).limit(limit).to_list(limit)
    return {"colleges": colleges, "courses": courses, "exams": exams, "scholarships": schol}
