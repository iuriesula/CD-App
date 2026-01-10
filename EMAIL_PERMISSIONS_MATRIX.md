# Email Module Permissions Matrix

## Permission Summary by Role

### Signature & Template Operations

| Operation | Salesperson | Manager | Tech | Content Creator | Agency Admin | Contractor |
|-----------|:-----------:|:-------:|:---:|:---------------:|:-----------:|:---------:|
| **View Own Personal** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Dealership-Wide** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Create Personal** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Create Dealership-Wide** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Edit Own Personal** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Edit Dealership-Wide** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Delete Own Personal** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Delete Dealership-Wide** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Access `/email` Route** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Access `/settings/email`** | ❌ | ✅ | ❌ | ❌ | ✅ | N/A |

## API Permission Logic

### Email Signatures & Templates - POST (Create)
```
if NOT isPersonal:
  if role === "contractor":
    DENY (403)
  
ALLOW (201)
```

### Email Signatures & Templates - PUT/DELETE (Update/Delete)
```
if isDealershipWide:
  if role === "contractor":
    DENY (403)
else (isPersonal):
  if userId !== session.userId:
    if role NOT in ["manager", "agency_admin"]:
      DENY (403)

ALLOW (200)
```

## Sidebar Navigation Visibility

```
All Non-Contractor Users:
├─ My Day
├─ Pipeline
├─ All Leads
├─ Requests
├─ Inventory
├─ Media
└─ Email ✅ VISIBLE

Settings Section (Manager + Agency Admin only):
├─ Dealership
├─ Team Members
└─ Email ⚠️ MISSING FOR SALESPERSON

Admin Section (Agency Admin only):
├─ Analytics
├─ Dealerships
├─ All Users
└─ Contractors

Contractor Users (isolated nav):
└─ My Requests
```

## Contractor Department Permissions

From `src/lib/permissions.ts`:

```typescript
CONTRACTOR_PERMISSIONS = {
  it: [
    "settings",
    "users",
    "media",
    "email",              // ⚠️ Can access email but API blocks creation
    "inventory",
    "dealership_config",
  ],
  content: [
    "media",
    "inventory",
  ],
  marketing: [
    "leads",
    "email_templates",    // ⚠️ Listed but not enforced in API
    "media",
  ],
}
```

**Issue:** These permissions are defined but NOT checked in the email API routes.

## Access Path Analysis

### Salesperson Email Access Flow

```
Route: /email
├─ GET /api/email/signatures
│  └─ ✅ Works - List personal + dealership-wide
├─ GET /api/email/templates
│  └─ ✅ Works - List personal + dealership-wide
├─ POST /api/email/signatures
│  └─ ✅ Works - Can create personal or dealership-wide
├─ POST /api/email/templates
│  └─ ✅ Works - Can create personal or dealership-wide
└─ [Missing UI Link] /settings/email
   ├─ PUT /api/email/signatures/[id]
   │  └─ ✅ Works - Can edit dealership-wide
   ├─ DELETE /api/email/signatures/[id]
   │  └─ ✅ Works - Can delete dealership-wide
   ├─ PUT /api/email/templates/[id]
   │  └─ ✅ Works - Can edit dealership-wide
   └─ DELETE /api/email/templates/[id]
      └─ ✅ Works - Can delete dealership-wide
```

## Role Definition Source

From `prisma/schema.prisma` enum UserRole:
- `salesperson` - Default dealership user
- `manager` - Dealership management
- `tech` - Dealership technical staff
- `content_creator` - Dealership content staff
- `agency_admin` - System administrator across agencies
- `contractor` - External contractors with limited access

## Key Findings

### API Layer ✅ READY
- Salespeople HAVE full permissions to create/edit/delete personal and dealership-wide signatures/templates
- Contractors are properly restricted from dealership-wide item management
- Personal items are properly scoped by userId
- All CRUD operations work as intended

### UI Layer ⚠️ INCOMPLETE
- Sidebar only shows `/settings/email` to managers and agency admins
- Salespeople should be able to access this link but cannot see it
- The `/email` main route is properly visible to salespeople
- Need to add salespeople to the settings email visibility condition

### Permission System ⚠️ UNDERUTILIZED
- `src/lib/permissions.ts` exists but is not used in email API routes
- Contractor department permissions are defined but not enforced
- Would benefit from consistency audit

## Data Model Notes

```
EmailSignature Model:
├─ id: String (uuid)
├─ dealershipId: String (required)
├─ userId: String? (NULL = dealership-wide, SET = personal)
├─ name: String
├─ content: String (HTML)
├─ isDefault: Boolean
└─ Relations: dealership, user

EmailTemplate Model:
├─ id: String (uuid)
├─ dealershipId: String (required)
├─ userId: String? (NULL = dealership-wide, SET = personal)
├─ name: String
├─ subject: String
├─ bodyHtml: String
├─ bodyText: String?
├─ category: String (default: "custom")
├─ isActive: Boolean
└─ Relations: dealership, user
```

Both models support the userId=null pattern for dealership-wide items and userId=<id> for personal items.
