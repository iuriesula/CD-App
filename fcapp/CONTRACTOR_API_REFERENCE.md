# Contractor System API Reference

Quick reference guide for all contractor and request/ticket system endpoints.

---

## Authentication

All endpoints require authentication via JWT token in the `auth-token` cookie.

---

## Contractor Management

### List Contractors
```http
GET /api/contractors?department=it&dealershipId=xxx
```
**Permission:** agency_admin only
**Query Params:**
- `department` (optional): Filter by contractor department (it, marketing, content)
- `dealershipId` (optional): Filter by dealership assignment

**Response:**
```json
{
  "contractors": [...]
}
```

---

### Create Contractor
```http
POST /api/contractors
```
**Permission:** agency_admin only
**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secure_password",
  "contractorDepartment": "it",
  "dealershipIds": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "contractor": {...}
}
```

---

### Get Contractor Details
```http
GET /api/contractors/:id
```
**Permission:** agency_admin only

**Response:**
```json
{
  "contractor": {
    "id": "...",
    "name": "...",
    "contractorDealerships": [...],
    "requestsAssigned": [...]
  }
}
```

---

### Update Contractor
```http
PUT /api/contractors/:id
```
**Permission:** agency_admin only
**Body:**
```json
{
  "name": "John Doe Updated",
  "email": "newemail@example.com",
  "contractorDepartment": "marketing",
  "isActive": false
}
```

---

### Delete Contractor
```http
DELETE /api/contractors/:id
```
**Permission:** agency_admin only

**Response:**
```json
{
  "success": true
}
```

---

## Contractor-Dealership Assignment

### Assign Dealerships
```http
POST /api/contractors/:id/dealerships
```
**Permission:** agency_admin only
**Body:**
```json
{
  "dealershipIds": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "accesses": [...]
}
```

---

### Get Contractor Dealerships
```http
GET /api/contractors/:id/dealerships
```
**Permission:** agency_admin only

**Response:**
```json
{
  "accesses": [...]
}
```

---

### Remove Dealership Access
```http
DELETE /api/contractors/:id/dealerships/:dealershipId
```
**Permission:** agency_admin only

**Response:**
```json
{
  "success": true
}
```

---

## Request Management

### List Requests
```http
GET /api/requests?dealershipId=xxx&status=open&department=it&assignedToMe=true
```
**Permission:** Based on role
- Contractors: See requests in their department for assigned dealerships
- Dealership users: See their dealership's requests
- Agency admin: See all requests

**Query Params:**
- `dealershipId` (optional): Filter by dealership
- `status` (optional): Filter by status (open, in_progress, resolved, closed)
- `department` (optional): Filter by department (it, marketing, content)
- `assignedToMe` (optional): Show only assigned to current user (boolean)

**Response:**
```json
{
  "requests": [...]
}
```

---

### Create Request
```http
POST /api/requests
```
**Permission:** salesperson, manager, tech, content_creator
**Body:**
```json
{
  "dealershipId": "uuid",
  "department": "it",
  "title": "Email server issue",
  "description": "Detailed description...",
  "priority": "urgent"
}
```

**Response:**
```json
{
  "request": {...}
}
```

---

### Get Request Details
```http
GET /api/requests/:id
```
**Permission:** Based on role and request
- Request creator
- Assigned contractor
- Contractors in same department (with dealership access)
- Dealership managers

**Response:**
```json
{
  "request": {
    "id": "...",
    "messages": [...],
    "attachments": [...]
  }
}
```

---

### Update Request
```http
PUT /api/requests/:id
```
**Permission:** Request creator or agency_admin
**Body:**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "priority": "high"
}
```

---

### Delete Request
```http
DELETE /api/requests/:id
```
**Permission:** Request creator or agency_admin

**Response:**
```json
{
  "success": true
}
```

---

### Update Request Status
```http
PUT /api/requests/:id/status
```
**Permission:** Assigned contractor, request creator, or agency_admin
**Body:**
```json
{
  "status": "resolved"
}
```

**Note:** Setting status to "resolved" or "closed" automatically sets `closedAt` timestamp.

---

### Assign Request to Contractor
```http
PUT /api/requests/:id/assign
```
**Permission:** manager or agency_admin
**Body:**
```json
{
  "contractorId": "uuid"
}
```

**Note:**
- Status automatically changes to "in_progress" when assigned
- Set `contractorId` to `null` to unassign
- Validates contractor department matches request department
- Validates contractor has access to the dealership

---

## Request Messages

### Get Messages
```http
GET /api/requests/:id/messages
```
**Permission:** Anyone who can view the request

**Response:**
```json
{
  "messages": [
    {
      "id": "...",
      "message": "...",
      "isRead": true,
      "user": {...},
      "attachments": [...]
    }
  ]
}
```

---

### Add Message
```http
POST /api/requests/:id/messages
```
**Permission:** Anyone who can view the request
**Body:**
```json
{
  "message": "This is my reply..."
}
```

**Response:**
```json
{
  "message": {...}
}
```

---

### Mark Message as Read
```http
PUT /api/requests/:id/messages/:messageId/read
```
**Permission:** Authenticated user

**Response:**
```json
{
  "message": {...}
}
```

---

## Request Attachments

### Upload Attachment
```http
POST /api/requests/:id/attachments
```
**Permission:** Anyone who can view the request
**Body:**
```json
{
  "messageId": "uuid",
  "fileName": "screenshot.png",
  "fileUrl": "/uploads/...",
  "mimeType": "image/png",
  "size": 125000
}
```

**Note:**
- `messageId` is optional - omit to attach directly to request
- File must be uploaded separately (via media endpoint)
- This endpoint records the attachment metadata

**Response:**
```json
{
  "attachment": {...}
}
```

---

### Get Attachments
```http
GET /api/requests/:id/attachments
```
**Permission:** Anyone who can view the request

**Response:**
```json
{
  "attachments": [...]
}
```

---

### Delete Attachment
```http
DELETE /api/requests/:id/attachments/:attachmentId
```
**Permission:** Anyone who can view the request

**Response:**
```json
{
  "success": true
}
```

---

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Error message"
}
```

**Common Status Codes:**
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `400` - Bad Request (validation error)
- `409` - Conflict (e.g., duplicate email)
- `500` - Internal Server Error

---

## Department Permissions

### IT Contractors
Can access: settings, users, media, email, inventory, dealership_config

### Marketing Contractors
Can access: leads, email_templates, media

### Content Contractors
Can access: media, inventory

---

## Request Workflow

1. **Dealership user creates request** → `POST /api/requests`
2. **Manager assigns to contractor** → `PUT /api/requests/:id/assign`
3. **Status auto-updates to "in_progress"**
4. **Contractor and requester exchange messages** → `POST /api/requests/:id/messages`
5. **Contractor resolves issue** → `PUT /api/requests/:id/status` (status: "resolved")
6. **Requester closes ticket** → `PUT /api/requests/:id/status` (status: "closed")

---

## Example Use Cases

### Create IT Contractor and Assign to 2 Dealerships
```bash
# 1. Create contractor
curl -X POST /api/contractors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech Support Dave",
    "email": "dave@techsupport.com",
    "password": "secure123",
    "contractorDepartment": "it",
    "dealershipIds": ["dealership-1-uuid", "dealership-2-uuid"]
  }'
```

### Dealership User Creates Urgent IT Request
```bash
curl -X POST /api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "dealershipId": "dealership-1-uuid",
    "department": "it",
    "title": "Email server down",
    "description": "Cannot send emails since this morning",
    "priority": "urgent"
  }'
```

### Manager Assigns Request to Contractor
```bash
curl -X PUT /api/requests/request-uuid/assign \
  -H "Content-Type: application/json" \
  -d '{
    "contractorId": "contractor-uuid"
  }'
```

### Contractor Adds Response
```bash
curl -X POST /api/requests/request-uuid/messages \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I've identified the issue. Working on it now."
  }'
```

### Contractor Resolves Issue
```bash
curl -X PUT /api/requests/request-uuid/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved"
  }'
```

---

**Last Updated:** December 22, 2024
