# Station Manager API

A comprehensive TypeScript REST API for managing backup operations, station monitoring, and user administration with comprehensive audit logging.

## 🚀 Features

### Core Functionality
- **User Management** - Complete CRUD operations with role-based access control
- **Station Management** - Track and manage backup stations with detailed profiles
- **Backup Operations** - Monitor backup status, history, and bulk operations
- **Backup Reminders** - Automated reminder system for overdue backups
- **Audit Logging** - Comprehensive activity tracking for all user actions

### Security & Authentication
- JWT-based authentication
- Role-based authorization (Admin, Manager)
- Password hashing with bcrypt
- Rate limiting and security headers
- Input validation with Joi

### Technical Features
- **TypeScript** for type safety
- **Sequelize ORM** with MySQL database
- **Express.js** framework
- **Comprehensive error handling**
- **Database migrations and seeders**
- **RESTful API design**

## 📋 Prerequisites

- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MushiEric/Station-Manager.git
   cd Station-Manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=backup_manager_dev
   
   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=24h
   
   # Security
   BCRYPT_ROUNDS=12
   
   # Server
   PORT=3000
   NODE_ENV=development
   ```

4. **Database Setup**
   ```bash
   # Run migrations to create tables
   npm run db:migrate
   
   # Seed initial data (admin and manager users)
   npm run db:seed
   ```

## 🗄️ Default Users

After running the seeders, you'll have these default users:

**Admin User:**
- Username: `eric.mushi`
- Password: `123456`
- Role: `admin`

**Manager User:**
- Username: `hans.mushi`
- Password: `123456`
- Role: `manager`

## 🚀 Running the Application

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The API will be available at `http://localhost:3000`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/change-password` - Change user password

### User Management
- `GET /api/users` - Get all users (with pagination)
- `POST /api/users` - Create new user
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user
- `POST /api/users/:id/reset-password` - Reset user password

### Role Management
- `GET /api/roles` - Get all roles
- `POST /api/roles` - Create new role
- `GET /api/roles/:id` - Get role by ID
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Deactivate role

### Station Management
- `GET /api/stations` - Get all stations (with pagination)
- `POST /api/stations` - Create new station
- `GET /api/stations/:id` - Get station by ID
- `PUT /api/stations/:id` - Update station
- `DELETE /api/stations/:id` - Delete station

### Profile Management
- `GET /api/profiles` - Get all profiles
- `POST /api/profiles` - Create new profile
- `GET /api/profiles/:id` - Get profile by ID
- `PUT /api/profiles/:id` - Update profile
- `DELETE /api/profiles/:id` - Delete profile

### Backup Management
- `GET /api/backups` - Get all backups (with filtering)
- `POST /api/backups` - Create new backup record
- `GET /api/backups/:id` - Get backup by ID
- `PUT /api/backups/:id` - Update backup
- `DELETE /api/backups/:id` - Delete backup
- `POST /api/backups/bulk-update` - Bulk update backup status
- `GET /api/backups/statistics` - Get backup statistics

### Backup Reminders
- `GET /api/backup-reminders` - Get all reminders
- `POST /api/backup-reminders` - Create new reminder
- `GET /api/backup-reminders/:id` - Get reminder by ID
- `PUT /api/backup-reminders/:id` - Update reminder
- `DELETE /api/backup-reminders/:id` - Delete reminder
- `POST /api/backup-reminders/:id/resolve` - Mark reminder as resolved
- `GET /api/backup-reminders/overdue` - Get overdue reminders
- `GET /api/backup-reminders/statistics` - Get reminder statistics

### Audit Logs
- `GET /api/audit-logs` - Get audit logs (with filtering)
- `GET /api/audit-logs/:id` - Get audit log by ID
- `GET /api/audit-logs/statistics` - Get audit statistics

## 🛡️ Security Features

- **JWT Authentication** - Secure token-based authentication
- **Role-based Authorization** - Different access levels for admin and manager roles
- **Password Security** - Bcrypt hashing with configurable rounds
- **Rate Limiting** - Protection against brute force attacks
- **Input Validation** - Comprehensive validation using Joi
- **SQL Injection Protection** - Sequelize ORM provides protection
- **Security Headers** - Helmet.js for security headers

## 📊 Audit Logging

The system tracks all important user actions:

- User registration, login, logout
- User management (create, update, delete, password reset)
- Role management operations
- Station management operations
- Profile management operations  
- Backup operations and status changes
- Backup reminder operations

Each audit log entry includes:
- User who performed the action
- Action type and target
- Timestamp
- IP address
- Target resource ID

## 🏗️ Database Schema

The application uses the following main entities:

- **Users** - System users with roles
- **Roles** - User permission levels
- **Stations** - Backup stations being monitored
- **Profiles** - Detailed station configuration
- **Backups** - Backup operation records
- **BackupReminders** - Reminder system for overdue backups
- **AuditLogs** - System activity tracking

## 🧪 Database Commands

```bash
# Run migrations
npm run db:migrate

# Undo last migration
npm run db:migrate:undo

# Run all seeders
npm run db:seed

# Undo all seeders
npm run db:seed:undo

# Setup database (migrate + seed)
npm run db:setup
```

## 🔧 Development

Built with:
- **TypeScript** - Type safety and modern JavaScript features
- **Express.js** - Fast, unopinionated web framework
- **Sequelize** - Promise-based ORM for Node.js
- **MySQL** - Reliable relational database
- **Joi** - Schema validation
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT implementation

## 📝 License

This project is licensed under the ISC License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For questions or support, please contact the development team.
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=backup_manager_dev
   
   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=24h
   
   # Security
   BCRYPT_ROUNDS=12
   
   # Server
   PORT=3000
   NODE_ENV=development
   ```

4. **Database Setup**
   ```bash
   # Run migrations to create tables
   npm run db:migrate
   
   # Seed initial data (admin and manager users)
   npm run db:seed
   ```

## 🗄️ Default Users

After running the seeders, you'll have these default users:

**Admin User:**
- Username: `eric.mushi`
- Password: `123456`
- Role: `admin`

**Manager User:**
- Username: `hans.mushi`
- Password: `123456`
- Role: `manager`

## 🚀 Running the Application

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The API will be available at `http://localhost:3000`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/change-password` - Change user password

### User Management
- `GET /api/users` - Get all users (with pagination)
- `POST /api/users` - Create new user
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user
- `POST /api/users/:id/reset-password` - Reset user password

### Role Management
- `GET /api/roles` - Get all roles
- `POST /api/roles` - Create new role
- `GET /api/roles/:id` - Get role by ID
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Deactivate role

### Station Management
- `GET /api/stations` - Get all stations (with pagination)
- `POST /api/stations` - Create new station
- `GET /api/stations/:id` - Get station by ID
- `PUT /api/stations/:id` - Update station
- `DELETE /api/stations/:id` - Delete station

### Profile Management
- `GET /api/profiles` - Get all profiles
- `POST /api/profiles` - Create new profile
- `GET /api/profiles/:id` - Get profile by ID
- `PUT /api/profiles/:id` - Update profile
- `DELETE /api/profiles/:id` - Delete profile

### Backup Management
- `GET /api/backups` - Get all backups (with filtering)
- `POST /api/backups` - Create new backup record
- `GET /api/backups/:id` - Get backup by ID
- `PUT /api/backups/:id` - Update backup
- `DELETE /api/backups/:id` - Delete backup
- `POST /api/backups/bulk-update` - Bulk update backup status
- `GET /api/backups/statistics` - Get backup statistics

### Backup Reminders
- `GET /api/backup-reminders` - Get all reminders
- `POST /api/backup-reminders` - Create new reminder
- `GET /api/backup-reminders/:id` - Get reminder by ID
- `PUT /api/backup-reminders/:id` - Update reminder
- `DELETE /api/backup-reminders/:id` - Delete reminder
- `POST /api/backup-reminders/:id/resolve` - Mark reminder as resolved
- `GET /api/backup-reminders/overdue` - Get overdue reminders
- `GET /api/backup-reminders/statistics` - Get reminder statistics

### Audit Logs
- `GET /api/audit-logs` - Get audit logs (with filtering)
- `GET /api/audit-logs/:id` - Get audit log by ID
- `GET /api/audit-logs/statistics` - Get audit statistics

## 🛡️ Security Features

- **JWT Authentication** - Secure token-based authentication
- **Role-based Authorization** - Different access levels for admin and manager roles
- **Password Security** - Bcrypt hashing with configurable rounds
- **Rate Limiting** - Protection against brute force attacks
- **Input Validation** - Comprehensive validation using Joi
- **SQL Injection Protection** - Sequelize ORM provides protection
- **Security Headers** - Helmet.js for security headers

## 📊 Audit Logging

The system tracks all important user actions:

- User registration, login, logout
- User management (create, update, delete, password reset)
- Role management operations
- Station management operations
- Profile management operations  
- Backup operations and status changes
- Backup reminder operations

Each audit log entry includes:
- User who performed the action
- Action type and target
- Timestamp
- IP address
- Target resource ID

## 🏗️ Database Schema

The application uses the following main entities:

- **Users** - System users with roles
- **Roles** - User permission levels
- **Stations** - Backup stations being monitored
- **Profiles** - Detailed station configuration
- **Backups** - Backup operation records
- **BackupReminders** - Reminder system for overdue backups
- **AuditLogs** - System activity tracking

## 🧪 Database Commands

```bash
# Run migrations
npm run db:migrate

# Undo last migration
npm run db:migrate:undo

# Run all seeders
npm run db:seed

# Undo all seeders
npm run db:seed:undo

# Setup database (migrate + seed)
npm run db:setup
```

## 🔧 Development

Built with:
- **TypeScript** - Type safety and modern JavaScript features
- **Express.js** - Fast, unopinionated web framework
- **Sequelize** - Promise-based ORM for Node.js
- **MySQL** - Reliable relational database
- **Joi** - Schema validation
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT implementation

## 📝 License

This project is licensed under the ISC License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For questions or support, please contact the development team.
=======
# Station-Manager
this repo for fuel stations management
>>>>>>> 488ee35008e93a7ece5c724e53fd7cee20fbefc9
