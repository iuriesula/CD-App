# Email Module Access Control Analysis

## Current State Summary

The email module (signatures and templates) has been **recently updated to allow salespeople personal access**, but there are several inconsistencies and gaps between the API implementation and UI navigation that need to be addressed.

---

## 1. Role Definitions

### Available Roles (from `prisma/schema.prisma`)
```
- salesperson (default dealership user)
- manager (dealership management)
- tech (dealership technical staff)
- content_creator (dealership content staff)
- agency_admin (system administrator across agencies)
- contractor (external contractors with limited access)
```

### Key Files
- **Roles defined:** `/Users/iuriesula/CD-App/fcapp/prisma/schema.prisma` (lines 10-17)
- **Auth system:** `/Users/iuriesula/CD-App/fcapp/src/lib/auth.ts`
- **Permissions system:** `/Users/iuriesula/CD-App/fcapp/src/lib/permissions.ts`

---

## 2. Current Email Module Access Control

### API Routes for Email Signatures
**Location:** `/Users/iuriesula/CD-App/fcapp/src/app/api/email/signatures/`

#### `route.ts` - GET & POST
**Current Permission Logic:**
- ✅ **GET** - All authenticated dealership users can list signatures (both dealership and personal)
  - Includes `includePersonal` param to filter user's own signatures
  - **Permission Check:** Basic session check only (lines 8-11)
  
- ✅ **POST (Create)** - Salespeople, managers, agency admins can create
  - **Contractor Restriction:** Contractors CANNOT create dealership-wide signatures (lines 71-77)
  - **Dealership-wide:** Available to all non-contractor roles
  - **Personal:** Available to all roles
  - **Default signature handling:** Automatically unsets other defaults in same scope (lines 81-96)

#### `[id]/route.ts` - GET, PUT & DELETE
**Current Permission Logic:**
- ✅ **GET** - Can view signatures they have access to
  - Can see dealership-wide (userId: null) OR own personal signatures (lines 22-25)

- ✅ **PUT (Update)**
  - **Dealership-wide signatures:** Contractors BLOCKED (lines 79-83)
  - **Personal signatures:** Only owner can update, OR managers/agency admins (lines 87-89)
  - **Non-contractors:** All non-contractor roles CAN update dealership-wide signatures

- ✅ **DELETE**
  - Same logic as PUT
  - **Dealership-wide:** Contractors BLOCKED (lines 163-167)
  - **Personal:** Only owner, managers, or agency admins (lines 171-173)

### API Routes for Email Templates
**Location:** `/Users/iuriesula/CD-App/fcapp/src/app/api/email/templates/`

#### `route.ts` - GET & POST
**Current Permission Logic:**
- ✅ **GET** - All authenticated dealership users can list templates
  - Includes `includePersonal`, `category`, and `activeOnly` filters (lines 13-37)
  - **Permission Check:** Basic session check only

- ✅ **POST (Create)** - Salespeople, managers, agency admins can create
  - **Contractor Restriction:** Same as signatures - contractors CANNOT create dealership-wide templates (lines 81-88)
  - **Personal:** All roles can create personal templates
  - **Dealership-wide:** All non-contractor roles can create

#### `[id]/route.ts` - GET, PUT & DELETE
**Current Permission Logic:**
- ✅ **GET** - Can view any template in dealership (no personal filtering on GET individual)

- ✅ **PUT (Update)**
  - **Personal template:** Only owner can edit (lines 66-69)
  - **Dealership-wide:** Contractors BLOCKED (lines 72-74)
  - **Comment indicates:** "salespeople, managers, and agency admins can edit" dealership-wide (line 71)

- ✅ **DELETE**
  - Same logic as PUT (lines 128-138)
  - **Personal:** Only owner can delete (lines 130-132)
  - **Dealership-wide:** Contractors BLOCKED (lines 135-137)

---

## 3. UI Navigation & Visibility

### Sidebar Navigation
**Location:** `/Users/iuriesula/CD-App/fcapp/src/components/layout/sidebar.tsx`

#### Current Structure
```
Main Navigation Items (All Non-Contractor Users):
- My Day
- Pipeline
- All Leads
- Requests
- Inventory
- Media
- Email ✅ (Line 68-75) - Already visible to all!

Settings Section (Manager & Agency Admin Only):
- Dealership
- Team Members
- Email ✅ (Line 98-105) - ONLY for managers/agency admins!

Admin Section (Agency Admin Only):
- Analytics
- Dealerships
- All Users
- Contractors
```

#### Settings Email Route
- **Path:** `/settings/email` (line 98)
- **Visibility:** Lines 221-246 - Only managers and agency admins see this
- **Issue:** Salespeople cannot access email management/configuration even though they have API permissions

#### Main Email Route
- **Path:** `/email` (line 68)
- **Visibility:** All non-contractor users (contractors get different nav)
- **Status:** Properly accessible to salespeople

### Role Conditions in Sidebar
```typescript
const isManager = role === "manager";
const isAgencyAdmin = role === "agency_admin";
const isContractor = role === "contractor";

// Contractor users: Only see "My Requests"
if (isContractor) { ... }

// All dealership users (salesperson, manager, tech, content_creator): See main nav including /email
else { navItems.map(...) }

// Managers & Agency Admins additionally see settings
if (isManager || isAgencyAdmin) { settingsNavItems.map(...) }

// Agency Admins additionally see admin
if (isAgencyAdmin) { adminNavItems.map(...) }
```

---

## 4. Identified Gaps & Issues

### Gap 1: Settings/Email Access for Salespeople
**Problem:**
- The `/settings/email` route (for managing signatures/templates globally) is ONLY visible to managers and agency admins
- However, the API allows salespeople to create/update signatures and templates
- **Impact:** Salespeople can use email signatures/templates in emails but cannot manage them via UI

**Evidence:**
- Sidebar line 221: `if (isManager || isAgencyAdmin)` controls visibility of settings section
- API route comments explicitly state salespeople CAN create dealership-wide signatures (signatures/route.ts line 69)

### Gap 2: Contractor Email Access Mentioned but Not Fully Restricted
**Problem:**
- The `permissions.ts` file lists "email" under IT contractor permissions (line 14)
- But the API routes check only `session.role === "contractor"` for restrictions
- There's no check against the contractor's specific department permissions

**Evidence:**
- `permissions.ts` lines 9-20: CONTRACTOR_PERMISSIONS define email access per department
- API routes don't use `contractorHasPermission()` function
- Contractor email access is binary (blocked/allowed) rather than permission-based

### Gap 3: Inconsistent Permission Checks
**Problem:**
- Some checks use `session.role === "contractor"` (exclusive check)
- Better approach would be role-based permission checks or explicit allow-lists

**Inconsistencies:**
- Signatures/templates check: `if (session.role === "contractor")` - blocks contractors
- Should also check: Does non-contractor role even have permission to edit dealership-wide items?
- Currently assumes all salespeople/managers/admins are equal, which may not align with future RBAC needs

---

## 5. What's Working Correctly

### Positive Implementations
1. ✅ **Personal vs. Dealership-Wide Distinction**
   - Properly separates user-scoped (userId set) from dealership-scoped (userId null) resources
   - Default handling respects scope (personal defaults don't affect dealership defaults)

2. ✅ **Main Email Module Visibility**
   - `/email` route is properly visible to all non-contractor dealership users
   - Including salespeople ✅

3. ✅ **API Permissions for Salespeople**
   - CREATE: Salespeople can create both personal and dealership-wide signatures/templates
   - READ: Salespeople can view their personal and dealership-wide items
   - UPDATE/DELETE: Salespeople can modify dealership-wide signatures/templates

4. ✅ **Contractor Restrictions**
   - Contractors cannot create/update/delete dealership-wide signatures and templates
   - This protects dealership resources from unauthorized modification

---

## 6. Recommendations for Full Salespeople Access

### Recommendation 1: Update Sidebar Navigation
**File:** `/Users/iuriesula/CD-App/fcapp/src/components/layout/sidebar.tsx`

**Change Required:**
- Move the "Email" settings option out of the manager-only settings section
- Make it available to all non-contractor dealership users

**Options:**
- **Option A (Preferred):** Show "Email" in settings for `salesperson | manager | tech | content_creator`
- **Option B:** Create a separate "Email" section in main navigation with sub-items
- **Option C:** Keep in settings but change visibility condition from `(isManager || isAgencyAdmin)` to `(!isContractor)`

**Current Code (line 221):**
```typescript
{(isManager || isAgencyAdmin) && (
  <>
    <div className="pt-6 pb-2">
      <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Settings
      </p>
    </div>
    {settingsNavItems.map((item) => { ... })}
  </>
)}
```

**Proposed Change:**
```typescript
{!isContractor && (
  <>
    <div className="pt-6 pb-2">
      <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Settings
      </p>
    </div>
    {settingsNavItems.map((item) => { ... })}
  </>
)}
```

Or alternatively, conditionally show email settings:
```typescript
{(isManager || isAgencyAdmin) && (
  // existing code
)}

{!isContractor && (
  // Email settings available to all non-contractors, or specific roles
  <Link href="/settings/email">Email</Link>
)}
```

### Recommendation 2: Verify Settings Email Page Exists
**Check:** Does `/settings/email` page exist and handle salespeople correctly?
- Location to verify: `/Users/iuriesula/CD-App/fcapp/src/app/(dashboard)/settings/email/`
- Ensure it has proper role checking (should allow salespeople)
- Ensure it shows both personal and dealership-wide items appropriately

### Recommendation 3: Clarify Contractor Department Permissions
**Consider:** Should contractors with "marketing" department have access to email templates?

**Current Status:**
- `permissions.ts` shows marketing contractors CAN access email_templates (line 19)
- But API routes don't enforce this department-level permission
- Contractors are universally blocked from dealership-wide modifications

**Decision Needed:**
- Allow marketing contractors to manage email templates?
- If yes: Update API routes to use `contractorHasPermission()` instead of blanket contractor checks
- If no: Document why and remove "email_templates" from marketing permissions

### Recommendation 4: Add Explicit Salesperson Permission Check
**Strengthen API:** Instead of excluding contractors, explicitly include allowed roles

**Current Pattern (restrictive):**
```typescript
if (session.role === "contractor") {
  return NextResponse.json({ error: "..." }, { status: 403 });
}
```

**Better Pattern (explicit):**
```typescript
const ALLOWED_ROLES = ["salesperson", "manager", "tech", "content_creator", "agency_admin"];
if (!ALLOWED_ROLES.includes(session.role)) {
  return NextResponse.json({ error: "..." }, { status: 403 });
}
```

---

## 7. Implementation Checklist

To enable full salespeople access to the email module:

- [ ] **Sidebar Update**
  - [ ] Update visibility condition for `/settings/email` link
  - [ ] Change from `(isManager || isAgencyAdmin)` to include salespeople
  - [ ] Test sidebar rendering for each role

- [ ] **Settings Email Page**
  - [ ] Verify page exists at `/app/(dashboard)/settings/email/`
  - [ ] Verify it allows salesperson role
  - [ ] Test personal vs. dealership-wide item management
  - [ ] Test create/update/delete operations

- [ ] **API Permissions (Optional Enhancement)**
  - [ ] Consider using explicit allow-lists instead of contractor checks
  - [ ] Document contractor department email access policy
  - [ ] Update contractor permission system if marketing department should access templates

- [ ] **Testing**
  - [ ] Test as salesperson: Can access `/email` and `/settings/email`
  - [ ] Test as salesperson: Can create personal signature/template
  - [ ] Test as salesperson: Can create/edit/delete dealership-wide signature/template
  - [ ] Test as contractor: Verify still cannot create dealership-wide items
  - [ ] Test as contractor (marketing dept): Verify cannot access email management

---

## 8. File Summary

### Key Files
| File | Purpose | Current State |
|------|---------|--------------|
| `src/lib/auth.ts` | Session & role management | ✅ Working |
| `src/lib/permissions.ts` | Permission helper functions | ⚠️ Not used in email APIs |
| `src/components/layout/sidebar.tsx` | Navigation menu | ⚠️ Email settings hidden from salespeople |
| `src/app/api/email/signatures/route.ts` | Signature CRUD | ✅ Salespeople can create |
| `src/app/api/email/signatures/[id]/route.ts` | Individual signature ops | ✅ Salespeople can edit |
| `src/app/api/email/templates/route.ts` | Template CRUD | ✅ Salespeople can create |
| `src/app/api/email/templates/[id]/route.ts` | Individual template ops | ✅ Salespeople can edit |
| `prisma/schema.prisma` | Data models | ✅ Supports personal/dealership scopes |

### Pages to Verify/Update
| Page | Location | Status |
|------|----------|--------|
| Email module main | `/app/(dashboard)/email/` | Need to verify |
| Email settings | `/app/(dashboard)/settings/email/` | Need to verify |

---

## Summary

**Current Status:** Salespeople have FULL API access to email signatures and templates but PARTIAL UI access.

**What Works:**
- Salespeople CAN create, read, update, and delete email signatures/templates via API
- Personal signatures/templates are properly scoped
- Dealership-wide items can be managed by salespeople

**What's Missing:**
- The `/settings/email` UI link is hidden from salespeople in the sidebar
- Salespeople see the email module in main nav but may not find signature/template management

**Critical Action:** Update `/components/layout/sidebar.tsx` to show `/settings/email` link to salespeople (not just managers/admins).
