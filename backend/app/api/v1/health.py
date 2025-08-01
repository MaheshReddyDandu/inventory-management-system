from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import time
import psutil
from app.core.database import get_db, redis_client
from app.utils.metrics import metrics_collector

router = APIRouter()

@router.get("/")
async def basic_health_check():
    return {"status": "healthy", "timestamp": time.time()}

@router.get("/detailed")
async def detailed_health_check(db: Session = Depends(get_db)):
    # Database health check
    try:
        db.execute("SELECT 1")
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"
    
    # Redis health check
    try:
        redis_client.ping()
        redis_status = "healthy"
    except Exception:
        redis_status = "unhealthy"
    
    # System metrics
    system_metrics = {
        "cpu_percent": psutil.cpu_percent(),
        "memory_percent": psutil.virtual_memory().percent,
        "disk_percent": psutil.disk_usage('/').percent
    }
    
    # Application metrics
    app_metrics = metrics_collector.get_metrics()
    
    return {
        "status": "healthy" if db_status == "healthy" and redis_status == "healthy" else "degraded",
        "timestamp": time.time(),
        "services": {
            "database": db_status,
            "redis": redis_status
        },
        "system": system_metrics,
        "application": app_metrics
    } 