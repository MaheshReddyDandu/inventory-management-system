# 🏪 Multi-Tenant Inventory Management System

A modern, scalable inventory management system built with FastAPI backend and Angular frontend, featuring complete multi-tenant architecture with role-based access control.

## 🚀 Features

### ✅ Multi-Tenant Architecture
- **Complete data isolation** per tenant
- **Auto-generated product IDs** for new tenants
- **Tenant-scoped operations** for all data
- **Billing-ready** architecture

### ✅ Authentication & Authorization
- **JWT-based authentication** with access/refresh tokens
- **Role-based access control** (Admin, Manager, User)
- **Custom role creation** per tenant
- **Password reset functionality**
- **Account locking** after failed attempts

### ✅ User Management
- **Admin user creation** and management
- **Role assignment** and management
- **User profile updates**
- **Account activation/deactivation**

### ✅ Security Features
- **Password strength validation**
- **Secure password hashing** with bcrypt
- **Token-based session management**
- **Cross-tenant data isolation**

## 🏗️ Architecture

```
inventory/
├── backend/                 # FastAPI Backend
│   ├── app/
│   │   ├── api/v1/         # API endpoints
│   │   ├── core/           # Core configurations
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # Business logic
│   ├── alembic/            # Database migrations
│   ├── scripts/            # Database seeding
│   └── requirements.txt    # Python dependencies
├── ui/web/inventory-management/  # Angular Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/ # UI components
│   │   │   ├── services/   # API services
│   │   │   └── models/     # TypeScript models
│   │   └── assets/         # Static assets
│   └── package.json        # Node.js dependencies
└── README.md
```

## 🛠️ Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database operations
- **PostgreSQL** - Primary database
- **Redis** - Caching and session storage
- **Alembic** - Database migrations
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **Celery** - Background tasks

### Frontend
- **Angular 19** - Modern TypeScript framework
- **SCSS** - Styling
- **Angular Material** - UI components
- **RxJS** - Reactive programming

## 📋 Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 16+
- Redis 6+
- Git

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
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### Database Setup
```bash
# Start PostgreSQL
brew services start postgresql@16

# Create database
createdb -U dmreddy myappdb

# Run migrations
alembic upgrade head

# Seed initial data
python3 scripts/seed_data.py
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
DATABASE_URL=postgresql://username:password@localhost/myappdb

# Security
SECRET_KEY=your-super-secret-key-2024
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Redis
REDIS_URL=redis://localhost:6379

# Email (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

#### Authentication
- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout

#### User Management (Admin Only)
- `GET /api/v1/auth/users` - List users (product-scoped)
- `POST /api/v1/auth/admin/users` - Create user
- `PUT /api/v1/auth/admin/users/{id}` - Update user
- `DELETE /api/v1/auth/admin/users/{id}` - Delete user

#### Role Management (Admin Only)
- `GET /api/v1/auth/admin/roles` - List roles (product-scoped)
- `POST /api/v1/auth/admin/roles` - Create role
- `PUT /api/v1/auth/admin/roles/{id}` - Update role
- `DELETE /api/v1/auth/admin/roles/{id}` - Delete role

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
- Auto-generates `product_id`
- Creates default roles (admin, manager, user)
- Assigns admin role to first user

### 2. Admin Creates Team Members
```json
POST /api/v1/auth/admin/users
{
  "email": "employee@company.com",
  "first_name": "Employee",
  "last_name": "User",
  "password": "Password123",
  "role_id": 11,
  "product_id": "auto-generated-product-id"
}
```

### 3. Data Isolation
- All operations are scoped to `product_id`
- Users can only access data from their product
- Complete tenant isolation

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
1. Set up production database
2. Configure environment variables
3. Run database migrations
4. Build frontend for production
5. Deploy to your preferred hosting platform

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team

## 🔄 Version History

- **v1.0.0** - Initial release with multi-tenant architecture
- **v1.1.0** - Added role-based access control
- **v1.2.0** - Enhanced security features

---

**Built with ❤️ for scalable inventory management** 