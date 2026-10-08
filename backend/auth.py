import os
from datetime import datetime, timezone, timedelta
import bcrypt
import httpx
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel, EmailStr
from core import db, uid, now_iso, NO_ID, track

router = APIRouter(prefix="/auth", tags=["auth"])
SESSION_DAYS = 7


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def check_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


async def create_session(user_id: str, response: Response, token: str | None = None) -> str:
    token = token or uid("sess_") + uid()
    expires = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
    await db.user_sessions.insert_one({"user_id": user_id, "session_token": token, "expires_at": expires.isoformat(), "created_at": now_iso()})
    response.set_cookie("session_token", token, httponly=True, secure=True, samesite="none", path="/", max_age=SESSION_DAYS * 86400)
    return token


async def get_user_optional(request: Request) -> dict | None:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        return None
    sess = await db.user_sessions.find_one({"session_token": token}, NO_ID)
    if not sess:
        return None
    exp = sess["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        return None
    user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0, "password_hash": 0})
    return user


async def get_current_user(request: Request) -> dict:
    user = await get_user_optional(request)
    if not user:
        raise HTTPException(401, "Not authenticated")
    return user


async def require_admin(user=Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return user


class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class SessionIn(BaseModel):
    session_id: str


def public_user(u: dict) -> dict:
    u = dict(u)
    u.pop("password_hash", None)
    u.pop("_id", None)
    return u


@router.post("/register")
async def register(body: RegisterIn, response: Response):
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "An account with this email already exists")
    user = {"user_id": uid("user_"), "email": email, "name": body.name.strip(), "picture": None, "role": "student", "provider": "email", "password_hash": hash_pw(body.password), "onboarded": False, "plan": "free", "created_at": now_iso()}
    await db.users.insert_one(user)
    token = await create_session(user["user_id"], response)
    await track("signup", user["user_id"], {"provider": "email"})
    return {"user": public_user(user), "token": token}


@router.post("/login")
async def login(body: LoginIn, response: Response):
    user = await db.users.find_one({"email": body.email.lower()}, NO_ID)
    if not user or not user.get("password_hash") or not check_pw(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = await create_session(user["user_id"], response)
    await track("login", user["user_id"], {"provider": "email"})
    return {"user": public_user(user), "token": token}


@router.post("/session")
async def google_session(body: SessionIn, response: Response):
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data", headers={"X-Session-ID": body.session_id})
    if r.status_code != 200:
        raise HTTPException(401, "Invalid session")
    data = r.json()
    email = data["email"].lower()
    user = await db.users.find_one({"email": email}, NO_ID)
    if not user:
        user = {"user_id": uid("user_"), "email": email, "name": data.get("name") or email.split("@")[0], "picture": data.get("picture"), "role": "student", "provider": "google", "onboarded": False, "plan": "free", "created_at": now_iso()}
        await db.users.insert_one(user)
        await track("signup", user["user_id"], {"provider": "google"})
    else:
        await db.users.update_one({"email": email}, {"$set": {"picture": data.get("picture") or user.get("picture"), "name": user.get("name") or data.get("name")}})
    token = await create_session(user["user_id"], response, data["session_token"])
    return {"user": public_user(user), "token": token}


@router.get("/me")
async def me(user=Depends(get_current_user)):
    return user


@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"ok": True}


async def seed_admin():
    email = os.environ.get("ADMIN_EMAIL")
    pw = os.environ.get("ADMIN_PASSWORD")
    if not email or not pw:
        return
    if not await db.users.find_one({"email": email}):
        await db.users.insert_one({"user_id": uid("user_"), "email": email, "name": "Platform Admin", "picture": None, "role": "admin", "provider": "email", "password_hash": hash_pw(pw), "onboarded": True, "plan": "premium", "created_at": now_iso()})
