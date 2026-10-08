import os
import re
import json
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
from core import db, NO_ID
from predictor import run_prediction

LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
MODEL = ("openai", "gpt-6-luna")

SYSTEM = """You are the CollegePredict AI Counselor — a warm, precise admission & career advisor for Indian students.
Rules:
- Personalize every answer using the STUDENT PROFILE and PREDICTION DATA provided. Never give generic answers when profile data exists.
- Only state cutoffs, fees, placements and deadlines that appear in the VERIFIED DATA block. If data is missing, say so plainly instead of inventing numbers.
- Clearly separate "Verified data" from "AI recommendation / estimate". Never guarantee admission; use phrases like "based on historical trends, your estimated admission probability is…".
- Be concise: short paragraphs, bullet lists, markdown tables where helpful. Bold key numbers.
- When you recommend or mention a specific college from the data, append its tag exactly like [[college:slug]] right after the name so the app can render a card. Use at most 5 tags per reply.
- End with a short "Next step" line and the line "Data last updated: {data_date}. Estimates only — not a guarantee of admission."
"""


def fmt_money(v):
    if v is None:
        return "n/a"
    return f"₹{v/100000:.1f}L" if v >= 100000 else f"₹{v:,}"


async def build_context(user_id: str | None, query: str) -> tuple[str, list]:
    parts, slugs = [], []
    profile = await db.student_profiles.find_one({"user_id": user_id}, NO_ID) if user_id else None
    if profile:
        parts.append("STUDENT PROFILE:\n" + json.dumps({k: v for k, v in profile.items() if k not in ("user_id", "updated_at", "demo")}, ensure_ascii=False))
        saved = await db.saved_colleges.find({"user_id": user_id}, NO_ID).to_list(50)
        if saved:
            parts.append("SAVED SHORTLIST: " + ", ".join(f"{s['college_id']} ({s['course_id']}, {s['bucket']})" for s in saved))
        apps = await db.applications.find({"user_id": user_id}, NO_ID).to_list(50)
        if apps:
            parts.append("TRACKED APPLICATIONS: " + "; ".join(f"{a['title']} — {a['status']} (due {a.get('deadline')})" for a in apps))
        if profile.get("exam_id") and (profile.get("rank") or profile.get("percentile") or profile.get("score")):
            try:
                pred = await run_prediction(profile["exam_id"], rank=profile.get("rank"), percentile=profile.get("percentile"), score=profile.get("score"), category=profile.get("category", "General"), home_state=profile.get("home_state"), gender=profile.get("gender"), limit=40)
                lines = []
                for b in ("safe", "target", "dream"):
                    for r in pred[b][:6]:
                        lines.append(f"- {r['college_name']} [{r['college_slug']}] {r['course_name']}: {b.upper()} {r['probability']}% | {r['latest_year']} closing {r['latest_cutoff']} | fee {fmt_money(r['fee_annual'])}/yr | avg pkg ₹{r['avg_package']}L")
                parts.append(f"PREDICTION DATA (input {pred['input']}, total matches {pred['total']}):\n" + "\n".join(lines))
            except Exception as e:
                parts.append(f"PREDICTION DATA unavailable: {e}")
    q = query.lower()
    colleges = await db.colleges.find({}, {"_id": 0, "reviews": 0, "faqs": 0, "facilities": 0, "recruiters": 0}).to_list(500)
    matched = [c for c in colleges if c["short_name"].lower() in q or c["name"].lower() in q or c["slug"].replace("-", " ") in q]
    for c in matched[:4]:
        slugs.append(c["slug"])
        cuts = await db.cutoffs.find({"college_id": c["id"], "round": {"$gte": 5}, "year": 2025, "category": "General", "gender": "all", "quota": "AI"}, NO_ID).to_list(50)
        parts.append(f"VERIFIED COLLEGE DATA — {c['name']} [{c['slug']}]: {c['type']}, {c['city']} {c['state']}, NIRF #{c['nirf_rank']}, fee {fmt_money(c['fee_annual'])}/yr, hostel {fmt_money(c['hostel_fee'])}, avg pkg ₹{c['avg_package']}L, highest ₹{c['highest_package']}L, placement {c['placement_rate']}%. 2025 General closing cutoffs: " + "; ".join(f"{x['course_id']}={x['closing']} ({x['exam_id']})" for x in cuts))
    kb = await db.knowledge.find({}, NO_ID).to_list(100)
    hits = [k for k in kb if any(w in q for w in k["title"].lower().split() if len(w) > 4)]
    for k in hits[:3]:
        parts.append(f"KNOWLEDGE — {k['title']}: {k['content']}")
    if any(w in q for w in ("scholarship", "afford", "cost", "income", "fee")):
        sch = await db.scholarships.find({}, NO_ID).to_list(20)
        parts.append("SCHOLARSHIPS: " + "; ".join(f"{s['name']} ({fmt_money(s['amount'])}, {s['eligibility']}, deadline {s['deadline']})" for s in sch[:8]))
    if any(w in q for w in ("deadline", "date", "counsel", "when")):
        dls = await db.deadlines.find({}, NO_ID).to_list(30)
        parts.append("DEADLINES: " + "; ".join(f"{d['title']} — {d['date']}" for d in dls))
    return "\n\n".join(parts) or "No profile data available (guest user). Ask for exam, score and category before predicting.", slugs


def make_chat(session_id: str, context: str, history: list[dict]) -> LlmChat:
    sys = SYSTEM.replace("{data_date}", "2025") + "\n\n=== VERIFIED DATA ===\n" + context
    if history:
        sys += "\n\n=== RECENT CONVERSATION ===\n" + "\n".join(f"{m['role'].upper()}: {m['content'][:800]}" for m in history[-8:])
    return LlmChat(api_key=LLM_KEY, session_id=session_id, system_message=sys).with_model(*MODEL)


async def stream_answer(session_id: str, context: str, history: list[dict], text: str):
    chat = make_chat(session_id, context, history)
    async for ev in chat.stream_message(UserMessage(text=text)):
        if isinstance(ev, TextDelta):
            yield ev.content
        elif isinstance(ev, StreamDone):
            break


async def one_shot(session_id: str, context: str, prompt: str) -> str:
    chat = make_chat(session_id, context, [])
    return await chat.send_message(UserMessage(text=prompt))


def extract_slugs(text: str) -> list[str]:
    seen = []
    for s in re.findall(r"\[\[college:([a-z0-9-]+)\]\]", text):
        if s not in seen:
            seen.append(s)
    return seen
