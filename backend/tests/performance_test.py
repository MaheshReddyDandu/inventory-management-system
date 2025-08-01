#!/usr/bin/env python3
"""
Performance Testing Script
"""

import asyncio
import aiohttp
import time
from concurrent.futures import ThreadPoolExecutor
import statistics

async def login_request(session, url, data):
    """Make a login request"""
    async with session.post(url, json=data) as response:
        return await response.json()

async def performance_test():
    """Run performance test"""
    url = "http://localhost:8000/api/v1/auth/login"
    data = {
        "email": "admin@example.com",
        "password": "admin123"
    }
    
    concurrent_requests = 100
    total_requests = 1000
    
    response_times = []
    
    async with aiohttp.ClientSession() as session:
        for batch in range(0, total_requests, concurrent_requests):
            start_time = time.time()
            
            tasks = []
            for i in range(min(concurrent_requests, total_requests - batch)):
                task = login_request(session, url, data)
                tasks.append(task)
            
            await asyncio.gather(*tasks)
            
            batch_time = time.time() - start_time
            response_times.append(batch_time)
            
            print(f"Batch {batch//concurrent_requests + 1}: {batch_time:.2f}s")
    
    print(f"\nPerformance Results:")
    print(f"Total requests: {total_requests}")
    print(f"Concurrent requests: {concurrent_requests}")
    print(f"Average batch time: {statistics.mean(response_times):.2f}s")
    print(f"Min batch time: {min(response_times):.2f}s")
    print(f"Max batch time: {max(response_times):.2f}s")

def sync_performance_test():
    """Synchronous performance test"""
    import requests
    
    url = "http://localhost:8000/api/v1/auth/login"
    data = {
        "email": "admin@example.com",
        "password": "admin123"
    }
    
    total_requests = 100
    response_times = []
    
    print("Running synchronous performance test...")
    
    for i in range(total_requests):
        start_time = time.time()
        
        try:
            response = requests.post(url, json=data)
            response.raise_for_status()
        except Exception as e:
            print(f"Request {i+1} failed: {e}")
            continue
        
        response_time = time.time() - start_time
        response_times.append(response_time)
        
        if (i + 1) % 10 == 0:
            print(f"Completed {i+1}/{total_requests} requests")
    
    if response_times:
        print(f"\nSynchronous Performance Results:")
        print(f"Total requests: {len(response_times)}")
        print(f"Average response time: {statistics.mean(response_times):.3f}s")
        print(f"Min response time: {min(response_times):.3f}s")
        print(f"Max response time: {max(response_times):.3f}s")
        print(f"Median response time: {statistics.median(response_times):.3f}s")

def main():
    """Main function"""
    print("=== FastAPI Performance Test ===\n")
    
    # Run synchronous test
    sync_performance_test()
    
    print("\n" + "="*50 + "\n")
    
    # Run asynchronous test
    print("Running asynchronous performance test...")
    asyncio.run(performance_test())

if __name__ == "__main__":
    main() 