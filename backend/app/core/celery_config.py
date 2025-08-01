from celery.schedules import crontab
from app.core.tasks import celery_app

# Celery Beat Schedule
celery_app.conf.beat_schedule = {
    'cleanup-expired-tokens': {
        'task': 'app.core.tasks.cleanup_expired_tokens',
        'schedule': crontab(hour=2, minute=0),  # Run daily at 2 AM
    },
    'database-maintenance': {
        'task': 'app.core.tasks.run_database_maintenance',
        'schedule': crontab(hour=3, minute=0),  # Run daily at 3 AM
    },
}

# Task routing
celery_app.conf.task_routes = {
    'app.core.tasks.send_verification_email': {'queue': 'email'},
    'app.core.tasks.send_password_reset_email': {'queue': 'email'},
    'app.core.tasks.cleanup_expired_tokens': {'queue': 'maintenance'},
    'app.core.tasks.run_database_maintenance': {'queue': 'maintenance'},
} 