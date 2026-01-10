# Contractor System Testing Guide

Quick guide to test the contractor and request system implementation.

---

## Prerequisites

1. **Database is migrated:**
   ```bash
   cd /Users/iuriesula/CD-App/fcapp
   npx prisma migrate status
   # Should show: "Database schema is up to date!"
   ```

2. **Development server is running:**
   ```bash
   npm run dev
   ```

3. **You have an agency_admin account** to test contractor management

---

## Test Scenario 1: Create IT Contractor

### Step 1: Login as agency_admin

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }' \
  -c cookies.txt
```

### Step 2: Get list of dealerships

```bash
curl http://localhost:3000/api/dealerships \
  -b cookies.txt
```

Save a dealership ID for the next step.

### Step 3: Create IT contractor

```bash
curl -X POST http://localhost:3000/api/contractors \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "John IT Support",
    "email": "john.it@contractor.com",
    "password": "password123",
    "contractorDepartment": "it",
    "dealershipIds": ["DEALERSHIP_ID_HERE"]
  }'
```

**Expected Response:**
```json
{
  "contractor": {
    "id": "contractor-uuid",
    "name": "John IT Support",
    "email": "john.it@contractor.com",
    "contractorDepartment": "it",
    "contractorDealerships": [...]
  }
}
```

### Step 4: Verify contractor was created

```bash
curl http://localhost:3000/api/contractors \
  -b cookies.txt
```

---

## Test Scenario 2: Dealership User Creates Request

### Step 1: Login as dealership manager/user

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@dealership.com",
    "password": "your_password"
  }' \
  -c cookies_dealership.txt
```

### Step 2: Create IT request

```bash
curl -X POST http://localhost:3000/api/requests \
  -H "Content-Type: application/json" \
  -b cookies_dealership.txt \
  -d '{
    "dealershipId": "YOUR_DEALERSHIP_ID",
    "department": "it",
    "title": "Email server not responding",
    "description": "Our SMTP server stopped working this morning. Cannot send emails to customers.",
    "priority": "urgent"
  }'
```

**Expected Response:**
```json
{
  "request": {
    "id": "request-uuid",
    "department": "it",
    "title": "Email server not responding",
    "status": "open",
    "priority": "urgent",
    "assignedTo": null
  }
}
```

### Step 3: View all requests

```bash
curl http://localhost:3000/api/requests \
  -b cookies_dealership.txt
```

---

## Test Scenario 3: Assign Request to Contractor

### Step 1: Login as manager (if not already)

```bash
# Use cookies_dealership.txt from previous scenario
```

### Step 2: Assign request to contractor

```bash
curl -X PUT http://localhost:3000/api/requests/REQUEST_ID/assign \
  -H "Content-Type: application/json" \
  -b cookies_dealership.txt \
  -d '{
    "contractorId": "CONTRACTOR_ID_FROM_STEP_1"
  }'
```

**Expected Response:**
```json
{
  "request": {
    "id": "request-uuid",
    "status": "in_progress",
    "assignedTo": {
      "id": "contractor-uuid",
      "name": "John IT Support",
      "contractorDepartment": "it"
    }
  }
}
```

**Note:** Status automatically changes to "in_progress" when assigned!

---

## Test Scenario 4: Contractor Responds to Request

### Step 1: Login as contractor

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.it@contractor.com",
    "password": "password123"
  }' \
  -c cookies_contractor.txt
```

### Step 2: View assigned requests

```bash
curl 'http://localhost:3000/api/requests?assignedToMe=true' \
  -b cookies_contractor.txt
```

### Step 3: Get request details

```bash
curl http://localhost:3000/api/requests/REQUEST_ID \
  -b cookies_contractor.txt
```

### Step 4: Add message to conversation

```bash
curl -X POST http://localhost:3000/api/requests/REQUEST_ID/messages \
  -H "Content-Type: application/json" \
  -b cookies_contractor.txt \
  -d '{
    "message": "I have identified the issue. The SMTP password expired. I am updating it now."
  }'
```

### Step 5: Add another message

```bash
curl -X POST http://localhost:3000/api/requests/REQUEST_ID/messages \
  -H "Content-Type: application/json" \
  -b cookies_contractor.txt \
  -d '{
    "message": "SMTP password has been updated. Please test sending an email now."
  }'
```

### Step 6: Mark request as resolved

```bash
curl -X PUT http://localhost:3000/api/requests/REQUEST_ID/status \
  -H "Content-Type: application/json" \
  -b cookies_contractor.txt \
  -d '{
    "status": "resolved"
  }'
```

---

## Test Scenario 5: Dealership User Closes Request

### Step 1: View conversation

```bash
curl http://localhost:3000/api/requests/REQUEST_ID \
  -b cookies_dealership.txt
```

**Expected Response:**
```json
{
  "request": {
    "id": "...",
    "status": "resolved",
    "messages": [
      {
        "id": "...",
        "message": "I have identified the issue...",
        "user": {
          "name": "John IT Support"
        },
        "createdAt": "..."
      },
      {
        "id": "...",
        "message": "SMTP password has been updated...",
        "user": {
          "name": "John IT Support"
        },
        "createdAt": "..."
      }
    ]
  }
}
```

### Step 2: Add confirmation message

```bash
curl -X POST http://localhost:3000/api/requests/REQUEST_ID/messages \
  -H "Content-Type: application/json" \
  -b cookies_dealership.txt \
  -d '{
    "message": "Tested and confirmed working. Thank you!"
  }'
```

### Step 3: Close the request

```bash
curl -X PUT http://localhost:3000/api/requests/REQUEST_ID/status \
  -H "Content-Type: application/json" \
  -b cookies_dealership.txt \
  -d '{
    "status": "closed"
  }'
```

**Expected:** `closedAt` timestamp should be set.

---

## Test Scenario 6: Multi-Dealership Contractor

### Step 1: Assign contractor to multiple dealerships

```bash
curl -X POST http://localhost:3000/api/contractors/CONTRACTOR_ID/dealerships \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "dealershipIds": ["dealership-1-id", "dealership-2-id", "dealership-3-id"]
  }'
```

### Step 2: Verify contractor can see requests from all dealerships

```bash
curl http://localhost:3000/api/requests \
  -b cookies_contractor.txt
```

**Expected:** Should see requests from all 3 assigned dealerships (filtered by IT department).

### Step 3: Remove access to one dealership

```bash
curl -X DELETE http://localhost:3000/api/contractors/CONTRACTOR_ID/dealerships/dealership-2-id \
  -b cookies.txt
```

### Step 4: Verify contractor can no longer see requests from removed dealership

```bash
curl http://localhost:3000/api/requests \
  -b cookies_contractor.txt
```

---

## Test Scenario 7: Permission Validation

### Test 1: Contractor cannot view wrong department requests

**Setup:**
- Create Marketing contractor
- Create IT request
- Login as Marketing contractor

**Test:**
```bash
curl http://localhost:3000/api/requests/IT_REQUEST_ID \
  -b cookies_marketing_contractor.txt
```

**Expected:** 403 Forbidden

### Test 2: Contractor cannot view requests from unassigned dealership

**Setup:**
- Contractor assigned to Dealership A
- Request created in Dealership B (same department)

**Test:**
```bash
curl http://localhost:3000/api/requests/DEALERSHIP_B_REQUEST_ID \
  -b cookies_contractor.txt
```

**Expected:** 403 Forbidden

### Test 3: Only managers can assign requests

**Setup:**
- Login as salesperson (not manager)

**Test:**
```bash
curl -X PUT http://localhost:3000/api/requests/REQUEST_ID/assign \
  -H "Content-Type: application/json" \
  -b cookies_salesperson.txt \
  -d '{
    "contractorId": "contractor-id"
  }'
```

**Expected:** 403 Forbidden

### Test 4: Cannot assign contractor to wrong department request

**Setup:**
- IT contractor
- Marketing request

**Test:**
```bash
curl -X PUT http://localhost:3000/api/requests/MARKETING_REQUEST_ID/assign \
  -H "Content-Type: application/json" \
  -b cookies_dealership.txt \
  -d '{
    "contractorId": "IT_CONTRACTOR_ID"
  }'
```

**Expected:** 400 Bad Request with error "Contractor department does not match request department"

---

## Test Scenario 8: Department-Based Filtering

### Test 1: IT contractor sees only IT requests

```bash
# Create requests in different departments
curl -X POST http://localhost:3000/api/requests \
  -H "Content-Type: application/json" \
  -b cookies_dealership.txt \
  -d '{"dealershipId": "xxx", "department": "it", "title": "IT Request", "description": "..."}'

curl -X POST http://localhost:3000/api/requests \
  -H "Content-Type: application/json" \
  -b cookies_dealership.txt \
  -d '{"dealershipId": "xxx", "department": "marketing", "title": "Marketing Request", "description": "..."}'

# Login as IT contractor and list requests
curl http://localhost:3000/api/requests \
  -b cookies_it_contractor.txt
```

**Expected:** Only IT requests visible.

---

## Database Verification

### Check contractor in database

```sql
SELECT
  id, name, email, role, contractor_department, is_active
FROM users
WHERE role = 'contractor';
```

### Check dealership assignments

```sql
SELECT
  cda.id,
  u.name AS contractor_name,
  d.name AS dealership_name,
  cda.assigned_at
FROM contractor_dealership_access cda
JOIN users u ON cda.contractor_id = u.id
JOIN dealerships d ON cda.dealership_id = d.id;
```

### Check requests

```sql
SELECT
  r.id,
  r.title,
  r.department,
  r.status,
  r.priority,
  d.name AS dealership,
  creator.name AS created_by,
  contractor.name AS assigned_to
FROM requests r
JOIN dealerships d ON r.dealership_id = d.id
LEFT JOIN users creator ON r.requested_by_id = creator.id
LEFT JOIN users contractor ON r.assigned_to_id = contractor.id
ORDER BY r.created_at DESC;
```

### Check messages count per request

```sql
SELECT
  r.id,
  r.title,
  COUNT(rm.id) AS message_count
FROM requests r
LEFT JOIN request_messages rm ON r.id = rm.request_id
GROUP BY r.id, r.title;
```

---

## Common Issues & Troubleshooting

### Issue: "Contractor not found" error
**Solution:** Verify contractor exists and has role='contractor'
```bash
curl http://localhost:3000/api/contractors -b cookies.txt
```

### Issue: 403 Forbidden when creating contractor
**Solution:** Only agency_admin can create contractors. Verify your user role:
```bash
curl http://localhost:3000/api/auth/me -b cookies.txt
```

### Issue: Cannot assign contractor to request
**Possible causes:**
1. Contractor department doesn't match request department
2. Contractor doesn't have access to the dealership
3. Contractor is inactive
4. User doesn't have manager or agency_admin role

**Debug:**
```bash
# Check contractor details
curl http://localhost:3000/api/contractors/CONTRACTOR_ID -b cookies.txt

# Check request details
curl http://localhost:3000/api/requests/REQUEST_ID -b cookies.txt
```

### Issue: Contractor sees no requests
**Possible causes:**
1. No dealerships assigned to contractor
2. No requests in contractor's department
3. Requests exist but in different department

**Debug:**
```bash
# Check contractor's dealerships
curl http://localhost:3000/api/contractors/CONTRACTOR_ID/dealerships -b cookies.txt

# List all requests (as admin)
curl http://localhost:3000/api/requests -b cookies_admin.txt
```

---

## Next Steps

After verifying the backend works:

1. **Build Frontend UI:**
   - Contractor management page (admin)
   - Request creation form (dealership users)
   - Request list and detail views
   - Conversation thread UI
   - File upload interface

2. **Add Real-time Features:**
   - WebSocket for live message updates
   - Push notifications for new requests/messages
   - Typing indicators

3. **Add Email Notifications:**
   - New request assigned notification
   - New message notification
   - Request status change notification

4. **Add Analytics:**
   - Request resolution time
   - Contractor performance metrics
   - Department workload distribution

---

**Testing Completed:** Once all scenarios pass ✅
