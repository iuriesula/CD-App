# FCapp - Car Dealership CRM System Specification

## Overview

**FCapp** is a lightweight Customer Relationship Management (CRM) system purpose-built for classic car dealerships. The core philosophy is: **"The system is smart so the salesperson can be simple."** Salespeople work through a daily task list while the system handles the thinking—lead pipeline management, follow-up cadence, email threading, and document generation.

### Target Users

- **Salespeople**: Primary users who spend 80% of their time in "My Day" task list view
- **Dealership Managers**: Access to settings, team management, and dashboards
- **Agency Administrators**: Cross-dealership analytics and campaign optimization (for marketing agencies managing multiple classic car dealerships)
- **Contractors**: Specialized service providers (IT, Marketing, Content) with multi-dealership access for handling requests and tickets

### Current Phase

**Phase 3 - Contractor System & Requests** (completed Dec 22, 2024)

### Key Business Model

- Marketing agency operates the system
- Manages up to 10 classic car dealerships
- Each dealership has 1-3 salespeople
- Agency owner needs cross-dealership analytics to optimize Meta Ads campaigns
- Lead attribution from ads → form submissions → CRM → sales tracking

---

## Architecture Overview

### Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 16 (TypeScript, App Router) | Modern, performant, can become PWA for mobile |
| **UI Framework** | Tailwind CSS 4 | Rapid styling, utility-first, built-in dark mode support |
| **Drag & Drop** | @dnd-kit | Performant drag-drop for pipeline board |
| **Database** | PostgreSQL 16 | Traditional, portable, easy to migrate between servers |
| **ORM** | Prisma 7 | Type-safe database access, migrations, seedable |
| **Auth** | JWT (jose library) + httpOnly cookies | Self-contained, no third-party auth dependency |
| **Email** | IMAP/SMTP (nodemailer, mailparser) | Direct connection to dealership email providers |
| **Documents** | React-PDF | Generate buyer's orders, invoices, printable documents |
| **Deployment** | Docker Compose (local) → any VPS with PostgreSQL | Portable, reproducible environment |

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 16 Frontend                      │
│  (Tailwind CSS, @dnd-kit, React Query for state management)  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   Next.js API Routes                         │
│  (/api/leads, /api/tasks, /api/email, /api/documents, etc)  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  Prisma ORM Layer                            │
│  (Type-safe database access, migrations, relationships)      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              PostgreSQL 16 Database                          │
│  (Multi-tenant: dealership_id filters all queries)           │
└──────────────────────┬──────────────────────────────────────┘

External Integrations:
├─ Email Providers (Gmail, Titan, etc.) via IMAP/SMTP
├─ Meta Ads API (future Phase 4)
├─ WordPress Webhook (form submissions)
└─ DocuSeal (future digital signatures)
```

### Project Structure

```
/Users/iuriesula/CD-App/
├── fcapp/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/               # Login page, auth layout
│   │   │   ├── (dashboard)/          # Protected routes
│   │   │   │   ├── my-day/           # Daily task list (PRIMARY UI)
│   │   │   │   ├── pipeline/         # Kanban board with drag-drop
│   │   │   │   ├── leads/            # Lead list and detail views
│   │   │   │   │   ├── [id]/page.tsx # Lead detail (activities, tasks, documents)
│   │   │   │   ├── inventory/        # Vehicle management
│   │   │   │   ├── email/            # Gmail-style email client
│   │   │   │   ├── media/            # Media folder browser (Phase 2.5)
│   │   │   │   ├── settings/         # Manager/Admin settings
│   │   │   │   │   ├── dealership/   # Dealership info, branding, email config
│   │   │   │   │   ├── email/        # Email templates, signatures, SMTP/IMAP setup
│   │   │   │   │   └── users/        # Team management
│   │   │   │   ├── requests/         # Phase 3: Request/ticket system
│   │   │   │   │   ├── page.tsx      # Request list
│   │   │   │   │   └── [id]/page.tsx # Request detail with conversation
│   │   │   │   ├── contractor/       # Phase 3: Contractor dashboard
│   │   │   │   │   └── page.tsx      # Contractor landing page
│   │   │   │   └── admin/            # Agency admin only
│   │   │   │       ├── dealerships/  # Multi-dealership management
│   │   │   │       └── contractors/  # Phase 3: Contractor management
│   │   │   │           └── page.tsx  # List/create/edit contractors
│   │   │   └── api/                  # API routes (RESTful endpoints)
│   │   │       ├── auth/             # Login, logout, session, password
│   │   │       ├── leads/            # CRUD, merge, activities
│   │   │       ├── tasks/            # CRUD, completion
│   │   │       ├── vehicles/         # CRUD, search
│   │   │       ├── email/            # Inbox, send, parse, templates
│   │   │       ├── documents/        # CRUD, PDF generation
│   │   │       ├── users/            # CRUD (admin/manager)
│   │   │       ├── dealerships/      # CRUD, media, config
│   │   │       ├── contractors/      # Phase 3: CRUD, dealership access
│   │   │       ├── requests/         # Phase 3: CRUD, messages, attachments
│   │   │       └── shipping/         # Distance calculator
│   │   ├── components/
│   │   │   ├── ui/                   # Reusable: Button, Input, Badge, Card, Modal, etc
│   │   │   ├── layout/               # Sidebar, Header, Navigation
│   │   │   ├── pipeline/             # LeadCard, PipelineColumn, Kanban
│   │   │   ├── leads/                # LeadDetail, LeadForm, LeadCard
│   │   │   ├── tasks/                # TaskList, TaskCard
│   │   │   ├── email/                # EmailComposer, EmailList, EmailViewer
│   │   │   ├── documents/            # BuyersOrderBuilder, InvoiceBuilder
│   │   │   ├── media/                # MediaBrowser, ImageViewer, FolderTree
│   │   │   └── requests/             # Phase 3: RequestList, RequestDetail, MessageThread
│   │   ├── lib/
│   │   │   ├── db/                   # Prisma client instance
│   │   │   ├── auth.ts               # JWT creation, verification, password hashing
│   │   │   ├── leads.ts              # Lead business logic (stage changes, win probability)
│   │   │   ├── email.ts              # SMTP sending (nodemailer)
│   │   │   ├── email-receive.ts      # IMAP sync loop, lead linking
│   │   │   ├── email-parser.ts       # WordPress form parsing, Meta tracking extraction
│   │   │   ├── shipping.ts           # Distance calculation for shipping estimates
│   │   │   └── permissions.ts        # Phase 3: Contractor permissions, access validation
│   │   ├── contexts/                 # React Context (vehicle panel, etc)
│   │   ├── hooks/                    # Custom React hooks
│   │   └── types/
│   │       └── index.ts              # TypeScript enums, interfaces, stage config
│   ├── prisma/
│   │   ├── schema.prisma             # Complete database schema
│   │   ├── migrations/               # All migrations
│   │   └── seed.ts                   # Seed data for development
│   ├── public/
│   │   └── uploads/                  # File uploads (media, logos)
│   └── package.json
│
├── CLAUDE.md                          # Instructions for Claude Code
├── PROJECT_SPEC.md                    # This file - architectural documentation
├── README.md                          # Quick start guide
├── MYIDEAS.MD                         # Feature ideas backlog
└── docker-compose.yml                 # PostgreSQL container config
```

---

## Core Data Model

### Multi-Tenancy Architecture

Every single query filters by `dealership_id`. This isolation prevents cross-dealership data leaks:

```typescript
// Example: Get my tasks for today
const tasks = await prisma.task.findMany({
  where: {
    dealershipId: user.dealershipId,  // Always filter by dealership
    userId: user.id,
    dueDate: today
  }
});
```

**Exception**: `agency_admin` role has `dealershipId = null` and can query across all dealerships for analytics.

### Core Models

#### Dealership
- **Purpose**: Tenant isolation, settings, email configuration, branding
- **Key Fields**:
  - `name`, `address`, `city`, `state`, `zip`, `phone`, `email`, `website`
  - `logoUrl`, `brandColor` - Dealership branding
  - `smtpHost`, `smtpPort`, `smtpUser`, `smtpPassword` - Outgoing email config
  - `imapHost`, `imapPort`, `imapUser`, `imapPassword` - Incoming email config
  - `lastEmailSync`, `emailSyncEnabled` - IMAP polling tracking
  - `lastLeadAssignedToId` - Round-robin lead assignment state

#### User (Salesperson, Manager, Agency Admin, Contractor)
- **Purpose**: Authentication, role-based permissions, team organization
- **Roles**:
  - `salesperson` - Main user, access to My Day, Pipeline, Email, Leads
  - `tech` - Technical staff, access to settings and admin functions
  - `content_creator` - Can manage media and inventory
  - `manager` - Can access settings, team management, dashboards
  - `agency_admin` - Can access all dealerships, cross-dealership analytics
  - `contractor` - Service provider with multi-dealership access, department-specific permissions
- **Key Fields**:
  - `dealershipId` - NULL for agency_admin and contractor (contractors use multi-dealership access table)
  - `email`, `passwordHash` - Authentication
  - `voipExtension` - For future Yate PBX integration
  - `mustChangePassword` - Force password change on first login
  - `contractorDepartment` - Enum: `it`, `marketing`, `content` (only for contractor role)
- **Contractor Behavior**: Contractors have `dealershipId = NULL` and access multiple dealerships through `ContractorDealershipAccess` junction table

#### Lead (The Core Entity)
- **Purpose**: Prospect/customer record, pipeline stage tracking, contact information
- **Key Fields**:
  - **Pipeline**: `stage` (12-stage pipeline), `winProbability` (calculated from stage)
  - **Source & Attribution**:
    - `source` - how lead came in (meta_ad, website_form, phone_call, walk_in, referral, email)
    - `metaCampaignId`, `metaAdsetId`, `metaAdId`, `metaAccountId` - Facebook Ads attribution
    - `utmCampaign`, `utmSource`, `utmMedium` - UTM parameters from form submission
  - **Contact Info**:
    - `firstName`, `lastName`
    - `primaryEmail`, `primaryPhone`
    - `alternateEmails[]`, `alternatePhones[]` - Arrays for multiple contacts
    - `sourceIp` - IP from form submission (for geolocation, fraud detection)
  - **Interest**: `interestedVehicle` (free text), `vehicleId` (link to inventory)
  - **Follow-up Tracking**:
    - `attemptCount` - How many follow-up attempts (max 5)
    - `lastAttemptAt`, `nextFollowUpAt` - Schedule tracking
  - **Deduplication**: Unique constraint on `(dealershipId, primaryEmail)`

#### Activity (Audit Trail)
- **Purpose**: Complete history of every interaction
- **Activity Types**: `email_sent`, `email_received`, `call_outbound`, `call_inbound`, `call_missed`, `voicemail_left`, `note_added`, `stage_changed`, `document_sent`, `document_signed`
- **Structure**: Type-safe enum + flexible JSON `details` field
- **Indexed by**: `leadId` (for timeline), `createdAt` (for analytics)

#### Task (Daily Work)
- **Purpose**: Salesperson to-do list with auto-generation from follow-up cadence
- **Task Types**: `follow_up_call`, `follow_up_email`, `review_document`, `custom`
- **Key Fields**:
  - `leadId`, `userId`, `dealershipId` - Relationships
  - `dueDate`, `dueTime` - Scheduling
  - `isAutoGenerated` - Whether task was auto-created or manual
  - `attemptNumber` - For follow-up sequence (1-5)
  - `completed`, `completedAt` - Tracking

#### Vehicle (Inventory)
- **Purpose**: Car catalog, linked to leads, used in documents
- **Key Fields**:
  - `year`, `make`, `model`, `trim`, `vin` - Vehicle identification
  - `askingPrice`, `soldPrice` - Pricing
  - `status` - `available`, `pending`, `sold`, `reserved`
  - `mileage`, `exteriorColor`, `interiorColor`, `transmission`, `engine`, `description`
  - `photos[]` - JSON array of image URLs
  - `locationCity`, `locationState`, `locationZip` - For shipping calculator
  - `stockNumber` - Internal reference
  - `websiteDescription`, `technicalBulletpoints`, `callScript` - Sales info (Phase 2.5)

#### Email (In-App Email Client)
- **Purpose**: Store inbound/outbound emails, link to leads
- **Key Fields**:
  - `direction` - 'inbound' or 'outbound'
  - `fromAddress`, `toAddress`, `subject` - Email metadata
  - `bodyText`, `bodyHtml` - Content
  - `messageId`, `inReplyTo` - Email threading headers (RFC 5322)
  - `leadId` - Auto-linked to lead by email address matching
  - `isRead`, `isImportant`, `openedAt` - Read status and open tracking
  - `folder` - NULL=inbox, "spam", "trash" (for folder management)

#### Document (Buyer's Order, Invoice)
- **Purpose**: Generate, track, and manage legal documents
- **Document Types**: `buyers_order`, `invoice`, `loan_agreement`
- **Status**: `draft`, `sent`, `viewed`, `signed`
- **Key Fields**:
  - `filePath` - Local file path to generated PDF
  - `signatureRequestId` - From DocuSeal (future)
  - `sentAt`, `viewedAt`, `signedAt` - Status tracking

#### DealershipMedia (File Storage)
- **Purpose**: Store dealership files - logos, vehicle photos, media library
- **Key Fields**:
  - `type` - 'logo', 'banner', 'signature', 'general', 'folder'
  - `url` - Relative path to file (empty for folder entries)
  - `folder` - Hierarchical path (e.g., "2024 Inventory/Exterior")
  - `mimeType`, `size` - File metadata

#### EmailTemplate
- **Purpose**: Reusable email templates with variable placeholders
- **Categories**: `follow_up`, `introduction`, `offer`, `thank_you`, `car_description`, `custom`
- **Supports**: Variable placeholders for personalization

#### EmailSignature
- **Purpose**: Personal or dealership-wide signatures
- **Fields**: `isDefault` to mark signature auto-inserted in composer

#### MetaCampaignMapping
- **Purpose**: Link Facebook campaigns to dealerships (for analytics)
- **Maps**: `metaCampaignId` → `dealershipId` (for Phase 4 integration)

#### ContractorDealershipAccess (Phase 3)
- **Purpose**: Many-to-many junction table enabling contractors to access multiple dealerships
- **Key Fields**:
  - `contractorId` - References User with contractor role
  - `dealershipId` - References Dealership
  - `assignedAt` - Timestamp of access grant
  - `assignedBy` - User ID who granted access (typically agency_admin)
- **Relationships**:
  - Contractor User (one-to-many from User)
  - Dealership (one-to-many from Dealership)
- **Unique Constraint**: `(contractorId, dealershipId)` prevents duplicate access entries
- **Usage**: System checks this table to verify contractor can access dealership resources

#### Request (Phase 3)
- **Purpose**: Ticket/support request system with department routing for dealership-to-contractor communication
- **Key Fields**:
  - `title`, `description` - Request details
  - `department` - Enum: `it`, `marketing`, `content` - Routes to contractors in matching department
  - `priority` - Enum: `low`, `normal`, `high`, `urgent`
  - `status` - Enum: `open`, `in_progress`, `resolved`, `closed`
  - `requestedById` - User who created request (dealership staff)
  - `assignedToId` - Contractor assigned to handle request
  - `dealershipId` - Which dealership the request belongs to
  - `createdAt`, `updatedAt`, `closedAt` - Timestamps
- **Business Rules**:
  - Auto-status change: When assigned, status changes from `open` → `in_progress`
  - Auto-closed: When status changes to `resolved`, `closedAt` timestamp is set
  - Department routing: Only contractors with matching department can be assigned
  - Permissions: Contractor must have access to the dealership to view/respond
- **Relationships**:
  - Dealership (many-to-one)
  - Request creator User (many-to-one)
  - Assigned contractor User (many-to-one)
  - Messages (one-to-many to RequestMessage)
  - Attachments (one-to-many to RequestAttachment)

#### RequestMessage (Phase 3)
- **Purpose**: Conversation thread for each request, enabling back-and-forth communication
- **Key Fields**:
  - `requestId` - Parent request
  - `userId` - User who sent message (can be dealership staff or contractor)
  - `message` - Message content (text)
  - `isRead` - Read receipt tracking
  - `createdAt` - Timestamp
- **Features**:
  - Chronological ordering by `createdAt`
  - Read receipts to track when messages are viewed
  - Can attach files via RequestAttachment
- **Relationships**:
  - Request (many-to-one)
  - User (many-to-one)
  - Attachments (one-to-many to RequestAttachment)

#### RequestAttachment (Phase 3)
- **Purpose**: File attachments for requests and messages (screenshots, documents, specs)
- **Key Fields**:
  - `requestId` - Parent request (always required)
  - `messageId` - Nullable - specific message attachment belongs to (NULL = attached to request itself)
  - `fileName` - Original file name
  - `fileUrl` - Storage path/URL
  - `mimeType` - File type (image/png, application/pdf, etc)
  - `size` - File size in bytes
  - `uploadedAt` - Timestamp
- **Usage**:
  - Can attach files directly to request (initial request creation)
  - Can attach files to specific messages in conversation thread
  - Supports images, PDFs, documents, etc
- **Relationships**:
  - Request (many-to-one, required)
  - RequestMessage (many-to-one, optional)

#### CallLog (Future)
- **Purpose**: Store VoIP call records
- **Status**: `answered`, `missed`, `voicemail`, `busy`, `failed`
- **DID Rotation**: Track which DID was used for outbound calls

---

## Lead Pipeline & Win Probability

### 12-Stage Pipeline

| Stage # | Stage Name | Win % | Auto Follow-up | Notes |
|---------|-----------|--------|---|-------|
| 1 | `new_lead` | 10% | YES | Auto-generated first follow-up task |
| 2 | `interested` | 25% | NO | Customer responded with interest |
| 3 | `negotiating` | 50% | NO | Price discussion in progress |
| 4 | `buyers_order_sent` | 65% | Optional | Buyer's Order document sent |
| 5 | `buyers_order_signed` | 80% | NO | Legally binding agreement signed |
| 6 | `invoice_sent` | 90% | NO | Payment invoice sent |
| 7 | `won_invoice_paid` | 100% | NO | Customer paid - deal won |
| 8 | `won_preparing` | 100% | NO | Vehicle being prepared for shipment |
| 9 | `won_ready_to_ship` | 100% | NO | Vehicle ready, awaiting carrier |
| 10 | `won_arrived` | 100% | NO | Vehicle delivered to customer |
| 11 | `lost` | 0% | NO | Lost to competitor or customer declined |
| 12 | `lost_unanswered` | 0% | NO | Auto-lost after 5 follow-up attempts |

**Calculation Logic**:
- Win probability updates automatically when stage changes
- Used for pipeline forecasting and sales analytics
- Dashboard shows weighted pipeline value

---

## Follow-Up Cadence (5-Attempt System)

### Rules

When a lead is created with `stage = new_lead`:

1. **Create Initial Task**: "Initial contact - Attempt 1" due immediately
2. **Salesperson completes task** with outcome:
   - ✅ **Responded**: Stage changes to `interested`, clear `attemptCount`
   - ❌ **No response**: Increment `attemptCount`, schedule next attempt

### Attempt Timing

| Transition | Days After | Reasoning |
|-----------|-----------|-----------|
| Attempt 1 → 2 | +1 day | Quick first follow-up |
| Attempt 2 → 3 | +2 days | Second chance |
| Attempt 3 → 4 | +3 days | Extended window |
| Attempt 4 → 5 | +3 days | Final attempt |
| Attempt 5 (no response) | Auto-lost | Set stage = `lost_unanswered` |

### Implementation

When task is marked complete with "no response":
```typescript
// Increment attempt
lead.attemptCount++

// Calculate next attempt timing
if (lead.attemptCount < 5) {
  const daysToAdd = {
    1: 1, 2: 2, 3: 3, 4: 3, 5: 0  // After 5, leads go stale
  }[lead.attemptCount]

  lead.nextFollowUpAt = addDays(now, daysToAdd)

  // Create next task
  createTask({
    leadId: lead.id,
    title: `Follow-up - Attempt ${lead.attemptCount + 1}`,
    dueDate: lead.nextFollowUpAt
  })
} else {
  // Mark as lost
  lead.stage = 'lost_unanswered'
  lead.closedAt = now
  lead.nextFollowUpAt = null
}
```

---

## Key Features & Workflows

### Phase 1: Core CRM (COMPLETED)

#### 1. Pipeline Board (Kanban View)
- **Route**: `/pipeline`
- **Layout**: 12 horizontal columns (one per stage)
- **Interactions**:
  - Drag cards between columns to change stage
  - Backward stage changes require confirmation (e.g., moving from "invoice_sent" back to "negotiating")
  - Stage change is auto-logged as Activity
  - Win probability updates immediately
- **Card Display**:
  - Lead name, interested vehicle, days in stage
  - Next task due indicator
  - Source icon (Meta, phone, form, etc)
  - Assigned salesperson

#### 2. "My Day" Task List (PRIMARY INTERFACE)
- **Route**: `/my-day`
- **Purpose**: Where salespeople spend 80% of time
- **Grouping**:
  - Overdue tasks (red background)
  - Due today (yellow background)
  - Upcoming (gray background)
- **Each Task Card Shows**:
  - Lead name, phone, email
  - Task title ("Follow-up call - Attempt 2 of 5")
  - Time due (if set)
  - Quick action buttons
- **Quick Actions** (in-place, no modals):
  - 📞 Call → Initiates VoIP (future)
  - ✉️ Email → Opens composer modal
  - ✅ Mark Complete → Outcome dialog
  - ❌ No Response → Increments attempt, schedules next
- **Outcome Dialog**:
  - "Did they respond?"
  - Yes → Move to `interested`, clear attempts
  - No → Increment attempts, schedule next task
  - Callback → Custom callback time

#### 3. Lead Detail Page
- **Route**: `/leads/[id]`
- **Tabs/Sections**:
  - **Header**: Name, stage badge, win probability, click-to-call/email buttons
  - **Contact Info**: Primary & alternate emails/phones, location
  - **Interest**: Interested vehicle dropdown, link to inventory
  - **Activity Timeline**: Chronological log of all interactions with timestamps
  - **Notes**: Free-form text area with auto-save
  - **Tasks**: Upcoming tasks for this lead
  - **Documents**: Buyer's Orders, Invoices with status badges
  - **Shipping Calculator**: Estimate cost/days to customer location
  - **Edit**: Can edit all contact fields inline

#### 4. Lead Management
- **Deduplication**: On creation, check if lead exists by email/phone
  - If found: Offer to merge or create anyway
- **Merge Logic**:
  - Keep primary info from "winner" lead
  - Add "loser" emails/phones to alternate arrays
  - Combine activity histories
  - Keep higher stage (further in pipeline)
  - Sum attempt counts if both in `new_lead` stage
  - Delete loser record
- **Lead Creation**: Can be:
  - Manual from form
  - Auto from WordPress form submission
  - Auto from incoming email

#### 5. Task System
- **Auto-generated Tasks**: From follow-up cadence (5-attempt system)
- **Manual Tasks**: Create custom tasks for any lead
- **Task List API**: `/api/tasks?due_date=today`
- **Completion Tracking**: Logs activity, calculates next action
- **Deletion**: Users can delete tasks (soft delete or hard delete TBD)

---

### Phase 1.5: Inventory System (COMPLETED)

#### Vehicle Management
- **Route**: `/inventory`
- **Features**:
  - Table view with status badges (available, pending, sold, reserved)
  - Add/edit/delete vehicles with comprehensive form
  - Fields: Year, Make, Model, VIN, Asking Price, Mileage, Colors, Transmission, Engine, Description, Stock Number
  - Photos array (URLs)
  - Sales info: Website description, technical bulletpoints, call script

#### Vehicle Linking to Leads
- **On Lead Detail**: Dropdown to link lead to vehicle
- **In Documents**: Auto-populate vehicle data in Buyer's Order and Invoice

#### Shipping Calculator
- **Route**: Built into lead detail page
- **Inputs**: Lead ZIP code, vehicle location ZIP code
- **Outputs**:
  - Distance (miles)
  - Open transport price range (e.g., "$1,200 - $1,600")
  - Enclosed transport price range (e.g., "$1,800 - $2,200")
  - Estimated delivery days
- **Algorithm**: Uses ZIP code region distance lookup

---

### Phase 1.6: Admin & Settings (COMPLETED)

#### Agency Admin Dashboard
- **Route**: `/admin/dealerships`
- **Functions**:
  - View all dealerships managed by agency
  - Create new dealership (auto-creates manager user)
  - Edit dealership info
  - Delete dealership
- **Access**: `agency_admin` role only

#### Manager Settings
- **Route**: `/settings/dealership`
- **Functions**:
  - Edit dealership name, address, phone, email, website
  - Manage multiple phone numbers
  - Manage multiple email addresses
  - Upload dealership logo
  - Select brand color (hex color picker)
  - Configure time zones (for header clock)

#### Team Management
- **Route**: `/settings/users`
- **Functions**:
  - Create user with role selection (salesperson, tech, content_creator, manager)
  - Pause/Activate user access
  - Reset user password (they get temporary password)
  - Delete user
  - Change user role
- **Access**: `manager` or `agency_admin` only

#### Email Configuration
- **Route**: `/settings/email`
- **Functions**:
  - Configure SMTP (outgoing): host, port, username, password, SSL/TLS toggle
  - Configure IMAP (incoming): host, port, username, password, SSL/TLS toggle
  - Test SMTP connection (send test email)
  - Test IMAP connection (fetch test emails)
  - Enable/disable email sync loop
  - Manage email templates
  - Manage email signatures
- **SSL/TLS**: Configurable per dealership

#### Role-Based Access Control

| Role | My Day | Pipeline | Leads | Email | Inventory | Media | Documents | Settings | Admin | Requests |
|------|--------|----------|-------|-------|-----------|-------|-----------|----------|-------|----------|
| salesperson | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ (create/view own) |
| tech | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ (create/view) |
| content_creator | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ (create/view own) |
| manager | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ (full access) |
| agency_admin | ✅ (all) | ✅ (all) | ✅ (all) | ✅ (all) | ✅ (all) | ✅ (all) | ✅ (all) | ✅ (all) | ✅ | ✅ (full access) |
| contractor (IT) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ (IT dept only) |
| contractor (Content) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ (Content dept only) |
| contractor (Marketing) | ❌ | ❌ | ✅ (view) | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ (Marketing dept only) |

**Phase 3 Notes**:
- Contractors have department-based permissions defined in `/src/lib/permissions.ts`
- Contractors can only view/respond to requests in their department
- Contractors must have explicit dealership access via `ContractorDealershipAccess` table
- Managers and agency admins can assign requests to contractors

---

### Phase 2: Email System (COMPLETED)

#### Email Client
- **Route**: `/email`
- **Layout**: Gmail/Outlook-style 3-panel view
  - Left: Folder tree (Inbox, Sent, All Mail, Spam, Trash, custom folders)
  - Middle: Email list with preview
  - Right: Full email viewer
- **Features**:
  - Read/unread status
  - Star/important flag
  - Move to Spam/Trash
  - Restore from Spam/Trash
  - Search emails
  - Reply to email (Ctrl+Enter to send)
  - Email threading (In-Reply-To headers)
- **Composer**:
  - Rich text editor (HTML)
  - Template dropdown (select from saved templates)
  - Signature auto-insertion (from default signature)
  - To/CC/BCC fields
  - 10-second send delay with undo button
  - Insert images from media library

#### Email Sync Loop
- **Method**: IMAP polling
- **Frequency**: Configurable per dealership (default: every 5 minutes)
- **Process**:
  1. Connect to IMAP server
  2. Fetch new messages since last sync
  3. Parse sender/recipient/subject/body
  4. Auto-link to lead by email address matching
  5. If no lead found, optionally create new lead from email
  6. Store in database
  7. Mark as read on remote (optional)
- **Tracking**: `lastEmailSync` timestamp in dealership record

#### Email-to-Lead Auto-Linking
- **Trigger**: Email received via IMAP
- **Logic**:
  ```typescript
  const lead = await findLead(dealershipId, senderEmail)
  // Search: primaryEmail OR senderEmail in alternateEmails
  if (lead) {
    email.leadId = lead.id
  } else if (createAutoLead) {
    // Create new lead from email metadata
    lead = await createLead({
      dealershipId,
      firstName: extractFirstName(senderName),
      lastName: extractLastName(senderName),
      primaryEmail: senderEmail,
      source: 'email',
      interestedVehicle: extractVehicleFromSubject(subject)
    })
    email.leadId = lead.id
  }
  ```

#### WordPress Form Integration
- **Purpose**: Auto-create leads from website inquiries
- **Setup**: Fluent Forms PRO sends email to dealership inbox
- **Email Format**: Subject starts with `[LEAD]`, body contains structured form data
- **Parsed Fields**:
  - Name, Email, Phone
  - Vehicle (from form)
  - Message body
  - **Meta Tracking**: Campaign ID, Ad Set ID, Ad ID, Account ID, UTM params
  - IP address, browser, OS/platform
- **Process**:
  1. Email received via IMAP
  2. Parser detects `[LEAD]` prefix
  3. Extracts form fields using regex
  4. **Meta attribution**: Maps to lead fields
  5. **Auto-assignment**: Round-robin to salespeople (if configured)
  6. **Deduplication**: Skip if lead with same email exists
  7. **Vehicle linking**: Search inventory by vehicle name in form
- **Meta Ads Tracking**:
  - Stores `metaCampaignId`, `metaAdsetId`, `metaAdId`, `metaAccountId`
  - Stores `utmCampaign`, `utmSource`, `utmMedium`
  - Enables attribution analysis in Phase 4

#### Email Templates
- **Categories**: follow_up, introduction, offer, thank_you, car_description, custom
- **Variables**: Support placeholders like `{firstName}`, `{lastName}`, `{vehicleName}`, etc
- **CRUD**: Create, edit, delete templates from `/settings/email`
- **Usage**: Select template in composer to auto-fill subject and body

#### Email Signatures
- **Types**: Personal (user-specific) or dealership-wide
- **Default**: One signature marked as default (auto-inserted in composer)
- **HTML Support**: Rich formatting, images, branding

#### Open Tracking
- **Method**: Tracking pixel embedded in HTML emails
- **Process**:
  1. When sending email, include hidden img tag: `<img src="/api/email/track/{emailId}" />`
  2. When recipient opens email, pixel loads
  3. On pixel load, update `openedAt` timestamp
  4. Activity logged: `email_opened`
- **Note**: Not reliable (many email clients block pixels), but gives rough indicator

---

### Phase 2.5: Media Management (COMPLETED - Dec 22, 2024)

#### Media Module Features
- **Route**: `/media`
- **Purpose**: Organize and store dealership assets (vehicle photos, documents, signatures)
- **Storage**: Public uploads folder with hierarchical folder structure

#### Folder Structure
- **Hierarchical Organization**: Supports nested folders (e.g., "2024 Inventory/Exterior/Car123")
- **Folder Operations**:
  - Create folder
  - Rename folder
  - Move folder (drag-drop)
  - Delete folder (recursive - deletes all contents)
  - Upload to folder
- **Breadcrumb Navigation**: Shows current folder path, click to navigate

#### File Upload
- **Drag & Drop**: Drop files or folders into browser
- **Folder Upload**: Upload entire folder preserving structure (NEW - Dec 22)
- **Batch Upload**: Upload multiple files at once
- **File Types**: All types supported (images, PDFs, documents)

#### Image Viewer
- **Modal Viewer**: Full-screen lightbox (NEW - Dec 22)
- **Controls**:
  - Zoom: 0.25x to 5x (buttons or wheel scroll)
  - Pan: Drag when zoomed
  - Keyboard shortcuts:
    - Arrow keys: Next/Previous image
    - `+` / `-`: Zoom in/out
    - `Esc`: Close viewer
  - Next/Previous buttons for navigation
  - Download button (original file)
  - Display image dimensions
- **Performance**: Optimized for large images, smooth zoom/pan

#### Insert Images into Emails
- **Feature**: Rich email composer with visual image insertion (NEW - Dec 22)
- **Workflow**:
  1. Click "Insert Image" button in composer
  2. Media picker modal opens with search
  3. Multi-select images from library
  4. Images render as visual thumbnails in email body
  5. Can reorder, delete images from email
  6. Email sends with images inline
- **Gmail-Style**: Visual email composition like Gmail
- **Availability**: Works in main email module and lead detail composer

#### Dealership Media Management
- **Scoping**: Each dealership has separate media library
- **Cleanup**: Deleted files/folders removed from filesystem
- **Permissions**: All authenticated users in dealership can access media

---

### Phase 2.75: Documents & Invoicing (COMPLETED - Dec 5, 2024)

#### Buyer's Order Builder
- **Route**: `/leads/[id]` → Documents tab → Generate Buyer's Order
- **Modes**:
  - **Wizard Mode** (recommended): Step-by-step form with 5 steps
  - **Full Form Mode**: All fields on one page
- **Wizard Steps**:
  1. Select vehicle (from inventory)
  2. Enter vehicle details (auto-populated from inventory)
  3. Enter customer info (auto-populated from lead)
  4. Enter salesperson & dealership info (auto-populated)
  5. Review & generate
- **Fields**:
  - Vehicle: Year, Make, Model, VIN, Asking Price
  - Buyer: Name, Address, Phone, Email
  - Dealer: LLC Name, DBA (Doing Business As), Address, Phone
  - Salesperson: Name, signature placeholder
  - Terms: Color, additional notes
- **Formatting**:
  - **LLC/DBA Display**: "**LLC Name** DBA *Dealership Name*"
  - Professional A4 print layout
  - Dealership brand color used (from settings)
- **PDF Generation**: React-PDF generates printable PDF
- **Status Tracking**: Updates document model with status (draft → sent)

#### Invoice Builder
- **Route**: `/leads/[id]` → Documents tab → Generate Invoice
- **Modes**: Wizard (5 steps) + Full Form
- **Wizard Steps**:
  1. Select linked Buyer's Order
  2. Enter LLC/DBA info
  3. Select payment method (Wire Transfer or Cashier's Check)
  4. Enter amount due
  5. Review & generate
- **Payment Methods**:
  - **Wire Transfer**: Bank account name, account number, routing number, bank name, branch info
  - **Cashier's Check**: Bank name, address, ZIP code
- **Fields**:
  - Amount due, amount paid, balance
  - Customer info (from lead)
  - Vehicle info
  - Description (auto-populated from Buyer's Order if linked)
  - Payment instructions based on method
- **Formatting**:
  - Professional layout with dealership branding
  - Buyer's Order number in description: "Payment as per Buyer's Order Number XXX"
  - Clear payment section with wire transfer or check details
- **Addresses**:
  - Dealership address in header (shipping address)
  - LLC address in payment section (separate address if different)

#### Document Status Tracking
- **Statuses**: draft, sent, viewed, signed
- **Workflow**:
  1. Generate document → status = `draft`
  2. Send to customer → status = `sent`, `sentAt` timestamp
  3. Customer opens → status = `viewed`, `viewedAt` timestamp (if tracking enabled)
  4. Customer signs → status = `signed`, `signedAt` timestamp
- **Activity Logging**: Each status change logged as activity

#### Future Document Features
- [ ] DocuSeal integration for digital signatures
- [ ] Loan agreement template
- [ ] Document expiration tracking
- [ ] Signature request reminders

---

### Phase 3: Contractor System & Requests (COMPLETED - Dec 22, 2024)

Phase 3 introduces a comprehensive contractor management and request ticketing system, enabling the marketing agency to provide specialized services (IT, Marketing, Content) across multiple dealerships.

#### Contractor Role System

**Purpose**: Enable specialized service providers to access multiple dealerships with department-scoped permissions.

**Contractor Departments**:
- **IT**: Full technical access (settings, users, email configuration, media, inventory, dealership config)
- **Content**: Media library and inventory management only
- **Marketing**: Leads, email templates, and media access

**Key Features**:
- **Multi-Dealership Access**: Contractors can be assigned to multiple dealerships via `ContractorDealershipAccess` table
- **Department-Based Permissions**: Each department has specific resource access defined in `/src/lib/permissions.ts`
- **Contractor Creation**: Agency admins create contractors with department selection
- **Access Management**: Agency admins grant/revoke dealership access per contractor
- **No Dealership Association**: Contractors have `dealershipId = NULL` (unlike regular users)

**Permission System** (`/src/lib/permissions.ts`):
```typescript
CONTRACTOR_PERMISSIONS = {
  it: ["settings", "users", "media", "email", "inventory", "dealership_config"],
  content: ["media", "inventory"],
  marketing: ["leads", "email_templates", "media"]
}
```

**Contractor Dashboard**:
- **Route**: `/contractor` (contractor-specific landing page)
- **Features**:
  - View all assigned dealerships
  - Quick access to requests by dealership
  - Department-specific tools
  - Request queue filtered by department

#### Request/Ticket System

**Purpose**: Dealership staff can create support requests that route to contractors based on department.

**Request Lifecycle**:
1. **Creation**: Dealership user creates request with:
   - Title, description
   - Department (IT, Marketing, Content)
   - Priority (low, normal, high, urgent)
   - Optional file attachments
   - Status: `open`

2. **Assignment**: Manager or agency admin assigns request to contractor:
   - System validates contractor has correct department
   - System validates contractor has access to dealership
   - Status auto-changes: `open` → `in_progress`

3. **Communication**: Conversation thread via RequestMessage:
   - Both parties can send messages
   - File attachments per message
   - Read receipts track message viewing
   - Chronological timeline

4. **Resolution**: Contractor marks as resolved:
   - Status changes: `in_progress` → `resolved`
   - `closedAt` timestamp set automatically
   - Dealership user can close: `resolved` → `closed`

**Request Status Workflow**:
```
open → in_progress → resolved → closed
  ↑         ↓
  └─────────┘ (can reopen if needed)
```

**Request UI** (`/requests`):
- **List View**: All requests with filters:
  - Status filter (open, in_progress, resolved, closed)
  - Department filter (IT, Marketing, Content)
  - Priority badges (color-coded)
  - Assigned contractor display
  - Last message preview

- **Detail View** (`/requests/[id]`):
  - Request header: title, status badge, priority, department
  - Request description
  - Assigned contractor info
  - Conversation thread (messages chronological)
  - Message composer with file upload
  - Attachments gallery
  - Status change controls (based on permissions)
  - Assignment controls (managers only)

**Permissions & Access Control**:
- **Create Requests**: Dealership staff (salesperson, manager, tech, content_creator)
- **View Request**:
  - Request creator
  - Assigned contractor
  - Contractors in same department (with dealership access)
  - Dealership managers
- **Assign Requests**: Managers, agency admins
- **Update Status**: Assigned contractor, request creator, agency admin
- **Send Messages**: Anyone who can view the request

**Department Routing**:
- Requests tagged with department
- Only contractors with matching department can be assigned
- System validates department match during assignment
- Contractors see only requests for their department(s)

#### Multi-Dealership Contractor Access

**Access Management** (`/admin/contractors`):
- **Agency Admin Only**: Only agency admins can manage contractors
- **Contractor List**: View all contractors with departments
- **Create Contractor**:
  - Email, name, password
  - Select department (IT, Marketing, Content)
  - Optionally assign dealerships immediately
- **Edit Contractor**: Change name, email, department
- **Manage Dealership Access**:
  - View assigned dealerships
  - Add dealership access (button → modal → select dealership)
  - Remove dealership access (confirm dialog)
  - Track assignment date and assigner
- **Deactivate Contractor**: Pause access without deletion

**ContractorDealershipAccess Table**:
- **Junction Table**: Many-to-many relationship
- **Fields**: contractorId, dealershipId, assignedAt, assignedBy
- **Unique Constraint**: Prevents duplicate access
- **Cascade Delete**: Removing contractor removes all access records

**Access Validation Functions** (`/src/lib/permissions.ts`):
- `contractorHasDealershipAccess(contractorId, dealershipId)` - Check if contractor can access dealership
- `getContractorDealerships(contractorId)` - Get all dealerships contractor can access
- `contractorHasPermission(department, resource)` - Check if department can access resource

**Contractor Experience**:
1. Contractor logs in
2. Sees dashboard with all assigned dealerships
3. Can switch context between dealerships
4. Sees requests from all accessible dealerships (filtered by department)
5. Can perform department-allowed actions (settings, media, inventory, etc)
6. Cannot access features outside department scope

#### Integration with Existing Modules

**Settings Access** (IT contractors only):
- Can modify dealership settings
- Can manage users
- Can configure email (SMTP/IMAP)
- Can upload branding assets

**Media Library Access** (All contractor types):
- IT: Full access
- Content: Full access
- Marketing: Read access, upload allowed

**Inventory Access** (IT & Content contractors):
- Can create/edit/delete vehicles
- Can manage vehicle photos
- Can update vehicle descriptions

**Email Templates** (Marketing contractors):
- Can create/edit email templates
- Can manage signatures
- Cannot access actual email inbox

**Lead Access** (Marketing contractors only):
- Can view leads
- Can see lead pipeline
- Cannot modify lead stages directly

---

## Database Schema

### Key Relationships

```
Dealership (1) ─── (many) User
           ├─ (many) Lead
           ├─ (many) Task
           ├─ (many) Email
           ├─ (many) Document
           ├─ (many) Vehicle
           ├─ (many) EmailTemplate
           ├─ (many) EmailSignature
           ├─ (many) DealershipMedia
           ├─ (many) MetaCampaignMapping
           ├─ (many) ContractorDealershipAccess (Phase 3)
           └─ (many) Request (Phase 3)

User ────────── (many) Lead (assigned)
    ├─ (many) Activity
    ├─ (many) Task
    ├─ (many) Email
    ├─ (many) CallLog
    ├─ (many) ContractorDealershipAccess (contractors only - Phase 3)
    ├─ (many) Request (as creator - Phase 3)
    ├─ (many) Request (as assigned contractor - Phase 3)
    └─ (many) RequestMessage (Phase 3)

Lead ────────── (1) Vehicle
    ├─ (many) Activity
    ├─ (many) Task
    ├─ (many) Document
    ├─ (many) Email
    └─ (many) CallLog

Request (Phase 3) ────── (many) RequestMessage
                  ├─ (many) RequestAttachment
                  ├─ (1) Dealership
                  ├─ (1) User (creator)
                  └─ (1) User (assigned contractor)

RequestMessage (Phase 3) ─── (many) RequestAttachment
                       ├─ (1) Request
                       └─ (1) User
```

### Indexing Strategy

**Performance Optimization**:
- `Lead`: Indexed on `dealershipId`, `stage`, `assignedToId`, `primaryPhone`, `nextFollowUpAt`
- `Task`: Indexed on `userId, dueDate` (for "My Day" query)
- `Activity`: Indexed on `leadId`, `createdAt` (for timeline)
- `Email`: Indexed on `leadId`, `userId`, `folder`
- `DealershipMedia`: Indexed on `dealershipId, folder`
- `ContractorDealershipAccess`: Indexed on `contractorId`, `dealershipId`, composite unique `(contractorId, dealershipId)`
- `Request`: Indexed on `dealershipId`, `department`, `status`, `assignedToId`, `createdAt`
- `RequestMessage`: Indexed on `requestId`, `createdAt`
- `RequestAttachment`: Indexed on `requestId`, `messageId`

---

## API Endpoints

### Authentication

```
POST   /api/auth/login              # { email, password } → { token, user }
POST   /api/auth/logout             # Clear session
GET    /api/auth/me                 # Current user info
POST   /api/auth/change-password    # { oldPassword, newPassword }
GET    /api/auth/session            # Check if authenticated
```

### Leads

```
GET    /api/leads                   # List (with filters: stage, assigned, dateRange, search)
POST   /api/leads                   # Create (with deduplication check)
GET    /api/leads/:id               # Get single lead
PUT    /api/leads/:id               # Update lead
DELETE /api/leads/:id               # Delete lead
PUT    /api/leads/:id/stage         # Change stage (auto-log activity, update win_probability)
POST   /api/leads/:id/merge         # Merge with another lead
GET    /api/leads/duplicates        # Find potential duplicates (same email/phone)
```

### Activities

```
GET    /api/leads/:id/activities    # Timeline for lead
POST   /api/leads/:id/activities    # Log manual activity (note, call, etc)
```

### Tasks

```
GET    /api/tasks                   # My tasks (with filters)
GET    /api/tasks/today             # Today's tasks
POST   /api/tasks                   # Create task
PUT    /api/tasks/:id               # Update task
PUT    /api/tasks/:id/complete      # Mark complete (with outcome: responded/no_response/callback)
DELETE /api/tasks/:id               # Delete task
```

### Vehicles

```
GET    /api/vehicles                # List inventory
POST   /api/vehicles                # Create vehicle
GET    /api/vehicles/:id            # Get single vehicle
PUT    /api/vehicles/:id            # Update vehicle
DELETE /api/vehicles/:id            # Delete vehicle
GET    /api/shipping/estimate       # Calculate shipping cost/time
```

### Email

```
GET    /api/email/inbox             # List emails (with folder filtering)
GET    /api/email/:id               # Get single email
POST   /api/email                   # Send email
PUT    /api/email/:id               # Mark read, move folder, etc
DELETE /api/email/:id               # Delete email
GET    /api/email/track/:id         # Open tracking pixel (hits this when email opened)
POST   /api/email/test-smtp         # Test SMTP connection
POST   /api/email/signatures        # CRUD signatures
GET    /api/email/templates         # List templates
POST   /api/email/templates         # Create template
```

### Documents

```
GET    /api/documents               # List documents
POST   /api/documents               # Create/generate document
GET    /api/documents/:id           # Get single document
PUT    /api/documents/:id           # Update document
GET    /api/documents/:id/pdf       # Download PDF
PUT    /api/documents/:id/send      # Send document (mark sent)
```

### Users (Admin/Manager)

```
GET    /api/users                   # List users (filtered by dealership)
POST   /api/users                   # Create user
GET    /api/users/:id               # Get single user
PUT    /api/users/:id               # Update user
DELETE /api/users/:id               # Delete user
```

### Dealerships (Admin)

```
GET    /api/dealerships             # List all dealerships (admin only)
POST   /api/dealerships             # Create dealership (admin only)
GET    /api/dealerships/:id         # Get dealership
PUT    /api/dealerships/:id         # Update dealership
DELETE /api/dealerships/:id         # Delete dealership
PUT    /api/dealerships/:id/email-config  # Update SMTP/IMAP settings
PUT    /api/dealerships/:id/branding      # Update logo, brand color
POST   /api/dealerships/:id/media         # Upload media
```

### Contractors (Admin Only - Phase 3)

```
GET    /api/contractors                              # List all contractors
POST   /api/contractors                              # Create contractor (with department)
GET    /api/contractors/:id                          # Get contractor details
PUT    /api/contractors/:id                          # Update contractor (name, email, department)
DELETE /api/contractors/:id                          # Delete contractor
POST   /api/contractors/:id/dealerships              # Grant dealership access
GET    /api/contractors/:id/dealerships              # List contractor's dealerships
DELETE /api/contractors/:id/dealerships/:dealershipId  # Revoke dealership access
```

### Requests (Phase 3)

```
GET    /api/requests                                 # List requests (filtered by permissions)
POST   /api/requests                                 # Create request (dealership staff)
GET    /api/requests/:id                             # Get request details
PUT    /api/requests/:id                             # Update request (title, description, priority)
DELETE /api/requests/:id                             # Delete request (admin only)
PUT    /api/requests/:id/status                      # Update request status (open/in_progress/resolved/closed)
PUT    /api/requests/:id/assign                      # Assign contractor to request (manager/admin)
GET    /api/requests/:id/messages                    # Get conversation messages
POST   /api/requests/:id/messages                    # Send message in conversation
PUT    /api/requests/:id/messages/:messageId/read    # Mark message as read
GET    /api/requests/:id/attachments                 # Get all attachments
POST   /api/requests/:id/attachments                 # Upload attachment (to request or message)
DELETE /api/requests/:id/attachments/:attachmentId   # Delete attachment
```

---

## Security Model

### Authentication

- **Method**: JWT (JSON Web Tokens) using jose library
- **Storage**: httpOnly cookie (secure, not accessible to JavaScript)
- **Duration**: 7 days (configurable)
- **Refresh**: Automatic on page reload if valid

### Authorization

- **Role-Based Access Control (RBAC)**:
  - Routes check user role before rendering
  - API endpoints check role and dealershipId filter
  - Middleware enforces authentication on all `/dashboard` routes

### Data Isolation

- **Multi-Tenancy**:
  - Every query includes `WHERE dealershipId = user.dealershipId`
  - Agency admins have `dealershipId = NULL` and can query across
  - Impossible to leak data between dealerships through normal queries

### Password Security

- **Hashing**: bcryptjs with salt rounds = 10
- **Reset**: Temporary password generated, user forced to change on next login
- **Change**: Old password verified before allowing new password

### Email Credentials

- **Encryption**: SMTP/IMAP passwords stored in plaintext (TBD: implement encryption)
- **Scope**: Only accessible to users within dealership
- **Future**: Add credentials encryption in database

---

## UI/UX Principles

### Core Design Philosophy

1. **"My Day" is home** - Salespeople land on task list, work from there (80% of usage)
2. **One-click actions** - Call, email, complete = single click from task card
3. **Minimal navigation** - Two main views: My Day + Pipeline
4. **Fast** - Page loads under 1 second, no spinners for basic actions
5. **Paper simple** - If paper was good enough, this should feel equally light
6. **Mobile friendly** - Works on phones, but desktop-first (Windows PCs at desks)

### Navigation Structure

```
Dashboard Layout:
├─ Header
│  ├─ Logo/Branding
│  ├─ Time zone clocks (configurable)
│  ├─ Current user
│  └─ Settings/Logout
├─ Sidebar (collapsible)
│  ├─ My Day (primary - not for contractors)
│  ├─ Pipeline (not for contractors)
│  ├─ Leads (limited for marketing contractors)
│  ├─ Inventory (IT & content contractors)
│  ├─ Email (not for contractors)
│  ├─ Media (Phase 2.5 - all contractors)
│  ├─ Documents (not for contractors)
│  ├─ Requests (Phase 3 - all roles)
│  ├─ Contractor Dashboard (Phase 3 - contractors only)
│  ├─ Settings (if manager or IT contractor)
│  └─ Admin (if agency_admin)
│     ├─ Dealerships
│     └─ Contractors (Phase 3)
└─ Main Content Area
   └─ Current page
```

### Color Scheme

- **Primary**: Dealership brand color (from settings)
- **Neutral**: Tailwind grays
- **Status Colors**:
  - **Red**: Overdue, Lost, High priority
  - **Yellow/Amber**: Due today, In progress
  - **Green**: Won, Completed
  - **Blue**: New, Neutral

### Form Design

- **Modals**: Used for creation/editing (overlay with backdrop)
- **Inline Editing**: Used for quick changes (single field edits)
- **Validation**: Real-time with helpful error messages
- **Accessibility**: Labels, error states, keyboard navigation

---

## Known Issues & Technical Debt

### Critical Issues (Fix First)

1. **Automatic Lead Assignment Not Working** (Priority: HIGH)
   - **Description**: New leads from WordPress form submissions should auto-assign to salespeople via round-robin, but assignment isn't functioning
   - **Location**: `src/lib/email-receive.ts` - need to investigate `assignLeadToSalesperson()` logic
   - **Impact**: Leads arrive unassigned, salespeople don't know who should follow up
   - **Status**: OPEN

2. **Activity Timeline Missing Timestamps** (Priority: MEDIUM)
   - **Description**: Activity timeline shows dates but not specific times (should show "Dec 5, 2024 at 3:45 PM")
   - **Location**: `src/app/(dashboard)/leads/[id]/page.tsx` - format `createdAt` in activity render
   - **Impact**: Hard to trace exact sequence of interactions
   - **Status**: OPEN

3. **Email Display Name Parsing Bug** (Priority: LOW)
   - **Description**: Email list shows sender names with junk like "SANTOS OZUNA EMAIL" instead of clean "Santos Ozuna"
   - **Location**: `src/app/(dashboard)/email/page.tsx` - `getDisplayName()` function
   - **Root Cause**: `fromAddress` field contains raw "Name <email@example.com>" format, needs better parsing
   - **Impact**: UI noise, harder to read email list
   - **Status**: OPEN - attempted fix didn't work, needs investigation

### Technical Debt

- **Email Password Encryption**: SMTP/IMAP passwords currently stored in plaintext. Should implement field-level encryption.
- **Testing**: No automated tests yet. Should add Jest tests for business logic (lead assignment, follow-up cadence).
- **Error Handling**: Some API routes lack comprehensive error handling for edge cases.
- **Rate Limiting**: No rate limiting on public endpoints (could be abused by bad actors).
- **CORS**: CORS policy not configured, could be security issue if exposed to web.
- **Logging**: No structured logging (no logs of lead creation, email sends, etc). Should add bunyan or pino.

### Next Steps

- [ ] Fix automatic lead assignment
- [ ] Add timestamps to activity timeline
- [ ] Fix email display name parsing
- [ ] Implement email credential encryption
- [ ] Add comprehensive tests
- [ ] Implement rate limiting

---

## Integration Points

### WordPress Form Integration

**Purpose**: Auto-create leads from website inquiries

**Setup**:
1. Install Fluent Forms PRO on WordPress site
2. Add email notification to form:
   - **Subject**: `[LEAD] New Inquiry - {vehicle title}`
   - **Body**: Structured form data (see README for format)
3. Configure form fields for Meta tracking: campaign_id, adset_id, ad_id, utm_campaign, etc
4. Set form to send email to dealership inbox

**How It Works**:
1. User fills form on WordPress vehicle page
2. Form submission triggers email to dealership
3. CRM syncs inbox via IMAP every 5 minutes
4. Parser detects `[LEAD]` prefix
5. Extracts form data and creates lead
6. Auto-assigns to salesperson
7. Linked to vehicle if found in inventory

### Meta Ads Integration (Future - Phase 4)

**Purpose**: Track which ads generate leads and sales

**Data Flow**:
1. Facebook ad URL includes parameters: `?campaign_id={{campaign.id}}&adset_id={{adset.id}}&...`
2. Hidden form fields on WordPress capture these parameters
3. Form email includes Meta data
4. CRM parses and stores as lead attributes
5. Admin dashboard shows metrics by campaign

**Metrics**:
- Leads by campaign
- Cost per lead
- Conversion rate by campaign
- Win rate by campaign (leads → sales)

### DocuSeal Integration (Future)

**Purpose**: Digital signature capture for documents

**Features**:
- Generate signature request
- Customer receives email with document
- Customer signs digitally
- Signed document returned to CRM
- Activity logged

---

## Deployment

### Local Development

```bash
# Start PostgreSQL container
docker-compose up -d

# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Seed test data
npm run db:seed

# Start dev server
npm run dev
# Opens at http://localhost:3100
```

### Production Deployment

**Prerequisites**:
- Node.js 20+
- PostgreSQL 16 server
- SMTP/IMAP email access for dealerships

**Steps**:
1. Clone repository
2. Set environment variables in `.env`
3. Run migrations: `npm run db:migrate`
4. Build: `npm run build`
5. Start: `npm run start`
6. Configure reverse proxy (nginx, etc) for HTTPS

**Environment Variables**:
```
# Database
DATABASE_URL=postgresql://user:password@host:5432/fcapp

# Auth
JWT_SECRET=your-secret-key-here
SESSION_DURATION_DAYS=7

# Email (default, can be overridden per dealership)
DEFAULT_SMTP_HOST=smtp.gmail.com
DEFAULT_IMAP_HOST=imap.gmail.com

# Meta (future)
META_APP_ID=...
META_APP_SECRET=...

# LLM (future)
ANTHROPIC_API_KEY=...

# Optional: VoIP (future)
YATE_API_URL=http://localhost:3020
```

---

## Development Roadmap

### Completed Phases

- ✅ **Phase 1**: Core CRM (Pipeline, Tasks, Leads, Activity Log)
- ✅ **Phase 1.5**: Inventory System (Vehicle management, shipping calculator)
- ✅ **Phase 1.6**: Admin & Settings (Multi-tenant management, role-based access)
- ✅ **Phase 2**: Email System (IMAP/SMTP, templates, signatures, WordPress integration)
- ✅ **Phase 2.5**: Media Management (Folders, image viewer, email insertion - completed Dec 22, 2024)
- ✅ **Phase 2.75**: Documents (Buyer's Order, Invoice builders with wizards - completed Dec 5, 2024)
- ✅ **Phase 3**: Contractor System & Requests (completed Dec 22, 2024)
  - Contractor role with departments (IT, Marketing, Content)
  - Multi-dealership contractor access via `ContractorDealershipAccess`
  - Request/ticket system with department routing
  - Conversation threads with `RequestMessage`
  - File attachments via `RequestAttachment`
  - Department-based permissions system
  - Agency admin contractor management UI
  - Contractor dashboard with dealership switcher
  - 18 API endpoints for contractors and requests

### Active Development

- 🔄 **Bug Fixes**: Automatic lead assignment, activity timestamps, email display names

### Planned Phases

- ⏳ **Phase 3.5**: VoIP & Call Integration
  - Yate PBX integration
  - Click-to-call from app
  - Call logging
  - Incoming call popups with lead lookup

- ⏳ **Phase 4**: Intelligence & Analytics
  - Meta Marketing API integration
  - Campaign-to-dealership mapping
  - Agency admin dashboard with cross-dealership analytics
  - Geographic analysis (which states produce buyers)
  - LLM integration (Claude API) for:
    - Lead summaries from email conversations
    - Suggested response templates
    - Creative performance analysis

---

## File Reference Guide

### Critical Implementation Files

| File | Purpose | Key Functions |
|------|---------|---|
| `prisma/schema.prisma` | Database schema | All models, enums, relationships |
| `src/lib/auth.ts` | JWT utilities | `createToken()`, `verifyToken()`, `hashPassword()` |
| `src/lib/leads.ts` | Lead business logic | `updateLeadStage()`, `calculateWinProbability()` |
| `src/lib/email.ts` | SMTP sending | `sendEmail()` with templates |
| `src/lib/email-receive.ts` | IMAP sync | Polling loop, lead auto-linking |
| `src/lib/email-parser.ts` | Form parsing | WordPress form extraction, Meta tracking |
| `src/app/(dashboard)/my-day/page.tsx` | Task list UI | Primary salesperson interface |
| `src/app/(dashboard)/pipeline/page.tsx` | Kanban board | Drag-drop stage changes |
| `src/app/(dashboard)/leads/[id]/page.tsx` | Lead detail | Activities, documents, forms |
| `src/components/documents/buyers-order-builder.tsx` | Buyer's Order | Wizard mode, PDF generation |
| `src/components/documents/invoice-builder.tsx` | Invoice | Wizard mode, payment methods |
| `src/app/(dashboard)/email/page.tsx` | Email client | Gmail-style UI, composer |
| `src/app/(dashboard)/media/page.tsx` | Media browser | Folder tree, image viewer, upload |
| `src/lib/permissions.ts` | Contractor permissions | Department-based access control, validation functions (Phase 3) |
| `src/app/(dashboard)/admin/contractors/page.tsx` | Contractor management | List, create, edit contractors (Phase 3) |
| `src/app/(dashboard)/requests/page.tsx` | Request list | All requests with filters (Phase 3) |
| `src/app/(dashboard)/requests/[id]/page.tsx` | Request detail | Conversation thread, attachments (Phase 3) |
| `src/app/(dashboard)/contractor/page.tsx` | Contractor dashboard | Landing page for contractors (Phase 3) |
| `src/components/requests/*` | Request UI components | RequestList, RequestDetail, MessageThread (Phase 3) |

### API Route Files

| Route | File |
|-------|------|
| `/api/leads/*` | `src/app/api/leads/` |
| `/api/tasks/*` | `src/app/api/tasks/` |
| `/api/email/*` | `src/app/api/email/` |
| `/api/documents/*` | `src/app/api/documents/` |
| `/api/vehicles/*` | `src/app/api/vehicles/` |
| `/api/dealerships/*` | `src/app/api/dealerships/` |
| `/api/users/*` | `src/app/api/users/` |
| `/api/contractors/*` | `src/app/api/contractors/` (Phase 3) |
| `/api/requests/*` | `src/app/api/requests/` (Phase 3) |

---

## Glossary

- **DID**: Direct Inward Dialing (phone line for receiving calls)
- **IMAP**: Internet Message Access Protocol (receiving emails)
- **SMTP**: Simple Mail Transfer Protocol (sending emails)
- **JWT**: JSON Web Token (stateless authentication)
- **Prisma**: TypeScript ORM for database access
- **Lead**: A prospect/customer record
- **Activity**: A logged interaction (email sent, call made, note added, stage change)
- **Task**: A to-do item for a salesperson (auto-generated from follow-up cadence)
- **Win Probability**: Percentage chance lead will close based on stage
- **Round-Robin**: Alternating assignment of leads to salespeople
- **Deduplication**: Detecting and merging duplicate leads
- **Tenancy**: Dealership isolation (multi-tenant architecture)

---

## How to Use This Document

1. **New to the project?** Start with "Overview" → "Architecture Overview" → "Core Data Model"
2. **Adding a feature?** Check "Development Roadmap" → "Planned Phases" → verify dependencies
3. **Fixing a bug?** See "Known Issues & Technical Debt" for reproducible steps
4. **Deploying?** See "Deployment" section for setup instructions
5. **Need to find code?** Use "File Reference Guide" to locate implementation

---

**Last Updated**: December 22, 2024
**Maintained By**: Project Memory Keeper
**Status**: Complete for Phases 1-3 (including Contractor System & Requests)
