import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

NO_ID = {"_id": 0}


def uid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def track(event: str, user_id: str | None = None, meta: dict | None = None):
    await db.events.insert_one({"id": uid("ev_"), "event": event, "user_id": user_id, "meta": meta or {}, "created_at": now_iso()})


async def notify(user_id: str, title: str, body: str, kind: str = "info", link: str | None = None):
    await db.notifications.insert_one({"id": uid("ntf_"), "user_id": user_id, "title": title, "body": body, "kind": kind, "link": link, "read": False, "created_at": now_iso()})
