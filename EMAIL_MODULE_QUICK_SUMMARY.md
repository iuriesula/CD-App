# Email Module: Quick Summary

## One-Sentence Summary
**The email module has complete API support for salespeople but the settings navigation link is hidden from them in the sidebar.**

---

## What's Currently Implemented ✅

### API Level (All Working)
- Salespeople CAN create personal signatures and templates
- Salespeople CAN create dealership-wide signatures and templates
- Salespeople CAN edit (PUT) both personal and dealership-wide items
- Salespeople CAN delete (DELETE) both personal and dealership-wide items
- Salespeople CAN list all signatures and templates they have access to
- Contractors are properly blocked from dealership-wide operations

### UI Level (Partially Working)
- `/email` route is visible in sidebar for all non-contractors ✅
- `/settings/email` route is hidden from salespeople ❌ **Should be visible**

---

## The Problem in 30 Seconds

**Sidebar Navigation:**
```
Current (Salesperson sees):
├─ Email ✅ (main route)
└─ [No Settings Section]

Should see:
├─ Email ✅ (main route)
├─ [SETTINGS]
│  └─ Email ✅ (for managing signatures/templates)
```

**Root Cause:**
File: `/Users/iuriesula/CD-App/fcapp/src/components/layout/sidebar.tsx`
Line: 221
Current: `{(isManager || isAgencyAdmin) && (`
Problem: Only shows settings to managers and admins, excludes salesperson

---

## Proof Salespeople Have API Access

### Email Signatures Route
**File:** `/Users/iuriesula/CD-App/fcapp/src/app/api/email/signatures/route.ts`

POST endpoint (line 71-77):
```typescript
if (!isPersonal) {
  if (session.role === "contractor") {  // Only blocks contractor
    return NextResponse.json({ error: "..." }, { status: 403 });
  }
}
// Everyone else (salesperson ✅) can create dealership-wide signatures
```

Comment on line 69: "Salespeople, managers, and agency admins can create dealership-wide signatures"

### Email Templates Route
**File:** `/Users/iuriesula/CD-App/fcapp/src/app/api/email/templates/route.ts`

POST endpoint (line 81-88):
```typescript
if (!isPersonal) {
  if (session.role === "contractor") {  // Only blocks contractor
    return NextResponse.json({ error: "..." }, { status: 403 });
  }
}
// Everyone else (salesperson ✅) can create dealership-wide templates
```

Comment on line 79: "Salespeople, managers, and agency admins can create dealership-wide templates"

---

## Role Permission Matrix for Email

| What | Salesperson | Manager | Agency Admin | Contractor |
|-----|:-----------:|:-------:|:-----------:|:---------:|
| Create personal signature | ✅ | ✅ | ✅ | ✅ |
| Create dealership signature | ✅ | ✅ | ✅ | ❌ |
| Edit dealership signature | ✅ | ✅ | ✅ | ❌ |
| Delete dealership signature | ✅ | ✅ | ✅ | ❌ |
| **Access `/email`** | ✅ | ✅ | ✅ | ❌ |
| **Access `/settings/email`** | ❌ | ✅ | ✅ | N/A |

---

## Files You Need to Understand

### Critical Files (for understanding)
1. **Permission Logic:**
   - `/Users/iuriesula/CD-App/fcapp/src/app/api/email/signatures/route.ts` (lines 71-77)
   - `/Users/iuriesula/CD-App/fcapp/src/app/api/email/templates/route.ts` (lines 81-88)

2. **Navigation:**
   - `/Users/iuriesula/CD-App/fcapp/src/components/layout/sidebar.tsx` (line 221 - THE PROBLEM)

3. **Auth/Roles:**
   - `/Users/iuriesula/CD-App/fcapp/src/lib/auth.ts` (session & role types)
   - `/Users/iuriesula/CD-App/fcapp/src/lib/permissions.ts` (unused but available)

4. **Data Models:**
   - `/Users/iuriesula/CD-App/fcapp/prisma/schema.prisma` (lines 427-468)
   - EmailSignature and EmailTemplate models with userId=null for dealership-wide

---

## The Fix (One Line)

**File:** `/Users/iuriesula/CD-App/fcapp/src/components/layout/sidebar.tsx`
**Line:** 221

**Change FROM:**
```typescript
{(isManager || isAgencyAdmin) && (
```

**Change TO:**
```typescript
{!isContractor && (
```

This makes `/settings/email` visible to: salesperson, manager, tech, content_creator, agency_admin (everyone except contractors).

---

## Verification Checklist

After making the fix:
- [ ] Sidebar shows `/settings/email` link when logged in as salesperson
- [ ] Sidebar hides `/settings/email` link when logged in as contractor
- [ ] Salesperson can create signature (personal)
- [ ] Salesperson can create signature (dealership-wide)
- [ ] Salesperson can edit dealership-wide signature
- [ ] Salesperson can delete dealership-wide signature
- [ ] Contractor cannot see `/settings/email` link
- [ ] Contractor cannot create dealership-wide signature (API blocks with 403)
- [ ] Contractor cannot edit dealership-wide signature (API blocks with 403)

---

## Data Model Notes

Both EmailSignature and EmailTemplate use the same pattern:

```
dealershipId (required) - Which dealership owns this
userId (optional)       - If NULL: dealership-wide item
                        - If set: personal item for that user
```

This design elegantly supports:
- Dealership-wide defaults (userId = null)
- Personal overrides (userId = user_id)
- Proper scoping in queries (OR clause checking both conditions)

---

## Permission Comments in Code

**Signatures Route** (line 69):
> "Salespeople, managers, and agency admins can create dealership-wide signatures. Only contractors are blocked"

**Templates Route** (line 79):
> "Salespeople, managers, and agency admins can create dealership-wide templates. Only contractors are blocked"

**Templates Update** (line 71):
> "Dealership-wide template - salespeople, managers, and agency admins can edit"

**All three confirm:** Salespeople have full access to email module features via API.

---

## Outstanding Questions

1. **Why is `/settings/email` hidden from salespeople?**
   - Likely an oversight during development
   - Comments in code explicitly allow salespeople
   - API implementation works correctly

2. **Does a settings/email page exist?**
   - Need to verify: `/Users/iuriesula/CD-App/fcapp/src/app/(dashboard)/settings/email/`
   - If it exists, verify it handles salesperson role correctly

3. **What about contractor department permissions?**
   - `permissions.ts` defines "email" access for IT contractors
   - "email_templates" access for marketing contractors
   - But API routes don't enforce these department-level permissions
   - Current implementation: All contractors blocked uniformly (good for now)

4. **Should all dealership users (tech, content_creator) also see `/settings/email`?**
   - Current sidebar treats them like salesperson (main nav, no settings)
   - Recommend: Yes, all dealership users should see settings email link
   - Fix provides this (changes condition to `!isContractor`)

---

## References in Codebase

### Role Definition
- **File:** `prisma/schema.prisma` (lines 10-17)
- **Enum:** UserRole with values: salesperson, manager, tech, content_creator, agency_admin, contractor

### Contractor Permissions (Defined but Not Enforced)
- **File:** `src/lib/permissions.ts` (lines 8-20)
- **Function:** `contractorHasPermission(department, resource)`
- **Status:** Defined but not called in email API routes

### Auth Functions Used
- **File:** `src/lib/auth.ts`
- **getSession()** (line 38) - Returns AuthUser with role
- **isAgencyAdmin(role)** (line 95) - Check if role is agency_admin

### Session Type
- **File:** `src/types/index.ts` (lines 96-104)
- **AuthUser interface:** id, email, name, role, dealershipId, mustChangePassword, contractorDepartment

---

## Conclusion

The email module for managing signatures and templates is **API-ready for salespeople** but needs **UI navigation fix** to surface the feature properly.

**Single critical change needed:** Update sidebar navigation visibility condition (line 221) to include all non-contractor roles.

**Estimated effort:** < 5 minutes to fix, < 10 minutes to fully test.
