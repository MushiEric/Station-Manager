# Backup Manager API

## Authentication Endpoints

### POST /api/auth/register
Register a new user with auto-generated username.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "password": "password123",
  "roleId": "uuid-of-role"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "username": "john.doe", // Auto-generated
      "status": "active",
      "roleId": "role-uuid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt-token"
  }
}
```

### POST /api/auth/login
Login with username and password.

**Request Body:**
```json
{
  "username": "john.doe",
  "password": "password123"
}
```

### GET /api/auth/profile
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

### PUT /api/auth/profile
Update user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith"
}
```

### PUT /api/auth/change-password
Change user password (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

## User Management Endpoints (Admin Only)

### POST /api/users
Create a new user (requires admin role).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "password": "password123",
  "roleId": "uuid-of-role",
  "status": "active"
}
```

### GET /api/users
Get all users with pagination and filtering (requires admin role).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Search in firstName, lastName, username
- `status` (optional): Filter by status (active/inactive)
- `roleId` (optional): Filter by role ID

**Example:** `GET /api/users?page=1&limit=10&search=john&status=active`

### GET /api/users/:id
Get user by ID (requires admin role).

### PUT /api/users/:id
Update user (requires admin role).

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "status": "inactive",
  "roleId": "new-role-uuid"
}
```

### DELETE /api/users/:id
Deactivate user (requires admin role).

### PUT /api/users/:id/reset-password
Reset user password (requires admin role).

**Request Body:**
```json
{
  "newPassword": "newpassword123"
}
```

## Role Management Endpoints (Admin Only)

### POST /api/roles
Create a new role (requires admin role).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "name": "Manager",
  "status": "active"
}
```

### GET /api/roles
Get all roles with pagination and filtering (requires admin role).

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Search in role name
- `status` (optional): Filter by status (active/inactive)

### GET /api/roles/:id
Get role by ID with associated users (requires admin role).

### PUT /api/roles/:id
Update role (requires admin role).

**Request Body:**
```json
{
  "name": "Senior Manager",
  "status": "active"
}
```

### DELETE /api/roles/:id
Deactivate role (requires admin role). Note: Cannot delete roles with active users.

## Station Management Endpoints (Technician/Admin Only)

### POST /api/stations
Create a new station (requires technician or admin role).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "stationName": "Main Terminal Station",
  "serialNumber": "SN001234",
  "location": "Building A, Floor 2"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Station created successfully",
  "data": {
    "station": {
      "id": "station-uuid",
      "stationName": "Main Terminal Station",
      "serialNumber": "SN001234",
      "location": "Building A, Floor 2",
      "createdBy": "user-uuid",
      "creator": {
        "id": "user-uuid",
        "firstName": "John",
        "lastName": "Doe",
        "username": "john.doe",
        "role": {
          "id": "role-uuid",
          "name": "technician"
        }
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### GET /api/stations
Get all stations with pagination and filtering (requires technician or admin role).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Search in station name, serial number, location
- `location` (optional): Filter by location
- `createdBy` (optional): Filter by creator user ID

**Example:** `GET /api/stations?page=1&limit=10&search=terminal&location=Building A`

### GET /api/stations/:id
Get station by ID with full details (requires technician or admin role).

**Response includes:**
- Station details
- Creator information
- Profile information (if exists)
- Recent backups (last 5)
- Unresolved backup reminders (next 5)

### PUT /api/stations/:id
Update station (requires technician or admin role).

**Request Body:**
```json
{
  "stationName": "Updated Station Name",
  "serialNumber": "SN001235",
  "location": "Building B, Floor 1"
}
```

### DELETE /api/stations/:id
Delete station (requires technician or admin role).

**Note:** Station can only be deleted if it has no associated:
- Backups
- Backup reminders
- Profile

### GET /api/stations/:id/stats
Get station statistics (requires technician or admin role).

**Response:**
```json
{
  "success": true,
  "data": {
    "stationId": "station-uuid",
    "stationName": "Main Terminal Station",
    "stats": {
      "backups": {
        "total": 150,
        "completed": 140,
        "failed": 8,
        "pending": 2,
        "successRate": "93.33"
      },
      "reminders": {
        "total": 25,
        "unresolved": 3,
        "resolved": 22
      },
      "lastBackup": {
        "id": "backup-uuid",
        "status": "completed",
        "lastBackupDate": "2024-01-01T00:00:00.000Z"
      }
    }
  }
}
```

## Profile Management Endpoints (Technician/Admin Only)

### POST /api/profiles
Create a new profile for a station (requires technician or admin role).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "stationId": "station-uuid",
  "phoneNumber": "0613334247",
  "anydeskId": "123456789",
  "anydeskPass": "password123",
  "teamviewerId": "987654321",
  "teamviewerPass": "tvpassword",
  "ptsPort": "3389",
  "ptsPassword": "ptspass123",
  "posUsername": "posuser",
  "posPassword": "pospass123",
  "cloudflareLink": "https://puma.advafuel.com"
}
```

**Validation Rules:**
- **phoneNumber**: Must start with 0 and be exactly 10 digits (e.g., 0613334247)
- **anydeskId**: Must be 9 or 10 digits (unique)
- **teamviewerId**: Must be 9 or 10 digits (unique)
- **ptsPort**: Must be unique across all profiles
- **cloudflareLink**: Must follow format https://stationname.advafuel.com
- **posUsername** and **posPassword**: Required but not unique

### GET /api/profiles
Get all profiles with pagination and filtering (requires technician or admin role).

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Search in station name, serial number, location
- `stationId` (optional): Filter by station ID

### GET /api/profiles/:id
Get profile by ID with station details (requires technician or admin role).

### GET /api/profiles/station/:stationId
Get profile by station ID (requires technician or admin role).

### PUT /api/profiles/:id
Update profile (requires technician or admin role).

**Request Body:** Same as create, all fields optional
**Note:** Uniqueness constraints still apply for ptsPort, anydeskId, teamviewerId

### DELETE /api/profiles/:id
Delete profile (requires technician or admin role).

## Backup Management Endpoints (Technician/Admin Only)

### POST /api/backups
Create a new backup record.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "stationId": "uuid-of-station",
  "status": "pending|completed|failed", // default: "pending"
  "lastBackupDate": "2024-01-01T12:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Backup created successfully",
  "data": {
    "backup": {
      "id": "backup-uuid",
      "stationId": "station-uuid",
      "status": "pending",
      "lastBackupDate": "2024-01-01T12:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "station": {
        "id": "station-uuid",
        "stationName": "Station A",
        "serialNumber": "SN123456",
        "location": "Office A",
        "creator": {
          "id": "user-uuid",
          "firstName": "John",
          "lastName": "Doe",
          "username": "john.doe"
        }
      }
    }
  }
}
```

### GET /api/backups
Get paginated list of backups with filtering.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `status`: Filter by status (pending|completed|failed)
- `stationId`: Filter by station UUID
- `startDate`: Filter backups from this date (ISO format)
- `endDate`: Filter backups until this date (ISO format)
- `search`: Search in station name, serial number, or location

### GET /api/backups/statistics
Get backup statistics and analytics.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `stationId`: Get statistics for specific station (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "total": 150,
      "completed": 140,
      "failed": 8,
      "pending": 2,
      "successRate": "93.33%"
    },
    "recent": {
      "totalLast30Days": 30,
      "completedLast30Days": 28,
      "successRateLast30Days": "93.33%"
    },
    "lastBackup": {
      "id": "backup-uuid",
      "status": "completed",
      "lastBackupDate": "2024-01-01T12:00:00.000Z",
      "stationId": "station-uuid",
      "station": {
        "id": "station-uuid",
        "stationName": "Station A",
        "serialNumber": "SN123456"
      }
    },
    "dailyStats": [
      {
        "date": "2024-01-01",
        "count": 5,
        "status": "completed"
      }
    ]
  }
}
```

### PATCH /api/backups/bulk-update-status
Bulk update backup status for multiple backups.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "backupIds": ["uuid1", "uuid2", "uuid3"],
  "status": "completed|failed|pending"
}
```

**Response:**
```json
{
  "success": true,
  "message": "3 backup(s) updated successfully",
  "data": {
    "updatedCount": 3,
    "newStatus": "completed"
  }
}
```

### GET /api/backups/station/:stationId
Get backups for a specific station.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `status`: Filter by status

**Response:** Returns paginated backups with station information.

### GET /api/backups/:id
Get backup by ID.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "backup": {
      "id": "backup-uuid",
      "stationId": "station-uuid",
      "status": "completed",
      "lastBackupDate": "2024-01-01T12:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "station": {
        "id": "station-uuid",
        "stationName": "Station A",
        "serialNumber": "SN123456",
        "location": "Office A",
        "creator": {
          "id": "user-uuid",
          "firstName": "John",
          "lastName": "Doe",
          "username": "john.doe",
          "role": {
            "id": "role-uuid",
            "name": "technician"
          }
        }
      }
    }
  }
}
```

### PATCH /api/backups/:id
Update backup.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "status": "completed|failed|pending",
  "lastBackupDate": "2024-01-01T12:00:00.000Z"
}
```

**Response:** Returns updated backup with station information.

### DELETE /api/backups/:id
Delete backup.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Backup deleted successfully"
}
```

## Username Generation Logic

The system automatically generates usernames by:
1. Converting first and last names to lowercase
2. Concatenating with a dot: `firstname.lastname`
3. If username exists, appending a counter: `firstname.lastname1`, `firstname.lastname2`, etc.

## Authorization

### Roles Required:
- **Admin Role**: Required for all user and role management endpoints
- **Technician Role**: Required for all station management endpoints (admin can also access)
- **Authentication**: All protected endpoints require valid JWT token

### Role-based Access Control:
- Only users with "admin" role can create, update, or delete users and roles
- Users with "technician" or "admin" roles can manage stations
- Regular users can only access their own profile and authentication endpoints

## Features Implemented

- ✅ User registration with auto-generated username
- ✅ Secure password hashing with bcrypt
- ✅ JWT authentication
- ✅ Input validation with Joi
- ✅ Role-based access control
- ✅ Profile management
- ✅ Password change functionality
- ✅ Admin-only user management (CRUD)
- ✅ Admin-only role management (CRUD)
- ✅ Technician/Admin station management (CRUD)
- ✅ Technician/Admin profile management (CRUD)
- ✅ Technician/Admin backup management (CRUD)
- ✅ Station statistics and analytics
- ✅ Backup statistics and analytics
- ✅ User pagination and filtering
- ✅ Role pagination and filtering
- ✅ Station pagination and filtering
- ✅ Profile pagination and filtering
- ✅ Backup pagination and filtering
- ✅ Backup date range filtering
- ✅ Bulk backup status updates
- ✅ Soft delete (deactivation)
- ✅ Database associations and integrity
- ✅ Serial number uniqueness validation
- ✅ Profile field uniqueness validation (PTS Port, AnyDesk ID, TeamViewer ID)
- ✅ Custom validation rules (phone format, Cloudflare URL format)
- ✅ Cascading delete protection
- ✅ Error handling
- ✅ Security middleware (helmet, cors, rate limiting)

## Getting Started

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and configure
3. Run migrations: `npx sequelize-cli db:migrate`
4. Start development server: `npm run dev`

The server will run on `http://localhost:3000`
