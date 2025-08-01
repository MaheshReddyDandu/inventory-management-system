from typing import Optional, Callable
from fastapi import Request, HTTPException, status
import time
from app.core.database import redis_client

class RateLimiter:
    def __init__(self, requests: int, window: int, key_func=None):
        """
        Initialize rate limiter
        
        Args:
            requests: Number of requests allowed
            window: Time window in seconds
            key_func: Function to generate rate limit key
        """
        self.requests = requests
        self.window = window
        self.key_func = key_func or self._default_key_func

    def _default_key_func(self, request: Request) -> str:
        """Default function to generate rate limit key"""
        return f"rate_limit:{request.client.host}"

    def __call__(self, request: Request):
        """Check rate limit for the request"""
        key = self.key_func(request)
        
        # Get current count
        current = redis_client.get(key)
        if current is None:
            # First request in window
            redis_client.setex(key, self.window, 1)
            return
        
        current_count = int(current)
        if current_count >= self.requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Maximum {self.requests} requests per {self.window} seconds."
            )
        
        # Increment counter
        redis_client.incr(key) 