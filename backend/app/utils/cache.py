from typing import Optional, Any
from functools import wraps
import json
import hashlib
from app.core.database import redis_client

class CacheManager:
    @staticmethod
    def get(key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            value = redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception:
            return None

    @staticmethod
    def set(key: str, value: Any, ttl: int = 3600) -> bool:
        """Set value in cache with TTL"""
        try:
            redis_client.setex(key, ttl, json.dumps(value))
            return True
        except Exception:
            return False

    @staticmethod
    def delete(key: str) -> bool:
        """Delete value from cache"""
        try:
            redis_client.delete(key)
            return True
        except Exception:
            return False

    @staticmethod
    def cache_function(ttl: int = 3600, key_prefix: str = ""):
        """Decorator to cache function results"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Generate cache key
                key_parts = [key_prefix, func.__name__]
                key_parts.extend([str(arg) for arg in args])
                key_parts.extend([f"{k}:{v}" for k, v in sorted(kwargs.items())])
                
                cache_key = hashlib.md5(":".join(key_parts).encode()).hexdigest()
                
                # Try to get from cache
                cached_result = CacheManager.get(cache_key)
                if cached_result is not None:
                    return cached_result
                
                # Execute function and cache result
                result = func(*args, **kwargs)
                CacheManager.set(cache_key, result, ttl)
                
                return result
            return wrapper
        return decorator 