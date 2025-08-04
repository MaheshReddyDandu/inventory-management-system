# Backend Architecture Analysis

## 🏗️ System Overview

This is a **multi-tenant, role-based authentication and attendance management system** built with FastAPI, PostgreSQL, and Redis. The system supports organizational hierarchy management, GPS-based attendance tracking, and comprehensive user management.

## 🛠️ Technology Stack

### Core Technologies
- **Backend Framework**: FastAPI (Python)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Cache**: Redis
- **Task Queue**: Celery
- **Authentication**: JWT with refresh tokens
- **API Documentation**: Auto-generated with FastAPI
- **Database Migrations**: Alembic

### Key Dependencies
```
fastapi==0.104.1          # Web framework
sqlalchemy==2.0.23        # ORM
alembic==1.12.1          # Database migrations
psycopg2-binary==2.9.9   # PostgreSQL adapter
python-jose==3.3.0       # JWT handling
passlib==1.7.4           # Password hashing
redis==5.0.1             # Caching
celery==5.3.4            # Task queue
pydantic==2.5.0          # Data validation
```

## 🗄️ Database Architecture

### Core Tables

#### 1. **Users & Authentication**
```sql
-- users table
- id (PK)
- uuid (unique identifier)
- email (indexed, multi-tenant)
- username (indexed, multi-tenant)
- hashed_password
- first_name, last_name
- is_active, is_verified
- role_id (FK to roles)
- product_id (multi-tenant)
- created_at, updated_at, last_login
- login_attempts, locked_until

-- roles table
- id (PK)
- name (indexed, multi-tenant)
- description
- permissions (JSON string)
- product_id (multi-tenant)
- is_active

-- refresh_tokens table
- id (PK)
- token (unique)
- user_id (FK)
- product_id (multi-tenant)
- expires_at
- is_revoked

-- password_resets table
- id (PK)
- token (unique)
- user_id (FK)
- product_id (multi-tenant)
- expires_at
- is_used
```

#### 2. **Organizational Structure**
```sql
-- organizational_units table
- id (PK)
- product_id (multi-tenant)
- parent_id (self-referencing FK)
- unit_type (branch, client, department, project)
- name, code, description
- address, contact_person, contact_email, contact_phone
- is_active
- hierarchy_path (e.g., "1.5.12.23")
- level, sort_order
- created_at, updated_at

-- user_assignments table
- id (PK)
- user_id (FK to users)
- organizational_unit_id (FK to organizational_units)
- product_id (multi-tenant)
- role_in_unit (manager, member, lead, supervisor)
- is_primary (boolean)
- start_date, end_date
- is_active

-- organizational_unit_metadata table
- id (PK)
- organizational_unit_id (FK)
- product_id (multi-tenant)
- field_name, field_value, field_type
```

#### 3. **Office & Location Management**
```sql
-- office_locations table
- id (PK)
- product_id (multi-tenant)
- organizational_unit_id (FK, optional)
- location_name
- latitude, longitude (DECIMAL precision)
- radius_meters (geofence)
- address
- is_active
```

#### 4. **Attendance System**
```sql
-- attendance table
- id (PK)
- user_id (FK to users)
- product_id (multi-tenant)
- organizational_unit_id (FK, optional)
- check_in_time, check_out_time
- check_in_latitude, check_in_longitude
- check_out_latitude, check_out_longitude
- location_name
- attendance_status (present, absent, late, half-day, remote)
- work_type (office, remote, client-site, travel)
- notes
- created_at

-- attendance_rules table
- id (PK)
- product_id (multi-tenant)
- organizational_unit_id (FK, optional)
- rule_name
- start_time, end_time (HH:MM format)
- late_threshold_minutes
- half_day_threshold_hours
- work_days (comma-separated)
- is_active
```

### Database Design Patterns

#### 1. **Multi-Tenant Architecture**
- Every table includes `product_id` for tenant isolation
- Composite indexes on `(product_id, other_columns)` for performance
- Unique constraints scoped to `product_id`

#### 2. **Hierarchical Organization**
- Self-referencing foreign keys for parent-child relationships
- `hierarchy_path` for efficient tree traversal
- `level` field for depth tracking
- `sort_order` for custom ordering

#### 3. **Performance Optimizations**
- Composite indexes on frequently queried columns
- Partial indexes for filtered queries (e.g., active users only)
- Connection pooling with PostgreSQL
- Statement and lock timeouts

## 🔌 API Architecture

### API Structure
```
/api/v1/
├── auth/                    # Authentication endpoints
│   ├── signup              # User registration
│   ├── login               # User login
│   ├── refresh             # Token refresh
│   ├── logout              # User logout
│   ├── forgot-password     # Password reset request
│   ├── reset-password      # Password reset
│   ├── change-password     # Change password
│   ├── me                  # Current user info
│   └── admin/              # Admin endpoints
│       ├── users           # User management
│       └── roles           # Role management
├── organization/           # Organization management
│   ├── units              # Organizational units CRUD
│   ├── assignments        # User assignments
│   ├── office-locations   # Office location management
│   ├── attendance-rules   # Attendance rules
│   ├── attendance/        # Attendance endpoints
│   │   ├── check-in       # Check in
│   │   ├── check-out      # Check out
│   │   ├── my             # My attendance records
│   │   ├── today          # Today's attendance
│   │   └── unit/{id}      # Unit attendance
│   ├── stats              # Organization statistics
│   └── validate-location  # Location validation
└── health/                # Health check endpoints
```

### Authentication Flow
1. **Login**: User provides email/password → Returns JWT access token + refresh token
2. **Token Refresh**: Client sends refresh token → Returns new access token
3. **API Access**: Client includes access token in Authorization header
4. **Role-Based Access**: Endpoints check user roles and permissions

### Security Features
- JWT-based authentication with configurable expiration
- Refresh token rotation
- Password hashing with bcrypt
- Account lockout protection
- Rate limiting
- CORS middleware
- Input validation with Pydantic

## 🏢 Business Logic Layer

### Service Layer Architecture

#### 1. **AuthService** (`auth_service.py`)
- User registration and authentication
- Password management (reset, change)
- Token management (create, refresh, revoke)
- Account lockout handling
- Email verification

#### 2. **OrganizationService** (`organization_service.py`)
- Organizational unit CRUD operations
- Hierarchy management and tree building
- User assignment management
- Office location management
- Attendance tracking and validation
- GPS coordinate validation and geofencing
- Attendance rule management

### Key Business Rules

#### 1. **Multi-Tenant Isolation**
- All operations are scoped to `product_id`
- Users can only access data from their product
- Admin operations are restricted to their product

#### 2. **Organizational Hierarchy**
- Supports unlimited depth hierarchy
- Automatic hierarchy path generation
- Tree-based queries for efficient navigation
- Parent-child relationship validation

#### 3. **Attendance System**
- GPS-based location validation
- Geofence radius checking
- Work type classification (office, remote, client-site, travel)
- Attendance status calculation (present, late, absent, half-day)
- Duplicate check-in prevention

#### 4. **Role-Based Access Control**
- Role-based endpoint protection
- Permission-based feature access
- Admin/Manager/User role hierarchy
- Product-scoped role management

## 🚀 Performance Optimizations

### 1. **Database Optimizations**
- Connection pooling (10 connections, 20 overflow)
- Composite indexes on frequently queried columns
- Partial indexes for filtered queries
- Query timeout and lock timeout settings
- Statement-level performance monitoring

### 2. **Caching Strategy**
- Redis-based session caching
- Function result caching
- Token blacklisting
- User data caching

### 3. **API Performance**
- Request/response time monitoring
- Error tracking and logging
- Middleware-based metrics collection
- Async/await for I/O operations

### 4. **Background Tasks**
- Celery integration for heavy operations
- Email sending in background
- Data cleanup and maintenance tasks
- Performance monitoring and alerting

## 🔧 Configuration & Deployment

### Environment Configuration
```python
# Core settings
DATABASE_URL: str              # PostgreSQL connection string
SECRET_KEY: str                # JWT signing key
REDIS_URL: str                 # Redis connection string

# Authentication settings
ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
REFRESH_TOKEN_EXPIRE_DAYS: int = 7
ALGORITHM: str = "HS256"

# Email settings
EMAIL_HOST: str
EMAIL_PORT: int
EMAIL_USERNAME: str
EMAIL_PASSWORD: str
```

### Deployment Features
- Docker support with docker-compose
- Database migrations with Alembic
- Health check endpoints
- Comprehensive logging
- Error handling and monitoring
- CORS configuration for frontend integration

## 📊 Monitoring & Maintenance

### Health Checks
- Database connectivity
- Redis connectivity
- Service status monitoring
- Performance metrics collection

### Maintenance Tasks
- Old data cleanup
- Token cleanup
- Database optimization
- Performance analysis

### Logging & Metrics
- Request/response logging
- Performance timing
- Error tracking
- User activity monitoring

## 🔄 Data Flow

### 1. **User Registration Flow**
```
Frontend → POST /api/v1/auth/signup → AuthService → Database
↓
Email verification → Background task → Email service
```

### 2. **Authentication Flow**
```
Frontend → POST /api/v1/auth/login → AuthService → Database
↓
JWT tokens → Redis cache → Frontend storage
```

### 3. **Attendance Check-in Flow**
```
Frontend → GPS coordinates → POST /api/v1/organization/attendance/check-in
↓
OrganizationService → Location validation → Database
↓
Attendance record created → Real-time updates
```

### 4. **Organization Management Flow**
```
Admin → CRUD operations → OrganizationService → Database
↓
Hierarchy updates → Tree rebuilding → Cache invalidation
```

## 🎯 Key Features Summary

### ✅ Implemented Features
- Multi-tenant user management
- Role-based access control
- Organizational hierarchy management
- GPS-based attendance tracking
- Office location management
- Attendance rules and policies
- User assignment management
- JWT authentication with refresh tokens
- Password reset functionality
- Email verification
- Performance monitoring
- Database migrations
- Background task processing

### 🔧 Technical Highlights
- Scalable multi-tenant architecture
- Efficient hierarchical data structure
- Real-time GPS validation
- Comprehensive security measures
- Performance-optimized database design
- RESTful API with auto-generated documentation
- Background task processing with Celery
- Redis-based caching and session management

This architecture provides a robust, scalable foundation for a comprehensive attendance and organization management system with enterprise-grade features and performance optimizations. 