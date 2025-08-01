from typing import Dict, List
import time
from collections import defaultdict
from app.core.database import redis_client

class MetricsCollector:
    """Collect and store application metrics"""
    
    def __init__(self):
        self.request_times = []
        self.success_count = 0
        self.error_count = 0
        self.endpoint_metrics = defaultdict(lambda: {"count": 0, "avg_time": 0})

    def record_request(self, response_time: float, success: bool = True):
        """Record a request metric"""
        self.request_times.append(response_time)
        
        if success:
            self.success_count += 1
        else:
            self.error_count += 1
        
        # Keep only last 1000 requests for memory efficiency
        if len(self.request_times) > 1000:
            self.request_times = self.request_times[-1000:]

    def get_metrics(self) -> dict:
        """Get current metrics"""
        if not self.request_times:
            return {
                "total_requests": 0,
                "success_rate": 0,
                "average_response_time": 0,
                "min_response_time": 0,
                "max_response_time": 0
            }
        
        total_requests = len(self.request_times)
        success_rate = self.success_count / total_requests if total_requests > 0 else 0
        avg_response_time = sum(self.request_times) / total_requests
        min_response_time = min(self.request_times)
        max_response_time = max(self.request_times)
        
        return {
            "total_requests": total_requests,
            "success_rate": success_rate,
            "average_response_time": avg_response_time,
            "min_response_time": min_response_time,
            "max_response_time": max_response_time,
            "success_count": self.success_count,
            "error_count": self.error_count
        }

# Global metrics collector instance
metrics_collector = MetricsCollector() 