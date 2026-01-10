# Email Module: Visual Reference & Code Snippets

## File Structure Overview

```
fcapp/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── email/                          (API Routes)
│   │   │       ├── signatures/
│   │   │       │   ├── route.ts               (GET/POST)
│   │   │       │   └── [id]/route.ts          (GET/PUT/DELETE)
│   │   │       └── templates/
│   │   │           ├── route.ts               (GET/POST)
│   │   │           └── [id]/route.ts          (GET/PUT/DELETE)
│   │   └── (dashboard)/
│   │       ├── email/                          (Main Email Page)
│   │       │   └── [page/layout files]
│   │       └── settings/
│   │           └── email/                      (Settings Email Page)
│   │               └── [page/layout files]
│   ├── components/
│   │   ├── layout/
│   │   │   └── sidebar.tsx                     (Navigation - PROBLEM HERE)
│   │   └── email/
│   │       └── email-composer.tsx
│   ├── lib/
│   │   ├── auth.ts                             (Auth & Session)
│   │   ├── permissions.ts                      (Permission Helper)
│   │   └── email*.ts                           (Email Utilities)
│   └── types/
│       └── index.ts                            (Type Definitions)
└── prisma/
    └── schema.prisma                           (Data Models)
```

## Permission Flow Diagrams

### Request for /api/email/signatures POST (Create)

```
Request: POST /api/email/signatures
├─ getSession()
│  └─ Get session.role from JWT token
│
├─ Parse request body
│  ├─ name: string
│  ├─ content: string (HTML)
│  ├─ isDefault?: boolean
│  └─ isPersonal?: boolean
│
├─ Permission Check:
│  ├─ if (!isPersonal):
│  │  └─ if (session.role === "contractor"):
│  │     └─ DENY 403 ❌
│  │
│  └─ All other roles:
│     └─ ALLOW ✅
│
└─ Store in database:
   ├─ dealershipId: session.dealershipId
   ├─ userId: isPersonal ? session.userId : null
   ├─ name, content, isDefault
   └─ Return 201 Created
```

### Request for /api/email/templates PUT (Update)

```
Request: PUT /api/email/templates/[id]
├─ getSession()
│  └─ Get session.role & session.userId
│
├─ Fetch existing template
│  └─ Find template where id & dealershipId match
│
├─ Permission Check:
│  ├─ if (existing.userId is SET):      [Personal Template]
│  │  └─ if (existing.userId !== session.userId):
│  │     └─ if (role NOT in ["manager", "agency_admin"]):
│  │        └─ DENY 403 ❌
│  │
│  └─ if (existing.userId is NULL):     [Dealership-Wide]
│     └─ if (session.role === "contractor"):
│        └─ DENY 403 ❌
│
├─ Permission: ALLOW ✅
│  └─ Update fields (name, subject, bodyHtml, etc.)
│
└─ Return 200 Updated
```

### Sidebar Navigation Rendering

```
Current State:
┌─────────────────────────────┐
│     Role Check Logic        │
├─────────────────────────────┤
│ isContractor = true?        │
├─ YES → Render contractor    │
│        nav (My Requests)    │
├─ NO → Render main nav items │
│       (Email is here ✅)    │
│                             │
│ isManager OR isAgencyAdmin? │
├─ YES → Render settings      │
│        (Email is here ⚠️)   │
│        Line 221 PROBLEM     │
├─ NO → Skip settings section │
│                             │
│ isAgencyAdmin?              │
├─ YES → Render admin section │
│                             │
└─────────────────────────────┘
```

## Key Code Snippets

### 1. Email Signature Creation - Permission Check

**File:** `src/app/api/email/signatures/route.ts` (lines 71-77)

```typescript
// Check permissions for dealership-wide signatures
// Salespeople, managers, and agency admins can create dealership-wide signatures
// Only contractors are blocked
if (!isPersonal) {
  if (session.role === "contractor") {
    return NextResponse.json(
      { error: "Contractors cannot create dealership-wide signatures" },
      { status: 403 }
    );
  }
}
```

### 2. Sidebar Navigation - Settings Visibility (THE PROBLEM)

**File:** `src/components/layout/sidebar.tsx` (lines 221-248)

**Current (Wrong):**
```typescript
{(isManager || isAgencyAdmin) && (
  <>
    <div className="pt-6 pb-2">
      <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Settings
      </p>
    </div>
    {settingsNavItems.map((item) => {
      const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
      return (
        <Link
          key={item.href}
          href={item.href}
          className={`...`}
        >
          {item.icon}
          {item.label}
        </Link>
      );
    })}
  </>
)}
```

**Should Be:**
```typescript
{!isContractor && (
  <>
    <div className="pt-6 pb-2">
      <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Settings
      </p>
    </div>
    {settingsNavItems.map((item) => {
      // ... same render logic
    })}
  </>
)}
```

### 3. Sidebar Navigation - Role Definitions

**File:** `src/components/layout/sidebar.tsx` (lines 163-167)

```typescript
export function Sidebar({ role = "salesperson" }: SidebarProps) {
  const isManager = role === "manager";
  const isAgencyAdmin = role === "agency_admin";
  const isContractor = role === "contractor";
  const pathname = usePathname();
```

### 4. Settings Nav Items Array

**File:** `src/components/layout/sidebar.tsx` (lines 78-106)

```typescript
const settingsNavItems: NavItem[] = [
  {
    href: "/settings/dealership",
    label: "Dealership",
    icon: (...),
  },
  {
    href: "/settings/users",
    label: "Team Members",
    icon: (...),
  },
  {
    href: "/settings/email",          // ← THE HIDDEN LINK
    label: "Email",
    icon: (...),
  },
];
```

### 5. Email Signature Model

**File:** `prisma/schema.prisma` (lines 451-468)

```typescript
model EmailSignature {
  id           String   @id @default(uuid())
  dealershipId String   @map("dealership_id")
  userId       String?  @map("user_id")  // ← null = dealership-wide, set = personal
  
  name         String
  content      String   // HTML content
  isDefault    Boolean  @default(false) @map("is_default")
  
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  
  dealership   Dealership @relation(fields: [dealershipId], references: [id])
  user         User?      @relation(fields: [userId], references: [id])
  
  @@index([dealershipId])
  @@index([userId])
}
```

### 6. Email Template Model

**File:** `prisma/schema.prisma` (lines 427-450)

```typescript
model EmailTemplate {
  id           String   @id @default(uuid())
  dealershipId String   @map("dealership_id")
  userId       String?  @map("user_id")  // ← null = dealership-wide, set = personal
  
  name        String
  subject     String
  bodyHtml    String   @map("body_html")
  bodyText    String?  @map("body_text")
  category    String   @default("custom")
  
  isActive    Boolean  @default(true) @map("is_active")
  
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  dealership  Dealership @relation(fields: [dealershipId], references: [id])
  user        User?      @relation(fields: [userId], references: [id])
  
  @@index([dealershipId])
  @@index([userId])
}
```

## Permission Check Patterns

### Pattern 1: Exclude Contractors

**Used in:** Email APIs (current approach)

```typescript
if (session.role === "contractor") {
  return NextResponse.json({ error: "..." }, { status: 403 });
}
// Continue for everyone else
```

Pros: Simple, explicit exclusion
Cons: Doesn't document what roles ARE allowed

### Pattern 2: Include Allowed Roles (Better)

**Could be used in:** Email APIs (recommended improvement)

```typescript
const ALLOWED_ROLES = ["salesperson", "manager", "tech", "content_creator", "agency_admin"];
if (!ALLOWED_ROLES.includes(session.role)) {
  return NextResponse.json({ error: "..." }, { status: 403 });
}
// Continue for allowed roles
```

Pros: Explicit about what IS allowed, easier to audit
Cons: More verbose

### Pattern 3: Use Helper Function

**Available in:** `src/lib/auth.ts`

```typescript
export function requireRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}
```

Usage:
```typescript
if (!requireRole(session.role, ["salesperson", "manager", "tech", "content_creator", "agency_admin"])) {
  return NextResponse.json({ error: "..." }, { status: 403 });
}
```

## Conditional Rendering in Sidebar

```typescript
// Conditional 1: Is user a contractor?
if (isContractor) {
  // Show contractor nav (My Requests only)
  render <contractorNavItems />
} else {
  // Show regular user nav (includes /email)
  render <navItems />
}

// Conditional 2: Is user manager or admin?
if (isManager || isAgencyAdmin) {
  // Show settings section (includes /settings/email)
  render <settingsNavItems />
}

// Conditional 3: Is user agency admin?
if (isAgencyAdmin) {
  // Show admin section
  render <adminNavItems />
}
```

**Problem:** Conditional 2 blocks salesperson from settings.
**Fix:** Change to `if (!isContractor)` for Conditional 2.

## User Type Hierarchy

```
Role Hierarchy:
┌─────────────────────────────────┐
│  Agency Admin (System-wide)     │
│  - Can do everything            │
│  - Manages all dealerships      │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│ Dealership Users (Dealership)   │
├─────────────────────────────────┤
│ - Manager                       │
│   • Can manage team             │
│   • Can access settings         │
│                                 │
│ - Salesperson                   │
│   • Can create/manage content   │
│   • CAN access email API ✅     │
│   • CANNOT see settings UI ❌   │
│                                 │
│ - Tech                          │
│   • Can manage technical items  │
│   • Same as salesperson for UI  │
│                                 │
│ - Content Creator               │
│   • Can manage content          │
│   • Same as salesperson for UI  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Contractor (Limited/External)   │
│ - Cannot manage dealership items│
│ - Can only see own requests     │
└─────────────────────────────────┘
```

## API Endpoint Accessibility Matrix

```
GET /api/email/signatures
├─ Salesperson ✅
├─ Manager ✅
├─ Tech ✅
├─ Content Creator ✅
├─ Agency Admin ✅
└─ Contractor ✅ (personal only)

POST /api/email/signatures (dealership-wide)
├─ Salesperson ✅
├─ Manager ✅
├─ Tech ✅
├─ Content Creator ✅
├─ Agency Admin ✅
└─ Contractor ❌

PUT /api/email/signatures/[id] (dealership-wide)
├─ Salesperson ✅
├─ Manager ✅
├─ Tech ✅
├─ Content Creator ✅
├─ Agency Admin ✅
└─ Contractor ❌

DELETE /api/email/signatures/[id] (dealership-wide)
├─ Salesperson ✅
├─ Manager ✅
├─ Tech ✅
├─ Content Creator ✅
├─ Agency Admin ✅
└─ Contractor ❌
```

Same pattern applies to templates.

## Session & Auth Objects

```typescript
// getSession() returns:
interface AuthUser {
  id: string;                           // User ID
  email: string;
  name: string;
  role: UserRole;                       // ← Role check happens here
  dealershipId: string | null;          // ← Used for data filtering
  mustChangePassword?: boolean;
  contractorDepartment?: ContractorDepartment | null;
}

// JWT Payload contains:
interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;                       // salesperson | manager | tech | etc.
  dealershipId: string | null;
  iat?: number;
  exp?: number;
}
```

## Data Scoping Pattern

Both EmailSignature and EmailTemplate use:

```typescript
// Dealership-wide item:
{
  dealershipId: "dealer-123",
  userId: null,                  // ← KEY: null means dealership-wide
  name: "Welcome Signature"
}

// Personal item:
{
  dealershipId: "dealer-123",
  userId: "user-456",            // ← KEY: set means personal to user
  name: "My Personal Signature"
}

// Query both (typical):
const where = {
  dealershipId: session.dealershipId,
  OR: [
    { userId: null },            // Dealership-wide
    { userId: session.userId },  // Personal
  ]
}
```

This design is elegant because:
1. Single table stores both scopes
2. Queries are simple and efficient
3. No separate tables or joins needed
4. Permissions naturally follow the structure

