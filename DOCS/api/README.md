# API Documentation

This document provides comprehensive information about the OpenAero Web API endpoints, authentication, and usage examples.

## Table of Contents

- [Authentication](#authentication)
- [Base URL](#base-url)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Authentication](#authentication-endpoints)
  - [Users](#users)
  - [Projects](#projects)
  - [Metrics](#metrics)
  - [Health Check](#health-check)
- [WebSocket API](#websocket-api)
- [SDK Examples](#sdk-examples)

## Authentication

The API uses NextAuth.js for authentication with support for multiple providers:

- **Email/Password**: Traditional email and password authentication
- **OAuth Providers**: Google, GitHub, and other configured providers
- **JWT Tokens**: For API access and session management

### Authentication Headers

```http
Authorization: Bearer <jwt_token>
```

### Session-based Authentication

For web applications, authentication is handled via HTTP-only cookies set by NextAuth.js.

## Base URL

```
Production: https://openaero.example.com/api
Development: http://localhost:3000/api
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authenticated users**: 1000 requests per hour
- **Unauthenticated users**: 100 requests per hour
- **Admin users**: 5000 requests per hour

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  },
  "timestamp": "2023-12-01T10:00:00Z"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Endpoints

### Authentication Endpoints

#### POST /api/auth/signin

Sign in with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "USER"
  },
  "token": "jwt_token"
}
```

#### POST /api/auth/signup

Create a new user account.

**Request:**
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "USER"
  },
  "message": "Account created successfully"
}
```

#### POST /api/auth/signout

Sign out the current user.

**Response:**
```json
{
  "message": "Signed out successfully"
}
```

#### POST /api/auth/forgot-password

Request password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Password reset email sent"
}
```

#### POST /api/auth/reset-password

Reset password with token.

**Request:**
```json
{
  "token": "reset_token",
  "password": "new_password123"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

### Users

#### GET /api/users

Get list of users (Admin only).

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term
- `role` (optional): Filter by role

**Response:**
```json
{
  "users": [
    {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "role": "USER",
      "createdAt": "2023-12-01T10:00:00Z",
      "updatedAt": "2023-12-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

#### GET /api/users/[id]

Get user by ID.

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "USER",
    "profile": {
      "bio": "User bio",
      "avatar": "avatar_url",
      "location": "User location"
    },
    "createdAt": "2023-12-01T10:00:00Z",
    "updatedAt": "2023-12-01T10:00:00Z"
  }
}
```

#### PUT /api/users/[id]

Update user information.

**Request:**
```json
{
  "name": "Updated Name",
  "profile": {
    "bio": "Updated bio",
    "location": "Updated location"
  }
}
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "Updated Name",
    "role": "USER",
    "profile": {
      "bio": "Updated bio",
      "location": "Updated location"
    },
    "updatedAt": "2023-12-01T10:00:00Z"
  }
}
```

#### DELETE /api/users/[id]

Delete user (Admin only).

**Response:**
```json
{
  "message": "User deleted successfully"
}
```

### Projects

#### GET /api/projects

Get user's projects.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term
- `status` (optional): Filter by status

**Response:**
```json
{
  "projects": [
    {
      "id": "project_id",
      "name": "Project Name",
      "description": "Project description",
      "status": "ACTIVE",
      "userId": "user_id",
      "createdAt": "2023-12-01T10:00:00Z",
      "updatedAt": "2023-12-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

#### POST /api/projects

Create a new project.

**Request:**
```json
{
  "name": "New Project",
  "description": "Project description",
  "settings": {
    "visibility": "private",
    "features": ["feature1", "feature2"]
  }
}
```

**Response:**
```json
{
  "project": {
    "id": "project_id",
    "name": "New Project",
    "description": "Project description",
    "status": "ACTIVE",
    "userId": "user_id",
    "settings": {
      "visibility": "private",
      "features": ["feature1", "feature2"]
    },
    "createdAt": "2023-12-01T10:00:00Z",
    "updatedAt": "2023-12-01T10:00:00Z"
  }
}
```

#### GET /api/projects/[id]

Get project by ID.

**Response:**
```json
{
  "project": {
    "id": "project_id",
    "name": "Project Name",
    "description": "Project description",
    "status": "ACTIVE",
    "userId": "user_id",
    "settings": {
      "visibility": "private",
      "features": ["feature1", "feature2"]
    },
    "collaborators": [
      {
        "userId": "collaborator_id",
        "role": "EDITOR",
        "addedAt": "2023-12-01T10:00:00Z"
      }
    ],
    "createdAt": "2023-12-01T10:00:00Z",
    "updatedAt": "2023-12-01T10:00:00Z"
  }
}
```

#### PUT /api/projects/[id]

Update project.

**Request:**
```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "status": "ARCHIVED"
}
```

**Response:**
```json
{
  "project": {
    "id": "project_id",
    "name": "Updated Project Name",
    "description": "Updated description",
    "status": "ARCHIVED",
    "updatedAt": "2023-12-01T10:00:00Z"
  }
}
```

#### DELETE /api/projects/[id]

Delete project.

**Response:**
```json
{
  "message": "Project deleted successfully"
}
```

#### POST /api/projects/[id]/collaborators

Add collaborator to project.

**Request:**
```json
{
  "email": "collaborator@example.com",
  "role": "EDITOR"
}
```

**Response:**
```json
{
  "collaborator": {
    "userId": "collaborator_id",
    "projectId": "project_id",
    "role": "EDITOR",
    "addedAt": "2023-12-01T10:00:00Z"
  }
}
```

### Metrics

#### GET /api/metrics

Get Prometheus metrics (monitoring).

**Response:**
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1234

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 100
http_request_duration_seconds_bucket{le="0.5"} 200
http_request_duration_seconds_bucket{le="1.0"} 300
http_request_duration_seconds_bucket{le="+Inf"} 400
http_request_duration_seconds_sum 150.5
http_request_duration_seconds_count 400
```

#### POST /api/metrics/track

Track custom metrics.

**Request:**
```json
{
  "event": "user_action",
  "properties": {
    "action": "button_click",
    "component": "header",
    "value": 1
  },
  "timestamp": "2023-12-01T10:00:00Z"
}
```

**Response:**
```json
{
  "message": "Metric tracked successfully"
}
```

### Health Check

#### GET /api/health

Get system health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-12-01T10:00:00Z",
  "version": "1.0.0",
  "uptime": 86400,
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 15,
      "details": "Connected to PostgreSQL"
    },
    "redis": {
      "status": "healthy",
      "responseTime": 5,
      "details": "Connected to Redis"
    },
    "external_services": {
      "status": "healthy",
      "responseTime": 100,
      "details": "All external services responding"
    }
  },
  "metrics": {
    "memory": {
      "used": 512,
      "total": 1024,
      "percentage": 50
    },
    "cpu": {
      "usage": 25
    },
    "disk": {
      "used": 10240,
      "total": 51200,
      "percentage": 20
    }
  }
}
```

## WebSocket API

The application supports real-time communication via WebSocket connections.

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3000/api/ws')
```

### Authentication

Send authentication token after connection:

```javascript
ws.send(JSON.stringify({
  type: 'auth',
  token: 'jwt_token'
}))
```

### Message Format

```json
{
  "type": "message_type",
  "data": {
    "key": "value"
  },
  "timestamp": "2023-12-01T10:00:00Z"
}
```

### Supported Message Types

- `auth` - Authentication
- `project_update` - Project updates
- `user_status` - User status changes
- `notification` - Real-time notifications
- `metrics` - Real-time metrics updates

### Example Usage

```javascript
// Listen for project updates
ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  
  switch (message.type) {
    case 'project_update':
      console.log('Project updated:', message.data)
      break
    case 'notification':
      console.log('New notification:', message.data)
      break
  }
}

// Send project update
ws.send(JSON.stringify({
  type: 'project_update',
  data: {
    projectId: 'project_id',
    changes: {
      name: 'Updated Name'
    }
  }
}))
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { OpenAeroAPI } from '@openaero/sdk'

const api = new OpenAeroAPI({
  baseURL: 'https://openaero.example.com/api',
  token: 'your_jwt_token'
})

// Get projects
const projects = await api.projects.list({
  page: 1,
  limit: 10
})

// Create project
const newProject = await api.projects.create({
  name: 'My Project',
  description: 'Project description'
})

// Update project
const updatedProject = await api.projects.update('project_id', {
  name: 'Updated Name'
})
```

### Python

```python
from openaero_sdk import OpenAeroAPI

api = OpenAeroAPI(
    base_url='https://openaero.example.com/api',
    token='your_jwt_token'
)

# Get projects
projects = api.projects.list(page=1, limit=10)

# Create project
new_project = api.projects.create({
    'name': 'My Project',
    'description': 'Project description'
})

# Update project
updated_project = api.projects.update('project_id', {
    'name': 'Updated Name'
})
```

### cURL Examples

```bash
# Get projects
curl -X GET \
  -H "Authorization: Bearer your_jwt_token" \
  https://openaero.example.com/api/projects

# Create project
curl -X POST \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Project","description":"Project description"}' \
  https://openaero.example.com/api/projects

# Update project
curl -X PUT \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}' \
  https://openaero.example.com/api/projects/project_id
```

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

**Response Format:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Filtering and Sorting

Many endpoints support filtering and sorting:

**Query Parameters:**
- `search`: Search term
- `sort`: Sort field (e.g., `name`, `createdAt`)
- `order`: Sort order (`asc` or `desc`)
- `filter[field]`: Filter by field value

**Example:**
```
GET /api/projects?search=test&sort=createdAt&order=desc&filter[status]=ACTIVE
```

## Webhooks

Configure webhooks to receive real-time notifications:

### Webhook Events

- `user.created`
- `user.updated`
- `user.deleted`
- `project.created`
- `project.updated`
- `project.deleted`
- `project.collaborator.added`
- `project.collaborator.removed`

### Webhook Payload

```json
{
  "event": "project.created",
  "data": {
    "project": {
      "id": "project_id",
      "name": "Project Name",
      "userId": "user_id"
    }
  },
  "timestamp": "2023-12-01T10:00:00Z",
  "signature": "webhook_signature"
}
```

### Webhook Verification

Verify webhook signatures using HMAC-SHA256:

```javascript
const crypto = require('crypto')

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  return signature === `sha256=${expectedSignature}`
}
```

## Support

For API support and questions:

- Documentation: [https://docs.openaero.example.com](https://docs.openaero.example.com)
- Support Email: support@openaero.example.com
- GitHub Issues: [https://github.com/openaero/web/issues](https://github.com/openaero/web/issues)