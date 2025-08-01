# FastAPI Role-Based Authentication System

A high-performance, production-ready authentication system built with FastAPI, PostgreSQL, and Redis.

## Features

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Product-based client tracking
- Password reset functionality
- Account lockout protection
- Email verification
- Rate limiting
- Performance optimization
- Comprehensive logging and monitoring
- Docker support
- Database migrations with Alembic

## Quick Start

1. **Clone and Setup**
   ```bash
   git clone <repository>
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your database and email settings
   ```

3. **Database Setup**
   ```bash
   # Initialize Alembic
   alembic init alembic
   
   # Create migration
   alembic revision --autogenerate -m "Initial migration"
   
   # Apply migration
   alembic upgrade head
   
   # Seed initial data
   python scripts/seed_data.py
   ```

4. **Start Services**
   ```bash
   # Start Redis
   redis-server
   
   # Start Celery worker
   celery -A app.core.tasks worker --loglevel=info
   
   # Start Celery beat (in another terminal)
   celery -A app.core.tasks beat --loglevel=info
   
   # Start FastAPI
   uvicorn app.main:app --reload
   ```

## Docker Deployment

```bash
docker-compose up -d
```

## API Endpoints

- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password
- `GET /api/v1/auth/me` - Get current user
- `GET /api/v1/auth/users` - Get all users (admin only)
- `GET /health` - Health check
- `GET /health/detailed` - Detailed health check

## Performance Optimizations

1. **Database Optimizations**
   - Composite indexes on frequently queried columns
   - Partial indexes for filtered queries
   - Connection pooling
   - Query optimization

2. **Caching Strategy**
   - Redis-based caching for user sessions
   - Function result caching
   - Token blacklisting

3. **Rate Limiting**
   - Configurable rate limits per endpoint
   - IP-based rate limiting
   - User-based rate limiting

4. **Background Tasks**
   - Asynchronous email sending
   - Automatic token cleanup
   - Scheduled maintenance tasks

## Security Features

- Password hashing with bcrypt
- JWT tokens with configurable expiration
- Refresh token rotation
- Account lockout after failed attempts
- Token blacklisting on logout
- Input validation and sanitization
- CORS protection
- Rate limiting

## Monitoring

- Application metrics collection
- Performance logging
- Health check endpoints
- System resource monitoring
- Error tracking

## Testing

```bash
# Run unit tests
pytest

# Run performance tests
python tests/performance_test.py

# API usage examples
python examples/api_usage.py

# Run database maintenance
python scripts/maintenance.py
```

## Production Considerations

1. **Security**
   - Change default SECRET_KEY
   - Use environment variables for sensitive data
   - Enable HTTPS in production
   - Configure proper CORS settings

2. **Performance**
   - Use multiple workers (4-8 recommended)
   - Enable database query optimization
   - Monitor and tune Redis memory usage
   - Set up proper logging levels

3. **Scalability**
   - Use load balancer for multiple instances
   - Implement database read replicas
   - Use Redis Cluster for high availability
   - Monitor resource usage

## License

MIT License 