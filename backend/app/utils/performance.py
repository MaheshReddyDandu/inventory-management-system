import time
import logging
from functools import wraps
from typing import Callable
from sqlalchemy import text
from app.core.database import engine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def log_performance(func_name: str = None):
    """Decorator to log function performance"""
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                success = True
            except Exception as e:
                success = False
                raise e
            finally:
                end_time = time.time()
                execution_time = end_time - start_time
                
                log_name = func_name or func.__name__
                logger.info(
                    f"Function: {log_name}, "
                    f"Execution Time: {execution_time:.4f}s, "
                    f"Success: {success}"
                )
            
            return result
        return wrapper
    return decorator

def create_performance_indexes():
    """Create additional performance indexes"""
    with engine.connect() as connection:
        try:
            # Create partial indexes for better performance
            indexes = [
                # Partial index for active users only
                """
                CREATE INDEX IF NOT EXISTS idx_users_active_partial 
                ON users (email, username) 
                WHERE is_active = true
                """,
                
                # Partial index for non-verified users
                """
                CREATE INDEX IF NOT EXISTS idx_users_unverified_partial 
                ON users (email, created_at) 
                WHERE is_verified = false
                """,
                
                # Partial index for locked users
                """
                CREATE INDEX IF NOT EXISTS idx_users_locked_partial 
                ON users (id, locked_until) 
                WHERE locked_until IS NOT NULL
                """,
                
                # Partial index for active refresh tokens
                """
                CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active_partial 
                ON refresh_tokens (user_id, expires_at) 
                WHERE is_revoked = false
                """,
                
                # Partial index for unused password resets
                """
                CREATE INDEX IF NOT EXISTS idx_password_resets_unused_partial 
                ON password_resets (user_id, expires_at) 
                WHERE is_used = false
                """
            ]
            
            for index_sql in indexes:
                connection.execute(text(index_sql))
            
            connection.commit()
            logger.info("Performance indexes created successfully")
            
        except Exception as e:
            logger.error(f"Error creating performance indexes: {e}")
            connection.rollback()

def setup_database_maintenance():
    """Setup database maintenance tasks"""
    with engine.connect() as connection:
        try:
            # Create maintenance functions
            maintenance_functions = [
                # Function to clean up old data
                """
                CREATE OR REPLACE FUNCTION cleanup_old_data()
                RETURNS void AS $$
                BEGIN
                    -- Clean up expired refresh tokens older than 30 days
                    DELETE FROM refresh_tokens 
                    WHERE expires_at < NOW() - INTERVAL '30 days';
                    
                    -- Clean up used password resets older than 7 days
                    DELETE FROM password_resets 
                    WHERE is_used = true AND created_at < NOW() - INTERVAL '7 days';
                    
                    -- Clean up expired password resets older than 7 days
                    DELETE FROM password_resets 
                    WHERE expires_at < NOW() - INTERVAL '7 days';
                    
                    -- Update user login attempts for users not locked
                    UPDATE users 
                    SET login_attempts = 0 
                    WHERE locked_until IS NULL AND login_attempts > 0;
                    
                    -- Unlock users whose lock period has expired
                    UPDATE users 
                    SET locked_until = NULL, login_attempts = 0 
                    WHERE locked_until < NOW();
                END;
                $$ LANGUAGE plpgsql;
                """,
                
                # Function to get database statistics
                """
                CREATE OR REPLACE FUNCTION get_db_stats()
                RETURNS TABLE (
                    table_name text,
                    row_count bigint,
                    table_size text,
                    index_size text
                ) AS $$
                BEGIN
                    RETURN QUERY
                    SELECT 
                        schemaname||'.'||tablename as table_name,
                        n_tup_ins + n_tup_upd + n_tup_del as row_count,
                        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
                        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
                    FROM pg_stat_user_tables
                    WHERE schemaname = 'public'
                    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
                END;
                $$ LANGUAGE plpgsql;
                """
            ]
            
            for func_sql in maintenance_functions:
                connection.execute(text(func_sql))
            
            connection.commit()
            logger.info("Database maintenance functions created successfully")
            
        except Exception as e:
            logger.error(f"Error setting up database maintenance: {e}")
            connection.rollback()

def run_database_maintenance():
    """Run database maintenance tasks"""
    with engine.connect() as connection:
        try:
            # Run cleanup
            connection.execute(text("SELECT cleanup_old_data();"))
            
            # Get statistics
            result = connection.execute(text("SELECT * FROM get_db_stats();"))
            stats = result.fetchall()
            
            logger.info("Database maintenance completed")
            logger.info("Database statistics:")
            for stat in stats:
                logger.info(f"  {stat[0]}: {stat[1]} rows, {stat[2]} table, {stat[3]} indexes")
            
            connection.commit()
            
        except Exception as e:
            logger.error(f"Error running database maintenance: {e}")
            connection.rollback()

def analyze_query_performance():
    """Analyze query performance"""
    with engine.connect() as connection:
        try:
            # Get slow queries
            slow_queries = connection.execute(text("""
                SELECT 
                    query,
                    calls,
                    total_time,
                    mean_time,
                    rows
                FROM pg_stat_statements 
                ORDER BY mean_time DESC 
                LIMIT 10;
            """)).fetchall()
            
            logger.info("Top 10 slowest queries:")
            for query in slow_queries:
                logger.info(f"  Query: {query[0][:100]}...")
                logger.info(f"    Calls: {query[1]}, Total Time: {query[2]:.2f}ms, Mean Time: {query[3]:.2f}ms, Rows: {query[4]}")
            
        except Exception as e:
            logger.error(f"Error analyzing query performance: {e}") 