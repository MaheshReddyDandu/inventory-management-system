# 🏪 Multi-Tenant Inventory & Attendance Management System

A comprehensive, enterprise-grade inventory and attendance management system built with **FastAPI** backend and **Angular 19** frontend, featuring complete multi-tenant architecture, organizational hierarchy management, and advanced attendance tracking with geolocation support.

## 🚀 Core Features

### ✅ Multi-Tenant Architecture
- **Complete data isolation** per tenant with auto-generated `product_id`
- **Tenant-scoped operations** for all data and operations
- **Billing-ready** architecture with product-based user management
- **Cross-tenant security** with role-based access control

### ✅ Authentication & Authorization
- **JWT-based authentication** with access/refresh tokens
- **Role-based access control** (Admin, Manager, User)
- **Custom role creation** per tenant with JSON permissions
- **Password reset functionality** with email integration
- **Account locking** after failed login attempts
- **Session management** with Redis

### ✅ Organizational Management
- **Hierarchical organizational structure** (Branch → Client → Department → Project)
- **User assignments** to organizational units
- **Office location management** with geofencing
- **Attendance rules** per organizational unit
- **Metadata support** for custom fields

### ✅ Attendance Management
- **Check-in/Check-out** with geolocation tracking
- **Location validation** against office geofences
- **Work type classification** (Office, Remote, Client-site, Travel)
- **Attendance status tracking** (Present, Late, Absent, Half-day)
- **Real-time duration calculation**
- **Historical attendance reports**

### ✅ User Management
- **Admin user creation** and management
- **Role assignment** and management
- **User profile updates** and password changes
- **Account activation/deactivation**
- **Primary assignment** designation

## 🏗️ System Architecture

```
inventory/
├── backend/                          # FastAPI Backend
│   ├── app/
│   │   ├── api/v1/                  # REST API endpoints
│   │   │   ├── auth.py              # Authentication & user management
│   │   │   ├── organization.py      # Org units, attendance, locations
│   │   │   └── health.py            # Health monitoring
│   │   ├── core/                    # Core configurations
│   │   │   ├── config.py            # Environment settings
│   │   │   ├── database.py          # Database connection
│   │   │   ├── security.py          # JWT & password utilities
│   │   │   └── celery_config.py     # Background tasks
│   │   ├── models/                  # SQLAlchemy database models
│   │   │   ├── user.py              # User, Role, Token models
│   │   │   └── organization.py      # Org units, attendance models
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── services/                # Business logic services
│   │   └── utils/                   # Utilities & helpers
│   ├── alembic/                     # Database migrations
│   ├── scripts/                     # Database seeding & maintenance
│   └── requirements.txt             # Python dependencies
├── ui/web/inventory-management/     # Angular 19 Frontend
│   ├── src/app/
│   │   ├── components/              # UI components
│   │   │   ├── auth/                # Authentication components
│   │   │   ├── dashboard/           # Dashboard & overview
│   │   │   ├── organization/        # Org management
│   │   │   ├── attendance/          # Attendance tracking
│   │   │   └── admin-management/    # Admin tools
│   │   ├── services/                # API services
│   │   ├── guards/                  # Route guards
│   │   └── models/                  # TypeScript interfaces
│   └── package.json                 # Node.js dependencies
└── README.md
```

## 🗄️ Database Schema

### User Management Tables

#### `users` Table
```sql
- id (Primary Key)
- uuid (Unique identifier)
- email (Indexed, nullable=False)
- username (Indexed, nullable=True)
- hashed_password (nullable=False)
- first_name, last_name (nullable=False)
- is_active, is_verified (Boolean, indexed)
- role_id (Foreign Key to roles.id)
- product_id (Multi-tenant identifier)
- created_at, updated_at, last_login (Timestamps)
- login_attempts, locked_until (Security fields)
```

#### `roles` Table
```sql
- id (Primary Key)
- name (Indexed, nullable=False)
- description (Text)
- permissions (JSON string)
- product_id (Multi-tenant identifier)
- is_active (Boolean, indexed)
- created_at (Timestamp)
```

#### `refresh_tokens` Table
```sql
- id (Primary Key)
- token (Unique, indexed)
- user_id (Foreign Key to users.id)
- product_id (Multi-tenant identifier)
- expires_at (Timestamp)
- is_revoked (Boolean, indexed)
- created_at (Timestamp)
```

#### `password_resets` Table
```sql
- id (Primary Key)
- token (Unique, indexed)
- user_id (Foreign Key to users.id)
- product_id (Multi-tenant identifier)
- expires_at (Timestamp)
- is_used (Boolean, indexed)
- created_at (Timestamp)
```

### Organizational Management Tables

#### `organizational_units` Table
```sql
- id (Primary Key)
- product_id (Multi-tenant identifier)
- parent_id (Self-referencing foreign key)
- unit_type (branch, client, department, project)
- name, code, description, address
- contact_person, contact_email, contact_phone
- is_active (Boolean, indexed)
- hierarchy_path (Text, indexed) - e.g., "1.5.12.23"
- level, sort_order (Integer)
- created_at, updated_at (Timestamps)
```

#### `user_assignments` Table
```sql
- id (Primary Key)
- user_id (Foreign Key to users.id)
- organizational_unit_id (Foreign Key to organizational_units.id)
- product_id (Multi-tenant identifier)
- role_in_unit (manager, member, lead, supervisor)
- is_primary (Boolean, indexed)
- start_date, end_date (Date)
- is_active (Boolean, indexed)
- created_at (Timestamp)
```

#### `organizational_unit_metadata` Table
```sql
- id (Primary Key)
- organizational_unit_id (Foreign Key to organizational_units.id)
- product_id (Multi-tenant identifier)
- field_name, field_value (Text)
- field_type (text, number, date, boolean)
- created_at (Timestamp)
```

### Location & Attendance Tables

#### `office_locations` Table
```sql
- id (Primary Key)
- product_id (Multi-tenant identifier)
- organizational_unit_id (Foreign Key to organizational_units.id)
- location_name (nullable=False)
- latitude, longitude (DECIMAL, nullable=False)
- radius_meters (Integer, default=100)
- address (Text)
- is_active (Boolean, indexed)
- created_at (Timestamp)
```

#### `attendance_rules` Table
```sql
- id (Primary Key)
- product_id (Multi-tenant identifier)
- organizational_unit_id (Foreign Key to organizational_units.id)
- rule_name (nullable=False)
- start_time, end_time (String, HH:MM format)
- late_threshold_minutes (Integer, default=15)
- half_day_threshold_hours (Integer, default=4)
- work_days (String, default='1,2,3,4,5')
- is_active (Boolean, indexed)
- created_at (Timestamp)
```

#### `attendance` Table
```sql
- id (Primary Key)
- user_id (Foreign Key to users.id)
- product_id (Multi-tenant identifier)
- organizational_unit_id (Foreign Key to organizational_units.id)
- check_in_time, check_out_time (DateTime)
- check_in_latitude, check_in_longitude (DECIMAL)
- check_out_latitude, check_out_longitude (DECIMAL)
- location_name (String)
- attendance_status (present, absent, late, half-day, remote)
- work_type (office, remote, client-site, travel)
- notes (Text)
- created_at (Timestamp)
```

## 🔌 API Endpoints

### Authentication Endpoints (`/api/v1/auth`)

#### User Authentication
- `POST /signup` - User registration with auto product_id generation
- `POST /login` - User login with JWT tokens
- `POST /refresh` - Refresh access token
- `POST /logout` - User logout with token revocation
- `GET /me` - Get current user information

#### Password Management
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with token
- `POST /change-password` - Change password (authenticated)

#### Admin User Management
- `GET /users` - List all users (product-scoped)
- `POST /admin/users` - Create new user
- `PUT /admin/users/{user_id}` - Update user
- `DELETE /admin/users/{user_id}` - Delete user

#### Admin Role Management
- `GET /admin/roles` - List all roles (product-scoped)
- `POST /admin/roles` - Create new role
- `PUT /admin/roles/{role_id}` - Update role
- `DELETE /admin/roles/{role_id}` - Delete role

### Organization Endpoints (`/api/v1/organization`)

#### Organizational Units
- `POST /units` - Create organizational unit
- `GET /units` - Get all units (with optional type filter)
- `GET /units/hierarchy` - Get hierarchy tree
- `GET /units/{unit_id}` - Get specific unit
- `PUT /units/{unit_id}` - Update unit
- `DELETE /units/{unit_id}` - Delete unit

#### User Assignments
- `POST /assignments` - Assign user to unit
- `GET /assignments/user/{user_id}` - Get user assignments
- `GET /assignments/unit/{unit_id}` - Get unit users
- `GET /assignments/my` - Get current user's assignments

#### Office Locations
- `POST /office-locations` - Create office location
- `GET /office-locations` - Get all locations

#### Attendance Rules
- `POST /attendance-rules` - Create attendance rule
- `GET /attendance-rules` - Get all rules

#### Attendance Management
- `POST /attendance/check-in` - Mark attendance check-in
- `POST /attendance/check-out` - Mark attendance check-out
- `GET /attendance/my` - Get user's attendance (paginated)
- `GET /attendance/today` - Get today's attendance (admin/manager)
- `GET /attendance/unit/{unit_id}` - Get unit attendance

#### Location & Statistics
- `POST /validate-location` - Validate location against geofence
- `GET /stats` - Get organization statistics

### Health Endpoints (`/health`)
- `GET /` - Basic health check
- `GET /detailed` - Detailed health with system metrics

## 🎨 Frontend Features

### Authentication Components
- **Landing Page** - Welcome and navigation
- **Login** - User authentication
- **Signup** - User registration
- **Forgot Password** - Password recovery
- **Reset Password** - Password reset
- **Change Password** - Password update

### Dashboard & Overview
- **Dashboard** - Main application overview
- **Statistics Cards** - Key metrics display
- **Quick Actions** - Common tasks shortcuts

### Organization Management
- **Organization Management** - CRUD for organizational units
- **Organization Hierarchy** - Tree view of org structure
- **User Assignment** - Assign users to units
- **Office Location** - Manage office locations

### Attendance Management
- **Attendance Check** - Check-in/out with location tracking
- **Attendance Rules** - Configure attendance policies
- **Attendance Reports** - View attendance history

### Admin Management
- **User Management** - Admin user CRUD operations
- **Role Management** - Admin role CRUD operations

## 🛠️ Technology Stack

### Backend
- **FastAPI 0.104.1** - Modern Python web framework
- **SQLAlchemy 2.0.23** - ORM for database operations
- **PostgreSQL** - Primary database with advanced indexing
- **Redis 5.0.1** - Caching and session storage
- **Alembic 1.12.1** - Database migrations
- **JWT** - Authentication tokens with python-jose
- **bcrypt** - Password hashing with passlib
- **Celery 5.3.4** - Background task processing
- **Pydantic 2.5.0** - Data validation and serialization
- **psutil 5.9.6** - System monitoring

### Frontend
- **Angular 19.2.0** - Modern TypeScript framework
- **Angular Material 19.2.19** - Material Design components
- **Angular CDK 19.2.19** - Component development kit
- **SCSS** - Advanced styling with CSS preprocessor
- **RxJS 7.8.0** - Reactive programming
- **TypeScript 5.7.2** - Type-safe JavaScript

### Development Tools
- **Uvicorn 0.24.0** - ASGI server
- **Angular CLI 19.2.15** - Angular development tools
- **Jasmine/Karma** - Testing framework
- **Alembic** - Database migration management

## 📋 Prerequisites

- **Python 3.11+** - Backend runtime
- **Node.js 18+** - Frontend runtime
- **PostgreSQL 16+** - Primary database
- **Redis 6+** - Caching and sessions
- **Git** - Version control

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd inventory
```

### 2. Backend Setup

#### Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### Database Setup
```bash
# Create database
createdb -U postgres inventory_db

# Run migrations
alembic upgrade head

# Seed initial data
python scripts/seed_data.py
```

#### Environment Configuration
```bash
cp env.example .env
# Edit .env with your database credentials
```

#### Start Backend Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup

#### Install Dependencies
```bash
cd ui/web/inventory-management
npm install
```

#### Start Development Server
```bash
ng serve --port 4200
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost/inventory_db

# Security
SECRET_KEY=your-super-secret-key-2024
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Redis
REDIS_URL=redis://localhost:6379

# Email (for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## 🔒 Multi-Tenant Flow

### 1. First User Signup
```json
POST /api/v1/auth/signup
{
  "email": "admin@company.com",
  "first_name": "Admin",
  "last_name": "User",
  "password": "SecurePassword123"
}
```

**Result:**
- Auto-generates unique `product_id`
- Creates default roles (admin, manager, user)
- Assigns admin role to first user
- Establishes tenant isolation

### 2. Admin Creates Team Members
```json
POST /api/v1/auth/admin/users
{
  "email": "employee@company.com",
  "first_name": "Employee",
  "last_name": "User",
  "password": "Password123",
  "role_id": 2
}
```

### 3. Organizational Structure
```json
POST /api/v1/organization/units
{
  "unit_type": "branch",
  "name": "Main Office",
  "code": "BR001",
  "description": "Primary office location"
}
```

### 4. User Assignment
```json
POST /api/v1/organization/assignments
{
  "user_id": 2,
  "organizational_unit_id": 1,
  "role_in_unit": "member",
  "is_primary": true
}
```

### 5. Attendance Tracking
```json
POST /api/v1/organization/attendance/check-in
{
  "organizational_unit_id": 1,
  "work_type": "office",
  "location_name": "Main Office",
  "notes": "Starting work day"
}
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd ui/web/inventory-management
ng test
```

## 📦 Deployment

### Docker (Recommended)
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment
1. Set up production PostgreSQL database
2. Configure Redis for production
3. Set environment variables
4. Run database migrations: `alembic upgrade head`
5. Build frontend: `ng build --configuration production`
6. Deploy to your preferred hosting platform

## 🔍 Performance Features

### Database Optimization
- **Composite indexes** for multi-tenant queries
- **Hierarchical data** with optimized tree queries
- **Geospatial indexing** for location-based queries
- **Connection pooling** for high concurrency

### Caching Strategy
- **Redis caching** for session management
- **Query result caching** for frequently accessed data
- **Background task processing** with Celery

### Security Features
- **Rate limiting** for API endpoints
- **Input validation** with Pydantic
- **SQL injection prevention** with SQLAlchemy
- **XSS protection** with Angular sanitization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation at `/docs`

## 🔄 Version History

- **v1.0.0** - Initial release with multi-tenant architecture
- **v1.1.0** - Added role-based access control
- **v1.2.0** - Enhanced security features
- **v1.3.0** - Added organizational hierarchy management
- **v1.4.0** - Implemented attendance tracking with geolocation
- **v1.5.0** - Added comprehensive reporting and analytics

---

**Built with ❤️ for scalable enterprise inventory and attendance management** 