import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
from core import client
from auth import router as auth_router, seed_admin
from seed import seed
from routes_catalog import router as catalog_router
from routes_student import router as student_router
from routes_ai import router as ai_router
from routes_admin import router as admin_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed()
    await seed_admin()
    yield
    client.close()


app = FastAPI(title="CollegePredict AI API", lifespan=lifespan)
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"name": "CollegePredict AI", "status": "ok"}


api.include_router(auth_router)
api.include_router(catalog_router)
api.include_router(student_router)
api.include_router(ai_router)
api.include_router(admin_router)
app.include_router(api)

app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","), allow_methods=["*"], allow_headers=["*"])
