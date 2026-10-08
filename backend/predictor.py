import math
from collections import defaultdict
from core import db, NO_ID

CATEGORY_FALLBACK = {"OBC": "OBC-NCL", "OBC-NCL": "OBC-NCL", "General": "General", "EWS": "EWS", "SC": "SC", "ST": "ST", "PwD": "General"}


def percentile_to_rank(pct: float, total: int) -> int:
    return max(1, int(round((100 - pct) / 100 * total)))


def rank_to_percentile(rank: int, total: int) -> float:
    return round(max(0.0, min(99.99, (1 - rank / total) * 100)), 2)


def resolve_input(exam: dict, rank=None, percentile=None, score=None) -> dict:
    metric = exam.get("metric_type", "rank")
    total = exam.get("total_candidates", 1000000)
    out = {"metric": "score" if metric == "score" else "rank", "rank": rank, "percentile": percentile, "score": score}
    if out["metric"] == "rank":
        if rank is None and percentile is not None:
            out["rank"] = percentile_to_rank(float(percentile), total)
        elif rank is not None and percentile is None:
            out["percentile"] = rank_to_percentile(int(rank), total)
        if out["rank"] is None:
            raise ValueError("Please enter your rank or percentile")
    else:
        if score is None:
            raise ValueError("Please enter your score / marks")
    return out


def classify(p: float) -> str:
    if p >= 0.70:
        return "safe"
    if p >= 0.35:
        return "target"
    return "dream"


def probability(metric: str, value: float, expected: float) -> float:
    if expected <= 0:
        return 0.0
    if metric == "rank":
        margin = (expected - value) / expected
        x = max(-30.0, min(30.0, margin * 5))
    else:
        margin = (value - expected) / expected
        x = max(-30.0, min(30.0, margin * 40))
    p = 1 / (1 + math.exp(-x))
    return round(min(0.98, max(0.02, p)), 3)


def expected_from_history(years: dict, metric: str) -> tuple[float, float, float, str]:
    ys = sorted(years)
    latest = years[ys[-1]]
    if len(ys) >= 2:
        ratios = [years[ys[i]] / years[ys[i - 1]] for i in range(1, len(ys)) if years[ys[i - 1]]]
        trend = sum(ratios) / len(ratios) if ratios else 1.0
        trend = max(0.85, min(1.15, trend))
    else:
        trend = 1.0
    expected = latest * trend
    spread = 0.08 if metric == "rank" else 0.025
    conf = "High" if len(ys) >= 3 else "Medium" if len(ys) == 2 else "Low"
    return expected, expected * (1 - spread), expected * (1 + spread), conf


async def run_prediction(exam_id: str, *, rank=None, percentile=None, score=None, category="General", home_state=None, gender=None, prefs=None, limit=120) -> dict:
    prefs = prefs or {}
    exam = await db.exams.find_one({"id": exam_id}, NO_ID)
    if not exam:
        raise ValueError("Exam not found")
    inp = resolve_input(exam, rank, percentile, score)
    cat = CATEGORY_FALLBACK.get(category, "General")
    value = inp["rank"] if inp["metric"] == "rank" else float(inp["score"])

    cutoffs = await db.cutoffs.find({"exam_id": exam_id, "category": {"$in": [cat, "General"]}}, NO_ID).to_list(20000)
    if not cutoffs:
        return {"exam": exam, "input": inp, "total": 0, "dream": [], "target": [], "safe": [], "message": "No cutoff data available for this exam yet."}

    colleges = {c["id"]: c for c in await db.colleges.find({}, NO_ID).to_list(500)}
    courses = {c["id"]: c for c in await db.courses.find({}, NO_ID).to_list(500)}

    groups = defaultdict(dict)
    for c in cutoffs:
        col = colleges.get(c["college_id"])
        if not col:
            continue
        quota = c.get("quota", "AI")
        if quota == "HS" and home_state and col.get("state") != home_state:
            continue
        g = c.get("gender", "all")
        if g == "female" and gender != "Female":
            continue
        key = (c["college_id"], c["course_id"])
        pref = 2 if c["category"] == cat else 1
        slot = groups[key].setdefault((pref, quota, g), {})
        yr = slot.setdefault(c["year"], {"round": -1, "closing": None})
        if c.get("round", 1) >= yr["round"]:
            yr["round"] = c.get("round", 1)
            yr["closing"] = c["closing"]

    results = []
    for (college_id, course_id), slots in groups.items():
        col, course = colleges[college_id], courses.get(course_id)
        if not course:
            continue
        best = None
        for (pref, quota, g), years in slots.items():
            hist = {y: v["closing"] for y, v in years.items() if v["closing"] is not None}
            if not hist:
                continue
            exp, lo, hi, conf = expected_from_history(hist, inp["metric"])
            p = probability(inp["metric"], value, exp)
            cand = {"p": p, "exp": exp, "lo": lo, "hi": hi, "conf": conf, "hist": hist, "quota": quota, "gender": g, "pref": pref}
            if best is None or (cand["pref"], cand["p"]) > (best["pref"], best["p"]):
                best = cand
        if not best or best["p"] < 0.06:
            continue
        cc = next((x for x in col.get("courses", []) if x["course_id"] == course_id), {})
        fee = cc.get("fee_annual", col.get("fee_annual", 0))
        if prefs.get("budget") and fee > prefs["budget"]:
            continue
        if prefs.get("college_type") and prefs["college_type"] not in ("Any", col.get("type")):
            continue
        if prefs.get("state") and prefs["state"] not in ("Any", col.get("state")):
            continue
        if prefs.get("course_keywords"):
            kws = [k.lower() for k in prefs["course_keywords"]]
            if not any(k in course["name"].lower() or k in course.get("stream", "").lower() for k in kws):
                continue
        latest_year = max(best["hist"])
        unit = "AIR" if inp["metric"] == "rank" else "marks"
        cutoff_label = f"{unit} {int(best['hist'][latest_year]):,}" if inp["metric"] == "rank" else f"{int(best['hist'][latest_year])} {unit}"
        bucket = classify(best["p"])
        reason = {
            "safe": f"Your {unit if unit=='AIR' else 'score'} is comfortably {'better than' if inp['metric']=='rank' else 'above'} the {latest_year} closing cutoff ({cutoff_label}).",
            "target": f"Your {unit if unit=='AIR' else 'score'} is within the historical cutoff range for this course ({latest_year} closing: {cutoff_label}).",
            "dream": f"The {latest_year} closing cutoff ({cutoff_label}) is more competitive than your current standing; possible in later rounds or with category/quota benefits.",
        }[bucket]
        results.append({
            "college_id": college_id, "college_slug": col["slug"], "college_name": col["name"], "college_short": col.get("short_name"), "college_type": col.get("type"), "city": col.get("city"), "state": col.get("state"), "nirf_rank": col.get("nirf_rank"), "logo": col.get("logo"),
            "course_id": course_id, "course_name": course["name"], "course_slug": course["slug"], "degree": course.get("degree"),
            "probability": int(round(best["p"] * 100)), "bucket": bucket, "confidence": best["conf"], "quota": best["quota"], "category_used": cat if best["pref"] == 2 else "General",
            "historical_cutoff": {str(k): int(v) for k, v in sorted(best["hist"].items())}, "latest_cutoff": int(best["hist"][latest_year]), "latest_year": latest_year,
            "expected_cutoff_range": [int(best["lo"]), int(best["hi"])], "metric": inp["metric"],
            "fee_annual": fee, "hostel_fee": col.get("hostel_fee"), "avg_package": col.get("avg_package"), "highest_package": col.get("highest_package"), "placement_rate": col.get("placement_rate"), "reason": reason,
        })

    results.sort(key=lambda r: (-r["probability"], r.get("nirf_rank") or 999))
    if prefs.get("placement_priority"):
        results.sort(key=lambda r: (-(r.get("avg_package") or 0)))
    out = {"exam": {k: exam[k] for k in ("id", "slug", "name", "short_name", "metric_type")}, "input": inp, "category": cat, "total": len(results), "dream": [], "target": [], "safe": [], "disclaimer": "Predictions are estimates based on historical cutoff trends and do not guarantee admission.", "data_updated": exam.get("data_updated", "2025")}
    for r in results[:limit]:
        out[r["bucket"]].append(r)
    out["dream"].sort(key=lambda r: -r["probability"])
    return out
