#!/usr/bin/env python3
"""
Database Maintenance Script
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.utils.performance import (
    run_database_maintenance, 
    analyze_query_performance,
    create_performance_indexes,
    setup_database_maintenance
)

def main():
    """Run database maintenance tasks"""
    print("=== Database Maintenance Script ===\n")
    
    try:
        # Setup maintenance functions if not exists
        print("1. Setting up database maintenance functions...")
        setup_database_maintenance()
        
        # Create performance indexes
        print("\n2. Creating performance indexes...")
        create_performance_indexes()
        
        # Run maintenance
        print("\n3. Running database maintenance...")
        run_database_maintenance()
        
        # Analyze performance
        print("\n4. Analyzing query performance...")
        analyze_query_performance()
        
        print("\n=== Database maintenance completed successfully! ===")
        
    except Exception as e:
        print(f"\nError during maintenance: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 