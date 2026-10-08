import json
import time
from collections import defaultdict
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from core import db, NO_ID, uid, now_iso, track
from auth import get_current_user, get_user_optional
from ai_service import build_context, stream_answer, one_shot, extract_slugs

router = APIRouter(prefix="/ai", tags=["ai"])
_rate: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT, RATE_WINDOW = 40, 3600


def check_rate(key: str):
    now = time.time()
    _rate[key] = [t for t in _rate[key] if now - t < RATE_WINDOW]
    if len(_rate[key]) >= RATE_LIMIT:
        raise HTTPException(429, "AI rate limit reached. Please try again in a while.")
    _rate[key].append(now)


class ChatIn(BaseModel):
    message: str
    conversation_id: Optional[str] = None


@router.get("/conversations")
async def conversations(user=Depends(get_current_user)):
    return await db.ai_conversations.find({"user_id": user["user_id"]}, NO_ID).sort("updated_at", -1).to_list(50)


@router.get("/conversations/{conv_id}")
async def conversation(conv_id: str, user=Depends(get_current_user)):
    conv = await db.ai_conversations.find_one({"id": conv_id, "user_id": user["user_id"]}, NO_ID)
    if not conv:
        raise HTTPException(404, "Conversation not found")
    msgs = await db.ai_messages.find({"conversation_id": conv_id}, NO_ID).sort("created_at", 1).to_list(200)
    return {**conv, "messages": msgs}


@router.delete("/conversations/{conv_id}")
async def delete_conv(conv_id: str, user=Depends(get_current_user)):
    await db.ai_conversations.delete_one({"id": conv_id, "user_id": user["user_id"]})
    await db.ai_messages.delete_many({"conversation_id": conv_id})
    return {"ok": True}


@router.post("/chat")
async def chat(body: ChatIn, user=Depends(get_user_optional)):
    text = body.message.strip()
    if not text or len(text) > 2000:
        raise HTTPException(400, "Message must be 1–2000 characters")
    user_id = user["user_id"] if user else None
    check_rate(user_id or "guest")
    conv_id, history = body.conversation_id, []
    if user_id:
        if conv_id:
            conv = await db.ai_conversations.find_one({"id": conv_id, "user_id": user_id}, NO_ID)
            if not conv:
                raise HTTPException(404, "Conversation not found")
            history = await db.ai_messages.find({"conversation_id": conv_id}, NO_ID).sort("created_at", 1).to_list(40)
        else:
            conv_id = uid("conv_")
            await db.ai_conversations.insert_one({"id": conv_id, "user_id": user_id, "title": text[:60], "created_at": now_iso(), "updated_at": now_iso()})
        await db.ai_messages.insert_one({"id": uid("msg_"), "conversation_id": conv_id, "user_id": user_id, "role": "user", "content": text, "created_at": now_iso()})
    await track("ai_question_asked", user_id, {"q": text[:120]})
    context, _ = await build_context(user_id, text)

    async def gen():
        full = ""
        yield f"data: {json.dumps({'type': 'start', 'conversation_id': conv_id})}\n\n"
        try:
            async for chunk in stream_answer(conv_id or uid("guest_"), context, history, text):
                full += chunk
                yield f"data: {json.dumps({'type': 'delta', 'content': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': 'AI counselor is temporarily unavailable. Please try again.', 'detail': str(e)[:200]})}\n\n"
            return
        slugs = extract_slugs(full)
        cards = await db.colleges.find({"slug": {"$in": slugs}}, {"_id": 0, "slug": 1, "name": 1, "short_name": 1, "city": 1, "state": 1, "type": 1, "nirf_rank": 1, "fee_annual": 1, "avg_package": 1, "logo": 1, "id": 1}).to_list(10) if slugs else []
        if user_id:
            await db.ai_messages.insert_one({"id": uid("msg_"), "conversation_id": conv_id, "user_id": user_id, "role": "assistant", "content": full, "cards": cards, "created_at": now_iso()})
            await db.ai_conversations.update_one({"id": conv_id}, {"$set": {"updated_at": now_iso()}})
        yield f"data: {json.dumps({'type': 'done', 'cards': cards, 'conversation_id': conv_id})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/compare-summary")
async def compare_summary(body: dict, user=Depends(get_user_optional)):
    slugs = body.get("slugs", [])[:4]
    if len(slugs) < 2:
        raise HTTPException(400, "Select at least 2 colleges")
    user_id = user["user_id"] if user else None
    check_rate(user_id or "guest")
    context, _ = await build_context(user_id, " ".join(s.replace("-", " ") for s in slugs))
    prompt = f"Compare these colleges for me: {', '.join(slugs)}. Give a short verdict starting with 'Based on your priorities, ... appears to be the strongest option because...' then a 4-bullet comparison (placements, fees/ROI, admission probability, campus/location). Use [[college:slug]] tags."
    try:
        text = await one_shot(uid("cmp_"), context, prompt)
    except Exception as e:
        raise HTTPException(503, f"AI unavailable: {str(e)[:120]}")
    return {"summary": text}


@router.post("/help-me-choose")
async def help_me_choose(body: dict, user=Depends(get_current_user)):
    slugs = body.get("slugs", [])[:6]
    if len(slugs) < 2:
        raise HTTPException(400, "Select at least 2 colleges")
    check_rate(user["user_id"])
    context, _ = await build_context(user["user_id"], " ".join(s.replace("-", " ") for s in slugs) + " fees scholarship")
    prompt = f"DECISION MODE. The student is choosing between: {', '.join(slugs)} (course preference and goals in profile). Evaluate admission probability, fees, placements, course quality, location, ROI and career goals. Respond in markdown with exactly these headings: ### Best fit, ### Best ROI, ### Safest option, ### Best placement, ### Best overall — each with the college name + [[college:slug]] tag and 1–2 sentence reasoning. Finish with a note that there is no single objectively correct choice."
    try:
        text = await one_shot(uid("dec_"), context, prompt)
    except Exception as e:
        raise HTTPException(503, f"AI unavailable: {str(e)[:120]}")
    await track("ai_decision_mode", user["user_id"], {"slugs": slugs})
    return {"analysis": text}


@router.post("/review-shortlist")
async def review_shortlist(user=Depends(get_current_user)):
    check_rate(user["user_id"])
    context, _ = await build_context(user["user_id"], "review my shortlist fees scholarship")
    prompt = "Review my saved shortlist (SAVED SHORTLIST + PREDICTION DATA). Identify: too risky picks, too many expensive colleges vs budget, missing safe options, duplicate/overlapping choices, and 2–3 better alternatives with [[college:slug]] tags. Use short headed sections and finish with a concrete next step."
    try:
        text = await one_shot(uid("rev_"), context, prompt)
    except Exception as e:
        raise HTTPException(503, f"AI unavailable: {str(e)[:120]}")
    return {"review": text}


@router.post("/cutoff-insight")
async def cutoff_insight(body: dict, user=Depends(get_user_optional)):
    series = body.get("series", [])
    if not series:
        raise HTTPException(400, "No data")
    check_rate((user and user["user_id"]) or "guest")
    prompt = f"Explain this cutoff trend in 2–3 sentences for a student (metric: {body.get('metric')}, exam {body.get('exam')}, college {body.get('college')}, course {body.get('course')}, category {body.get('category')}). Data: {json.dumps(series)}. Student value: {body.get('student_value')}. Say whether it became more or less competitive and what it means for the student. Estimates only."
    try:
        text = await one_shot(uid("cut_"), "Cutoff explorer context only.", prompt)
    except Exception as e:
        raise HTTPException(503, f"AI unavailable: {str(e)[:120]}")
    return {"insight": text}
