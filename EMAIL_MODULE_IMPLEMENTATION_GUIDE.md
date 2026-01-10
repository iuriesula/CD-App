# Email Module Implementation Guide

## Executive Summary

The email module for signatures and templates has **complete API support for salespeople** but **incomplete UI navigation**. Salespeople can perform all operations via the API but cannot see the settings link in the sidebar.

**Critical Fix:** Update sidebar visibility for `/settings/email` link

---

## Part 1: Current API Implementation Details

### 1.1 Email Signatures API

#### File: `/Users/iuriesula/CD-App/fcapp/src/app/api/email/signatures/route.ts`

**GET /api/email/signatures** (List signatures)
- **Lines:** 5-48
- **Permission Check:** Basic session check only (lines 8-11)
- **Accessible to:** All authenticated dealership users (salesperson ✅, manager, tech, content_creator, agency_admin)
- **Blocked for:** Contractors (not explicitly, but contractors get different nav)
- **Query Params:**
  - `includePersonal` (default: true) - Show user's personal signatures + dealership-wide
  - `includePersonal=false` - Show only dealership-wide signatures

**POST /api/email/signatures** (Create signature)
- **Lines:** 50-117
- **Permission for Dealership-Wide (isPersonal=false):**
  ```typescript
  if (!isPersonal) {
    if (session.role === "contractor") {
      return NextResponse.json({ error: "Contractors cannot create dealership-wide signatures" }, { status: 403 });
    }
  }
  ```
  - **Lines:** 71-77
  - Allows: salesperson ✅, manager, tech, content_creator, agency_admin
  - Blocks: contractor

- **Permission for Personal (isPersonal=true):**
  - Allowed for all roles including contractors

- **Default Handling:**
  - If `isDefault=true`, automatically unsets other defaults in same scope (lines 81-96)
  - Personal defaults only affect user's personal signatures
  - Dealership-wide defaults only affect dealership-wide signatures

#### File: `/Users/iuriesula/CD-App/fcapp/src/app/api/email/signatures/[id]/route.ts`

**GET /api/email/signatures/[id]** (Get one signature)
- **Lines:** 5-46
- **Permission:**
  ```typescript
  where: {
    id,
    dealershipId: session.dealershipId,
    OR: [
      { userId: null },           // Dealership-wide
      { userId: session.userId }, // User's personal
    ],
  }
  ```
  - **Lines:** 18-25
  - Can only view dealership-wide or own personal signatures
  - **Accessible to:** Salesperson ✅

**PUT /api/email/signatures/[id]** (Update signature)
- **Lines:** 48-130
- **Permission Logic:**
  ```typescript
  const isOwner = existing.userId === session.userId;
  const isDealershipWide = existing.userId === null;
  const isContractor = session.role === "contractor";

  // Contractors cannot update dealership-wide signatures
  if (isDealershipWide && isContractor) {
    return NextResponse.json({ error: "Contractors cannot update dealership-wide signatures" }, { status: 403 });
  }

  // Personal signatures can only be updated by owner (or managers/admins)
  if (!isDealershipWide && !isOwner && session.role !== "manager" && !isAgencyAdmin(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  ```
  - **Lines:** 74-89
  - Salesperson ✅ can update dealership-wide
  - Salesperson ✅ can update own personal
  - Cannot update others' personal signatures (unless manager/admin)

**DELETE /api/email/signatures/[id]** (Delete signature)
- **Lines:** 132-187
- **Permission Logic:** Same as PUT (lines 157-173)
- **Accessible to:** Salesperson ✅

---

### 1.2 Email Templates API

#### File: `/Users/iuriesula/CD-App/fcapp/src/app/api/email/templates/route.ts`

**GET /api/email/templates** (List templates)
- **Lines:** 5-58
- **Permission Check:** Basic session check only
- **Accessible to:** All authenticated dealership users
- **Query Params:**
  - `includePersonal` (default: true)
  - `category` - Filter by category (follow_up, introduction, offer, thank_you, custom)
  - `activeOnly` (default: false) - Show only active templates

**POST /api/email/templates** (Create template)
- **Lines:** 60-111
- **Permission for Dealership-Wide (isPersonal=false):**
  ```typescript
  if (!isPersonal) {
    if (session.role === "contractor") {
      return NextResponse.json({ error: "Contractors cannot create dealership-wide templates" }, { status: 403 });
    }
  }
  ```
  - **Lines:** 81-88
  - Allows: salesperson ✅, manager, tech, content_creator, agency_admin
  - Blocks: contractor

#### File: `/Users/iuriesula/CD-App/fcapp/src/app/api/email/templates/[id]/route.ts`

**GET /api/email/templates/[id]** (Get one template)
- **Lines:** 5-37
- **Note:** No personal filtering - can view any template in dealership
- **Comment:** "Verify ownership" but doesn't actually check (line 52)

**PUT /api/email/templates/[id]** (Update template)
- **Lines:** 39-100
- **Permission Logic:**
  ```typescript
  if (existing.userId) {
    // Personal template - can only be edited by owner
    if (existing.userId !== session.userId) {
      return NextResponse.json({ error: "You can only edit your own templates" }, { status: 403 });
    }
  } else {
    // Dealership-wide template - salespeople, managers, and agency admins can edit
    if (session.role === "contractor") {
      return NextResponse.json({ error: "Contractors cannot edit dealership-wide templates" }, { status: 403 });
    }
  }
  ```
  - **Lines:** 65-75
  - **Comment states:** "salespeople, managers, and agency admins can edit" (line 71)
  - Salesperson ✅ can edit dealership-wide
  - Salesperson ✅ can edit own personal

**DELETE /api/email/templates/[id]** (Delete template)
- **Lines:** 102-152
- **Permission Logic:** Same as PUT (lines 128-138)

---

## Part 2: UI Navigation

### 2.1 Sidebar Navigation Structure

#### File: `/Users/iuriesula/CD-App/fcapp/src/components/layout/sidebar.tsx`

**Main Navigation Array (navItems)**
- **Lines:** 12-76
- **Contents:**
  - `/my-day` - My Day
  - `/pipeline` - Pipeline
  - `/leads` - All Leads
  - `/requests` - Requests
  - `/inventory` - Inventory
  - `/media` - Media
  - **`/email` - Email ✅ (lines 68-75)** - VISIBLE to all non-contractors

**Settings Navigation Array (settingsNavItems)**
- **Lines:** 78-106
- **Contents:**
  - `/settings/dealership` - Dealership
  - `/settings/users` - Team Members
  - **`/settings/email` - Email (lines 98-105)** - Email Settings

**Admin Navigation Array (adminNavItems)**
- **Lines:** 108-145
- Only for agency_admin role

**Contractor Navigation Array (contractorNavItems)**
- **Lines:** 147-157
- Only for contractor role - shows `/contractor` (My Requests)

**Visibility Logic:**
```typescript
const isManager = role === "manager";
const isAgencyAdmin = role === "agency_admin";
const isContractor = role === "contractor";

// Main navigation (all non-contractors)
{isContractor ? (
  contractorNavItems.map(...)
) : (
  navItems.map(...)  // Includes /email ✅
)}

// Settings navigation (MANAGER & AGENCY_ADMIN ONLY)
{(isManager || isAgencyAdmin) && (
  settingsNavItems.map(...)  // Includes /settings/email ⚠️
)}

// Admin navigation (AGENCY_ADMIN ONLY)
{isAgencyAdmin && (
  adminNavItems.map(...)
)}
```

**Lines:** 163-277

---

## Part 3: The Problem

### Current State
1. **Salesperson API Access:** ✅ Complete
   - Can GET, POST, PUT, DELETE signatures and templates
   - Both personal and dealership-wide

2. **Salesperson Main Email Access:** ✅ Complete
   - Can access `/email` route (shows in sidebar)

3. **Salesperson Settings Email Access:** ❌ **MISSING**
   - Cannot see `/settings/email` in sidebar
   - Sidebar condition (line 221) limits settings to managers and admins only

### Visual Flow

**What Salesperson Sees:**
```
Sidebar
├─ My Day
├─ Pipeline
├─ All Leads
├─ Requests
├─ Inventory
├─ Media
└─ Email ✅ Click here to manage
```

**What Salesperson Should See (if signatures/templates feature is in settings):**
```
Sidebar
├─ My Day
├─ Pipeline
├─ All Leads
├─ Requests
├─ Inventory
├─ Media
├─ Email ✅
├─ [SETTINGS SECTION]
│  ├─ Dealership (maybe)
│  ├─ Team Members (maybe)
│  └─ Email ✅ Click here for templates/signatures
└─ ...
```

---

## Part 4: Auth System

### File: `/Users/iuriesula/CD-App/fcapp/src/lib/auth.ts`

**Helper Functions:**
- **`isAgencyAdmin(role: string)`** (line 95-97)
  - Returns: `role === "agency_admin"`
  - Used in email APIs (signatures/[id]/route.ts line 87, line 171)

- **`getSession()`** (line 38-73)
  - Returns: AuthUser with id, email, name, role, dealershipId, mustChangePassword, contractorDepartment
  - Role is of type UserRole (from Prisma)

- **`requireRole(userRole, allowedRoles)`** (line 91-93)
  - Checks if userRole in allowedRoles array

---

## Part 5: Permissions System

### File: `/Users/iuriesula/CD-App/fcapp/src/lib/permissions.ts`

**Contractor Permissions by Department:**
```typescript
CONTRACTOR_PERMISSIONS = {
  it: [
    "settings",
    "users",
    "media",
    "email",              // IT contractors can access email
    "inventory",
    "dealership_config",
  ],
  content: [
    "media",
    "inventory",
  ],
  marketing: [
    "leads",
    "email_templates",    // Marketing contractors can access email_templates
    "media",
  ],
}
```

**Lines:** 8-20

**Key Functions:**
- `contractorHasPermission(department, resource)` (line 25-31)
- `contractorHasDealershipAccess(contractorId, dealershipId)` (line 37-51)
- `canCreateRequests(role)` (line 77-79) - Allows salesperson ✅
- `canManageContractors(role)` (line 70-72) - Only agency_admin

**Issue:** Email APIs don't use `contractorHasPermission()` - they use blanket contractor checks instead.

---

## Part 6: Database Models

### File: `/Users/iuriesula/CD-App/fcapp/prisma/schema.prisma`

**EmailSignature Model:**
```
Lines: 451-468
- id: String (uuid, primary key)
- dealershipId: String (required, indexed)
- userId: String? (NULL = dealership-wide, SET = personal) ⭐
- name: String
- content: String (HTML)
- isDefault: Boolean (default: false)
- createdAt: DateTime (auto)
- updatedAt: DateTime (auto)

Relations:
- dealership: Dealership (FK: dealershipId)
- user: User? (FK: userId)

Indexes:
- dealershipId
- [dealershipId, userId] (implied from relations)
```

**EmailTemplate Model:**
```
Lines: 427-450
- id: String (uuid, primary key)
- dealershipId: String (required)
- userId: String? (NULL = dealership-wide, SET = personal) ⭐
- name: String
- subject: String
- bodyHtml: String (required)
- bodyText: String? (optional)
- category: String (default: "custom")
- isActive: Boolean (default: true)
- createdAt: DateTime (auto)
- updatedAt: DateTime (auto)

Relations:
- dealership: Dealership (FK: dealershipId)
- user: User? (FK: userId)
```

**Key Feature:** Both models use userId=null to distinguish dealership-wide from personal items.

---

## Part 7: Implementation Checklist

### Step 1: Update Sidebar Navigation
**File:** `/Users/iuriesula/CD-App/fcapp/src/components/layout/sidebar.tsx`

**Current Code (Line 221):**
```typescript
{(isManager || isAgencyAdmin) && (
  <>
    <div className="pt-6 pb-2">
      <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Settings
      </p>
    </div>
    {settingsNavItems.map((item) => {
      // ... render each settings item
    })}
  </>
)}
```

**Option A: Include all dealership users**
```typescript
{!isContractor && (
  <>
    <div className="pt-6 pb-2">
      <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Settings
      </p>
    </div>
    {settingsNavItems.map((item) => {
      // ... render each settings item
    })}
  </>
)}
```

**Option B: Conditionally show email settings only for salespeople**
```typescript
{(isManager || isAgencyAdmin) && (
  <>
    <div className="pt-6 pb-2">
      <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Settings
      </p>
    </div>
    {settingsNavItems.map((item) => {
      // ... render
    })}
  </>
)}

{!isContractor && !isManager && !isAgencyAdmin && (
  <Link
    href="/settings/email"
    className={`
      flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
      ${pathname === "/settings/email" || pathname.startsWith("/settings/email/")
        ? "bg-blue-50 text-blue-700"
        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }
    `}
  >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
    Email
  </Link>
)}
```

### Step 2: Verify Settings Email Page
**File:** `/Users/iuriesula/CD-App/fcapp/src/app/(dashboard)/settings/email/` (if exists)

- [ ] Verify page exists
- [ ] Verify it handles salesperson role correctly
- [ ] Verify it allows creating/managing personal and dealership-wide items
- [ ] Verify it uses proper role checking

### Step 3: Test Each Role
Create test cases for:
- [ ] Salesperson: Can see `/email` route
- [ ] Salesperson: Can see `/settings/email` link (after fix)
- [ ] Salesperson: Can create personal signature
- [ ] Salesperson: Can create dealership-wide template
- [ ] Salesperson: Can edit dealership-wide signature
- [ ] Salesperson: Can delete personal template
- [ ] Manager: Same as above + can see original settings
- [ ] Contractor: Cannot see email settings link
- [ ] Contractor: Cannot create dealership-wide items

---

## Part 8: Role Matrix Reference

### Roles Defined
From `prisma/schema.prisma` enum UserRole (lines 10-17):
1. **salesperson** - Default dealership user
2. **manager** - Dealership management
3. **tech** - Dealership technical staff
4. **content_creator** - Dealership content staff
5. **agency_admin** - System-wide administrator
6. **contractor** - External contractor (limited access)

### Email Module Access
| Role | View Sigs | Create Personal Sig | Create Dealership Sig | Edit Dealership Sig | Access /email | Access /settings/email |
|------|:---------:|:------------------:|:-------------------:|:-----------------:|:----------:|:-------------------:|
| salesperson | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ **FIX** |
| manager | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| tech | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ **FIX** |
| content_creator | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ **FIX** |
| agency_admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| contractor | ✅* | ✅* | ❌ | ❌ | ❌ | N/A |

*contractors can access personal items only

---

## Summary

**Current State:** API is complete, UI navigation is incomplete.

**What Works:**
- Salespeople can create, read, update, delete signatures and templates via API
- Both personal and dealership-wide scoping works correctly
- Contractor restrictions are properly enforced

**What Needs Fixing:**
- Update sidebar visibility condition (line 221)
- Make `/settings/email` visible to all dealership users (not just managers/admins)
- Alternatively, create a separate email settings entry for salespeople

**Recommended Fix:** Change line 221 from `{(isManager || isAgencyAdmin) && (` to `{!isContractor && (` or create a conditional email settings link specifically for salespeople/tech/content_creator roles.
