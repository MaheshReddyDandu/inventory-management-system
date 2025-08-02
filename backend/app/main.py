from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
from app.api.v1 import auth, health
from app.api.v1 import organization as org_api
from app.core.database import engine
from app.models import user, organization
from app.models.user import User, Role, RefreshToken, PasswordReset
from app.models.organization import (
    OrganizationalUnit, UserAssignment, OrganizationalUnitMetadata,
    OfficeLocation, AttendanceRule, Attendance
)
from app.utils.performance import create_performance_indexes, setup_database_maintenance
from app.utils.metrics import metrics_collector

# Create database tables
user.Base.metadata.create_all(bind=engine)
organization.Base.metadata.create_all(bind=engine)

# Setup performance optimizations
try:
    create_performance_indexes()
    setup_database_maintenance()
except Exception as e:
    print(f"Warning: Could not setup performance optimizations: {e}")

app = FastAPI(
    title="FastAPI Authentication System",
    description="A high-performance, production-ready authentication system",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(org_api.router, prefix="/api/v1/organization", tags=["organization"])

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        
        # Record metrics
        metrics_collector.record_request(process_time, response.status_code < 400)
        
        return response
    except Exception as e:
        process_time = time.time() - start_time
        metrics_collector.record_request(process_time, False)
        raise e

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": time.time()}

@app.get("/")
async def root():
    return {
        "message": "FastAPI Authentication System",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    } 