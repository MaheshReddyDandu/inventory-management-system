from celery import Celery
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user import User, RefreshToken, PasswordReset

# Celery configuration
celery_app = Celery(
    "fastapi_auth",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.core.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,
    task_soft_time_limit=25 * 60,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

@celery_app.task
def send_verification_email(user_id: int, token: str):
    """Send email verification email"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        subject = "Email Verification"
        body = f"""
        Hello {user.first_name},
        
        Please verify your email address by clicking the link below:
        
        http://localhost:3000/verify-email?token={token}
        
        This link will expire in 24 hours.
        
        If you didn't create an account, please ignore this email.
        
        Best regards,
        Your App Team
        """
        
        return send_email(user.email, subject, body)
        
    except Exception as e:
        print(f"Error sending verification email: {e}")
        return False
    finally:
        db.close()

@celery_app.task
def send_password_reset_email(user_id: int, token: str):
    """Send password reset email"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        subject = "Password Reset Request"
        body = f"""
        Hello {user.first_name},
        
        You have requested to reset your password. Click the link below to reset it:
        
        http://localhost:3000/reset-password?token={token}
        
        This link will expire in 1 hour.
        
        If you didn't request a password reset, please ignore this email.
        
        Best regards,
        Your App Team
        """
        
        return send_email(user.email, subject, body)
        
    except Exception as e:
        print(f"Error sending password reset email: {e}")
        return False
    finally:
        db.close()

def send_email(to_email: str, subject: str, body: str) -> bool:
    """Send email using SMTP"""
    try:
        msg = MIMEMultipart()
        msg["From"] = settings.EMAIL_USERNAME
        msg["To"] = to_email
        msg["Subject"] = subject
        
        msg.attach(MIMEText(body, "plain"))
        
        server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
        server.starttls()
        server.login(settings.EMAIL_USERNAME, settings.EMAIL_PASSWORD)
        
        text = msg.as_string()
        server.sendmail(settings.EMAIL_USERNAME, to_email, text)
        server.quit()
        
        return True
        
    except Exception as e:
        print(f"Error sending email: {e}")
        return False

@celery_app.task
def cleanup_expired_tokens():
    """Clean up expired refresh tokens and password reset tokens"""
    db = SessionLocal()
    try:
        # Clean up expired refresh tokens
        expired_refresh_tokens = db.query(RefreshToken).filter(
            RefreshToken.expires_at < datetime.utcnow()
        ).all()
        
        for token in expired_refresh_tokens:
            db.delete(token)
        
        # Clean up expired password reset tokens
        expired_password_resets = db.query(PasswordReset).filter(
            PasswordReset.expires_at < datetime.utcnow()
        ).all()
        
        for reset in expired_password_resets:
            db.delete(reset)
        
        # Clean up used password reset tokens
        used_password_resets = db.query(PasswordReset).filter(
            PasswordReset.is_used == True
        ).all()
        
        for reset in used_password_resets:
            db.delete(reset)
        
        db.commit()
        
        print(f"Cleaned up {len(expired_refresh_tokens)} expired refresh tokens")
        print(f"Cleaned up {len(expired_password_resets)} expired password reset tokens")
        print(f"Cleaned up {len(used_password_resets)} used password reset tokens")
        
        return True
        
    except Exception as e:
        print(f"Error cleaning up tokens: {e}")
        db.rollback()
        return False
    finally:
        db.close() 