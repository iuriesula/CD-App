# Dr Tokyo IT - Car Dealership CRM - Project Specification

**Last Updated:** December 22, 2024

## 1. Project Overview

**System Name:** Dr Tokyo IT - Car Dealership CRM

**Purpose:** A lightweight Customer Relationship Management (CRM) system designed for car dealerships to manage leads, track sales pipeline, and coordinate with external contractors. The system automates lead management workflows and provides clear visibility into sales progress.

**Target Users:**
- Car dealership salespeople and managers
- Agency administrators managing multiple dealerships
- External contractors (IT, Marketing, Content teams) supporting dealerships

**Core Problems Solved:**
1. Lead management without sales complexity - salespeople use simple daily task lists
2. Multi-dealership administration from single platform
3. Dealership-to-contractor communication for support requests
4. Email integration and lead auto-creation from web forms
5. Document generation (buyer's orders, invoices)

**Key Business Rules:**
- Multi-tenant SaaS: Multiple dealerships operate independently
- Role-based access control: Different features based on user type
- Contractor isolation: Contractors only see assigned departments and dealerships
- Auto-lead creation: WordPress form submissions create leads automatically
- Email threading: Conversations are tracked and linked to leads

---

## 2. Architecture Overview

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interfaces                          │
├──────────────────┬──────────────────┬──────────────────────┤
│  Dealership UI   │   Agency Admin    │   Contractor         │
│  (Leads, Tasks,  │   (Manage         │   (Request/Ticket    │
│   Email, Docs)   │    Dealerships)   │    Dashboard)        │
└────────┬─────────┴────────┬─────────┴──────────────┬─────────┘
         │                  │                        │
┌────────▼──────────────────▼────────────────────────▼─────────┐
│                  API Layer (Next.js Routes)                  │
├──────────────────────────────────────────────────────────────┤
│ /api/leads        /api/email        /api/contractors         │
│ /api/tasks        /api/documents    /api/requests            │
│ /api/pipeline     /api/inventory    /api/users               │
│ /api/activities   /api/dealerships  /api/settings            │
└────────┬──────────────────────────────────────────────────────┘
         │
┌────────▼──────────────────────────────────────────────────────┐
│        Business Logic Layer (TypeScript Utilities)            │
├──────────────────────────────────────────────────────────────┤
│ auth.ts          email-receive.ts    permissions.ts          │
│ leads.ts         email-parser.ts     email.ts (SMTP send)   │
└────────┬──────────────────────────────────────────────────────┘
         │
┌────────▼──────────────────────────────────────────────────────┐
│           Database Layer (Prisma ORM + PostgreSQL)            │
├──────────────────────────────────────────────────────────────┤
│ Users | Leads | Tasks | Activities | Vehicles               │
│ Emails | Documents | Dealerships | Contractors              │
│ Requests | RequestMessages | RequestAttachments             │
│ ContractorDealershipAccess | EmailTemplates | Signatures    │
└────────────────────────────────────────────────────────────────┘
         │
┌────────▼──────────────────────────────────────────────────────┐
│              External Integrations                             │
├──────────────────────────────────────────────────────────────┤
│ PostgreSQL Database | SMTP Email Send | IMAP Email Receive  │
│ File Storage | WordPress Form Parsing                       │
└────────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend Framework:** Next.js 16 with App Router (TypeScript)
- **Styling:** Tailwind CSS 4 with custom component library
- **Database:** PostgreSQL 16 via Docker
- **ORM:** Prisma 7 with driver adapter pattern
- **Authentication:** JWT with httpOnly cookies (jose library)
- **Drag & Drop:** @dnd-kit library for pipeline board
- **Email:** Nodemailer (SMTP send), IMAP sync (receive)
- **Runtime:** Node.js 20+

---

## 3. Core Components & Features

### Phase 1: Core CRM (Completed)

**Database Schema:**
- User management with roles (salesperson, manager, tech, content_creator, agency_admin)
- Lead tracking with 12 predefined stages (new_lead to lost_unanswered)
- Task management with due dates and lead linkage
- Activity timeline showing all interactions
- Dealership multi-tenancy support

**Lead Management:**
- Lead CRUD with duplicate detection
- 12-stage pipeline with configurable win probability
- 5-attempt follow-up cadence logic
- Activity timeline showing calls, emails, voicemails, notes
- Lead merge functionality to consolidate duplicates
- Quick action buttons for common tasks

**Pipeline Board:**
- Kanban-style board with drag-and-drop stage changes
- Visual lead cards with contact info and probability badges
- Real-time status updates

**Daily Task List:**
- "My Day" view showing tasks in priority order
- Task completion tracking
- Task creation from leads or manual entry

### Phase 1.5: Inventory System (Completed)

**Vehicle Management:**
- Full vehicle details (year, make, model, VIN, color, price, mileage, location, status)
- Inventory status tracking (available, pending, reserved, sold)
- Table view with filters and CRUD operations

**Lead-Vehicle Linking:**
- Associates leads to specific vehicles in inventory
- Easy vehicle switching if customer picks different car

**Shipping Calculator:**
- Calculates distance between dealership and customer ZIP code
- Provides open/enclosed transport pricing
- Estimates delivery timeline based on distance

### Phase 1.6: Admin & Settings (Completed)

**Agency Admin Dashboard:**
- Create and manage dealerships
- Auto-creates manager user when creating dealership
- Dealership list with status overview

**Dealership Manager Settings:**
- Edit dealership information (name, address, website)
- Manage multiple phone numbers and email addresses
- Configure time zones (visible in header clocks)
- Upload dealership logo and brand color

**Team Management:**
- Add/edit/delete team members
- Assign roles (salesperson, tech, content_creator, manager)
- Pause/activate user access
- Reset user passwords
- View team member activity

**Role-Based Access Control:**
- Salesperson/Tech/Content Creator: Main navigation only
- Manager: Main nav + Settings section
- Agency Admin: Main nav + Settings + Admin section
- Contractor: Request/ticket dashboard only

### Phase 2: Email System (Completed)

**Email Configuration:**
- SMTP settings for outgoing email (supports Titan Email and others)
- IMAP settings for incoming email
- Connection testing for both protocols
- Dealership-wide email addresses

**Email Templates:**
- 5 template categories: Follow-up, Introduction, Offer, Thank You, Car Description, Custom
- Variable placeholders for personalization (e.g., {firstName}, {vehiclePrice})
- Dealership-wide templates (managers create/edit)
- Personal templates (salespeople create/edit/delete own)
- Template selection in email composer

**Email Signatures:**
- Personal signatures (all users create/manage own)
- Dealership-wide signatures (managers create/manage)
- Default signature selection per user
- Auto-insert in email composer

**Email Client:**
- Gmail/Outlook-style 3-panel layout
- Folder structure: Inbox, Sent, All Mail, Spam, Trash
- Compose new emails with template selection
- Reply to emails (Ctrl+Enter sends)
- Email search functionality
- Link emails to existing leads
- Create new lead from email with modal
- Move emails to Spam/Trash
- Restore emails from Spam/Trash

**Email Features:**
- SMTP send with personalization
- IMAP receive with automatic syncing
- Email threading with In-Reply-To headers
- Send undo feature (10-second delay with countdown)
- Email display with HTML rendering

**Auto-Lead Creation:**
- Detects `[LEAD]` prefix in email subject
- Parses Fluent Forms format with lead data
- Extracts Meta Ads tracking (campaign/adset/ad IDs)
- Extracts UTM parameters
- Auto-links to vehicles if found in inventory
- Skips duplicate emails (same email address)

### Phase 2.5: Communications (Completed)

**Dealership Branding:**
- Logo upload with preview
- Brand color picker
- Appears throughout UI

**Media Module:**
- Dealership media folder for uploads
- Nested folder structure support
- Bulk folder upload with preserved structure

**Image Management:**
- Full-screen image viewer
- Zoom capabilities (0.25x to 5x)
- Pan when zoomed (drag or arrow keys)
- Download images
- Image dimensions display
- Image counter in viewer

**Email Enhancements:**
- Insert images into email composer
- Media picker with search
- Multi-select support for images
- Visual thumbnails in email body

**Dealership Settings:**
- Time zone clocks in header (configurable)
- Multiple phone/email management
- Logo and brand color setup

### Phase 2.75: Documents & Invoicing (Completed)

**Buyer's Order:**
- Wizard mode for step-by-step creation
- LLC/DBA formatting support
- Professional print layout
- Status tracking (draft, sent, viewed, signed)

**Invoice:**
- Wizard mode for guided creation
- Payment method selection (check, wire transfer, credit card)
- Wire transfer details (account name, number, routing number)
- Professional print layout
- Status tracking (draft, sent, viewed, signed)

**Document Management:**
- Link documents to leads
- Print-to-PDF functionality
- Signature tracking
- View history

### Phase 3: Contractor System (Completed)

**Contractor Role:**
- New user role: contractor
- Department-based assignment (IT, Marketing, Content)
- Multiple dealership access per contractor
- Isolated from dealership CRM data

**Multi-Dealership Access:**
- ContractorDealershipAccess junction table
- Many-to-many relationships between contractors and dealerships
- Audit trail: tracks who assigned contractor and when
- Contractors only see requests from assigned dealerships

**Request/Ticket System:**
- Support requests created by dealership users
- Department-based routing (IT, Marketing, Content)
- Priority levels (low, normal, high, urgent)
- Status workflow: open → in_progress → resolved → closed
- Automatic closure timestamp

**Request Workflow:**
1. Dealership user creates request selecting department and priority
2. Request visible to all contractors in that department (for assigned dealership)
3. Any contractor in matching department can view, message, update status
4. Optional: Managers can formally assign specific contractors
5. Assignment automatically sets status to in_progress

**Conversation Threads:**
- RequestMessage model for message history
- User and timestamp tracking per message
- Full conversation visible in request detail
- Chronological message ordering

**File Attachments:**
- Support for images, PDFs, documents
- File size limit: 25MB per file
- Multiple files per message
- File metadata stored (MIME type, size, upload date)
- RequestAttachment model links files to messages or requests

**Permission System:**
- Contractors see requests from assigned dealerships only
- Contractors see requests from their assigned department only
- No assignment required for department access
- Any contractor can work on any request in their department
- Dealership users cannot see contractor data

---

## 4. Database Schema

### Core Models

**User**
```
id: UUID (primary)
name: String
email: String (unique, lowercase)
password: String (hashed with bcrypt)
dealershipId: UUID (foreign key)
role: UserRole enum (salesperson|manager|tech|content_creator|agency_admin|contractor)
contractorDepartment: ContractorDepartment enum? (it|marketing|content)
isActive: Boolean (default: true)
createdAt: DateTime
updatedAt: DateTime

Relations:
- dealership: Dealership
- tasks: Task[]
- activities: Activity[]
- leads (createdBy): Lead[]
- emails: Email[]
- documents: Document[]
- contractorDealerships: ContractorDealershipAccess[]
- requestsCreated: Request[] (requestedById)
- requestsAssigned: Request[] (assignedToId)
- requestMessages: RequestMessage[]
- emailTemplates: EmailTemplate[]
- emailSignatures: EmailSignature[]
```

**Dealership**
```
id: UUID (primary)
name: String
address: String?
city: String?
state: String?
zipCode: String?
website: String?
smtpHost: String?
smtpPort: Int?
smtpUser: String?
smtpPassword: String? (encrypted)
imapHost: String?
imapPort: Int?
imapUser: String?
imapPassword: String? (encrypted)
timeZones: String[] (JSON array for multiple time zones)
logoUrl: String?
brandColor: String? (hex color)
createdAt: DateTime
updatedAt: DateTime

Relations:
- users: User[]
- leads: Lead[]
- tasks: Task[]
- activities: Activity[]
- vehicles: Vehicle[]
- emails: Email[]
- documents: Document[]
- requests: Request[]
- contractorAccess: ContractorDealershipAccess[]
```

**Lead**
```
id: UUID (primary)
dealershipId: UUID (foreign key)
createdById: UUID (foreign key)
firstName: String
lastName: String
email: String
phone: String
source: String?
stage: String (enum with 12 stages)
winProbability: Int (percentage)
attemptCount: Int (default: 0)
lastAttemptDate: DateTime?
vehicleId: UUID? (foreign key, optional)
notes: String? (text)
metaCampaignId: String?
metaAdsetId: String?
metaAdId: String?
metaAccountId: String?
utmCampaign: String?
utmSource: String?
utmMedium: String?
leadIp: String? (IPv4 or IPv6)
leadCountry: String?
leadRegion: String?
createdAt: DateTime
updatedAt: DateTime

Relations:
- dealership: Dealership
- createdBy: User
- tasks: Task[]
- activities: Activity[]
- vehicle: Vehicle?
- emails: Email[]
```

**Task**
```
id: UUID (primary)
dealershipId: UUID (foreign key)
leadId: UUID? (foreign key, optional)
userId: UUID (foreign key)
title: String
description: String? (text)
dueDate: DateTime
completed: Boolean
completedDate: DateTime?
priority: String? (enum)
createdAt: DateTime
updatedAt: DateTime

Relations:
- dealership: Dealership
- lead: Lead?
- user: User
- activities: Activity[]
```

**Activity**
```
id: UUID (primary)
dealershipId: UUID (foreign key)
leadId: UUID? (foreign key)
userId: UUID (foreign key)
type: String (enum: call, email, voicemail, note, task, stage_change)
description: String? (text)
createdAt: DateTime

Relations:
- dealership: Dealership
- lead: Lead?
- user: User
```

**Vehicle**
```
id: UUID (primary)
dealershipId: UUID (foreign key)
year: Int
make: String
model: String
trim: String?
vin: String?
color: String?
mileage: Int?
price: Decimal?
location: String?
status: String (enum: available|pending|reserved|sold)
websiteDescription: String? (text)
technicalBulletpoints: String[] (JSON array)
callScript: String? (text)
createdAt: DateTime
updatedAt: DateTime

Relations:
- dealership: Dealership
- leads: Lead[]
```

**Email**
```
id: UUID (primary)
dealershipId: UUID (foreign key)
leadId: UUID? (foreign key)
userId: UUID (foreign key)
subject: String
body: String (text)
fromAddress: String
toAddress: String
direction: String (enum: inbound|outbound)
folder: String? (null|spam|trash)
isRead: Boolean (default: false)
attachments: String[] (JSON array of URLs)
htmlContent: String? (text)
inReplyTo: String? (message ID for threading)
messageId: String? (unique message ID)
createdAt: DateTime
updatedAt: DateTime

Relations:
- dealership: Dealership
- lead: Lead?
- user: User
```

**Document**
```
id: UUID (primary)
dealershipId: UUID (foreign key)
leadId: UUID (foreign key)
userId: UUID (foreign key)
type: String (enum: buyers_order|invoice)
status: String (enum: draft|sent|viewed|signed)
title: String
content: String (JSON with all document data)
pdfUrl: String?
viewedAt: DateTime?
signedAt: DateTime?
createdAt: DateTime
updatedAt: DateTime

Relations:
- dealership: Dealership
- lead: Lead
- user: User
```

**EmailTemplate**
```
id: UUID (primary)
dealershipId: UUID (foreign key)
userId: UUID? (foreign key, nullable for personal templates)
name: String
category: String (enum: Follow-up|Introduction|Offer|Thank You|Car Description|Custom)
subject: String
body: String (text)
variables: String[] (JSON array of placeholder names)
isPersonal: Boolean (true if userId set, false for dealership-wide)
createdAt: DateTime
updatedAt: DateTime

Relations:
- dealership: Dealership
- user: User?
```

**EmailSignature**
```
id: UUID (primary)
dealershipId: UUID (foreign key)
userId: UUID? (foreign key, nullable for personal signatures)
name: String
content: String (text, HTML formatted)
isDefault: Boolean
isPersonal: Boolean (true if userId set)
createdAt: DateTime
updatedAt: DateTime

Relations:
- dealership: Dealership
- user: User?
```

**ContractorDealershipAccess**
```
id: UUID (primary)
contractorId: UUID (foreign key)
dealershipId: UUID (foreign key)
assignedAt: DateTime (default: now)
assignedBy: String? (user ID)

Indexes:
- unique(contractorId, dealershipId)
- contractorId
- dealershipId

Relations:
- contractor: User
- dealership: Dealership
```

**Request**
```
id: UUID (primary)
dealershipId: UUID (foreign key)
department: ContractorDepartment enum (it|marketing|content)
title: String
description: String (text)
priority: RequestPriority enum (low|normal|high|urgent, default: normal)
status: RequestStatus enum (open|in_progress|resolved|closed, default: open)
requestedById: UUID? (foreign key)
assignedToId: UUID? (foreign key)
createdAt: DateTime
updatedAt: DateTime
closedAt: DateTime?

Indexes:
- (dealershipId, department, status, assignedToId, createdAt)

Relations:
- dealership: Dealership
- requestedBy: User?
- assignedTo: User?
- messages: RequestMessage[]
- attachments: RequestAttachment[]
```

**RequestMessage**
```
id: UUID (primary)
requestId: UUID (foreign key)
userId: UUID (foreign key)
message: String (text)
isRead: Boolean (default: false)
createdAt: DateTime

Indexes:
- (requestId, createdAt)

Relations:
- request: Request
- user: User
- attachments: RequestAttachment[]
```

**RequestAttachment**
```
id: UUID (primary)
requestId: UUID (foreign key)
messageId: UUID? (foreign key, nullable)
fileName: String
fileUrl: String
mimeType: String
size: Int (bytes)
uploadedAt: DateTime

Indexes:
- (requestId, messageId)

Relations:
- request: Request
- message: RequestMessage?
```

---

## 5. API Endpoints Reference

### Authentication
- `POST /api/auth/login` - User login with email/password
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user session

### Leads
- `GET /api/leads` - List leads (with filters by stage, status)
- `POST /api/leads` - Create new lead
- `GET /api/leads/:id` - Get lead detail with activities
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead
- `PUT /api/leads/:id/stage` - Update lead stage
- `POST /api/leads/:id/merge` - Merge duplicate lead

### Tasks
- `GET /api/tasks` - List tasks by user/dealership
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PUT /api/tasks/:id/complete` - Mark task complete

### Pipeline
- `GET /api/pipeline` - Get full pipeline for kanban board
- `PUT /api/leads/:id/stage` - Change stage (via drag/drop)

### Inventory
- `GET /api/vehicles` - List vehicles (with filters)
- `POST /api/vehicles` - Create vehicle
- `PUT /api/vehicles/:id` - Update vehicle
- `DELETE /api/vehicles/:id` - Delete vehicle

### Email
- `GET /api/email/inbox` - List emails (with folder filtering)
- `GET /api/email/:id` - Get single email with HTML
- `PUT /api/email/:id` - Update email (folder, read status)
- `POST /api/email/send` - Send email via SMTP
- `GET /api/email/templates` - List templates
- `POST /api/email/templates` - Create template
- `PUT /api/email/templates/:id` - Update template
- `DELETE /api/email/templates/:id` - Delete template
- `GET /api/email/signatures` - List signatures
- `POST /api/email/signatures` - Create signature
- `PUT /api/email/signatures/:id` - Update signature
- `DELETE /api/email/signatures/:id` - Delete signature

### Documents
- `GET /api/documents` - List documents (by lead/dealership)
- `POST /api/documents` - Create document (buyer's order or invoice)
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `GET /api/documents/:id/pdf` - Generate/retrieve PDF

### Settings
- `GET /api/dealerships/:id` - Get dealership details
- `PUT /api/dealerships/:id` - Update dealership (name, address, branding)
- `GET /api/dealerships/:id/email-config` - Get email configuration
- `PUT /api/dealerships/:id/email-config` - Update email config (SMTP/IMAP)
- `POST /api/dealerships/:id/email-test` - Test email connections
- `GET /api/users` - List dealership users
- `POST /api/users` - Create user (manager only)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PUT /api/users/:id/password` - Reset user password

### Contractors
- `GET /api/contractors` - List contractors (agency admin only)
- `POST /api/contractors` - Create contractor (agency admin only)
- `GET /api/contractors/:id` - Get contractor details
- `PUT /api/contractors/:id` - Update contractor
- `DELETE /api/contractors/:id` - Delete contractor
- `POST /api/contractors/:id/dealerships` - Assign dealerships
- `GET /api/contractors/:id/dealerships` - List assigned dealerships
- `DELETE /api/contractors/:id/dealerships/:dealershipId` - Remove dealership access

### Requests
- `GET /api/requests` - List requests (role-based filtering)
- `POST /api/requests` - Create request (dealership user)
- `GET /api/requests/:id` - Get request details with messages
- `PUT /api/requests/:id` - Update request (title, description, priority)
- `DELETE /api/requests/:id` - Delete request
- `PUT /api/requests/:id/status` - Update status
- `PUT /api/requests/:id/assign` - Assign to contractor
- `GET /api/requests/:id/messages` - Get conversation thread
- `POST /api/requests/:id/messages` - Add message
- `PUT /api/requests/:id/messages/:messageId/read` - Mark message read
- `GET /api/requests/:id/attachments` - List attachments
- `POST /api/requests/:id/attachments` - Upload attachment
- `DELETE /api/requests/:id/attachments/:attachmentId` - Delete attachment

### Media
- `POST /api/media/upload` - Upload files (single or folder)
- `GET /api/media` - List uploaded files
- `DELETE /api/media/:id` - Delete file

---

## 6. Key Data Flows

### Lead Creation from Web Form

```
1. Customer fills Fluent Forms on WordPress site
2. Form includes Meta Ads tracking parameters (from hidden fields)
3. Fluent Forms sends email to dealership inbox with [LEAD] prefix
4. IMAP sync retrieves email (runs periodically or on demand)
5. Email parser detects [LEAD] prefix and form format
6. System extracts: name, email, phone, message, vehicle, Meta tracking
7. Checks for duplicate lead (same email)
8. Creates new Lead record with all extracted data
9. Auto-links to Vehicle if inventory vehicle matches
10. Skips auto-assignment (manager manually assigns or round-robin on demand)
11. Activity logged for lead creation
```

### Email Workflow

```
1. User composes email in email client
2. Can select template (fills subject/body)
3. Can select default signature (auto-inserted)
4. Can insert images from media folder
5. User clicks Send
6. Email undo feature: 10-second delay before actual send
7. If not undone, sends via SMTP
8. Email record created with direction="outbound"
9. Email linked to lead if recipient matches lead email

Alternative flow for incoming emails:
1. Email arrives at dealership mailbox
2. IMAP sync retrieves email periodically
3. System attempts to link to existing lead by sender email
4. If linked to lead, Activity logged
5. Email marked as read or unread based on user interaction
```

### Contractor Request Workflow

```
1. Dealership manager creates support request
2. Selects department (IT/Marketing/Content) and priority
3. Request appears in contractor dashboard for all contractors in that department
4. Contractor views request and sees conversation history
5. Contractor posts message with optional file attachment
6. Both parties can upload files (images, PDFs, documents up to 25MB)
7. Contractor updates status: open → in_progress → resolved → closed
8. Manager can formally assign contractor (optional, status becomes in_progress)
9. Request auto-closes when status is "resolved" or "closed"
10. Full conversation and file history preserved for audit trail
```

### Pipeline & Task Workflow

```
1. Salesperson works through daily tasks (My Day view)
2. For each task linked to lead:
   - Views lead details
   - Logs activity (call, email, voicemail, note)
   - Updates lead stage via quick buttons or drag/drop on pipeline
3. Stage change automatically updates win probability
4. Lead visibility filtered by dealership (multi-tenant isolation)
5. Activities create timeline visible on lead detail
6. Task completion tracked independently of lead progress
```

---

## 7. Security Model

### Authentication
- JWT tokens with httpOnly cookies (secure, not accessible from JavaScript)
- Token expiration: Typically 24 hours (configurable)
- Password hashing: bcrypt with salt rounds (10+)
- Email login: Case-insensitive, normalized to lowercase

### Authorization
- Role-based access control (RBAC) with 6 roles
- Dealership-based isolation (multi-tenant)
- Contractor department-based filtering
- API routes check permissions before returning data
- Permission functions centralized in `/src/lib/permissions.ts`

### Data Protection
- SMTP/IMAP passwords: Encrypted at rest (environment variables, future: database encryption)
- Email content: Plain text and HTML stored
- Sensitive URLs: File upload URLs not directly accessible
- CORS: Configured for API security

### Permissions by Role

**Salesperson:**
- View own leads (dealership only)
- Update own leads and notes
- Create own tasks
- View own emails
- Create/edit personal templates
- Cannot access settings or admin

**Tech:**
- Same as salesperson but for technical information
- Can access vehicle technical info

**Content Creator:**
- Same as salesperson
- Can access media and vehicle descriptions

**Manager:**
- All salesperson permissions
- Create/edit/delete dealership-wide templates and signatures
- Create/edit/delete team users
- Access dealership settings (email config, branding)
- Create support requests (see contractors)

**Agency Admin:**
- Create/manage dealerships
- Create/manage contractors
- Access all dealership data
- Full admin dashboard

**Contractor:**
- View assigned dealerships only
- View requests in assigned department only
- Create/edit own messages and attachments
- Update request status
- Cannot view leads, pipeline, or CRM data

---

## 8. Critical Assumptions & Constraints

### Technical Assumptions
1. **Single-tenant per dealership:** Each dealership is isolated by dealershipId
2. **Email configuration:** Each dealership configures own SMTP/IMAP (no shared pool)
3. **File storage:** Files stored in project's /public/uploads directory (can be S3)
4. **Database:** PostgreSQL with Prisma ORM, driver adapter pattern
5. **Timezone handling:** Server uses UTC, frontend converts to dealership timezone(s)
6. **Email threading:** In-Reply-To headers used for conversation threading

### Business Assumptions
1. **Lead assignment:** Automatic (round-robin) or manual (manager decides)
2. **Contractor isolation:** Contractors never see CRM data, only support requests
3. **Email synchronization:** IMAP sync runs periodically (not real-time)
4. **Document signing:** Not yet implemented (DocuSeal planned for future)
5. **Auto-lead creation:** Only from Fluent Forms with specific format

### Performance Constraints
1. **Email sync:** Batch processing, not real-time
2. **File uploads:** 25MB limit per file
3. **Database queries:** Optimized with proper indexes
4. **Pagination:** Required for large lists (100+ items)

### Functional Constraints
1. **Single currency:** USD assumed for pricing
2. **Dealership scope:** Features available per dealership basis
3. **Time zones:** Multiple per dealership supported
4. **Languages:** English only (UI not internationalized)

---

## 9. External Integrations

### Email Service Integration
- **SMTP Send:** Uses Nodemailer library
  - Supports: Titan Email, Gmail, Outlook, custom servers
  - Configuration: Host, port, username, password (encrypted)
  - Features: Templates, signatures, attachments, threading

- **IMAP Receive:** Uses IMAP library
  - Configuration: Host, port, username, password (encrypted)
  - Features: Multi-folder support (inbox, spam, trash)
  - Auto-parsing: Fluent Forms format detection

### WordPress Integration
- **Fluent Forms PRO:** Email-based lead capture
  - Trigger: Specific subject format `[LEAD] New Inquiry...`
  - Extracts: Name, email, phone, message, vehicle, Meta tracking
  - Auto-creates: Lead in CRM with all data

### Meta Ads Integration
- **Tracking Parameters:** Campaign ID, Ad Set ID, Ad ID, Account ID
- **UTM Parameters:** Campaign, source, medium
- **Storage:** Stored on Lead record for reporting

### File Storage
- **Local Storage:** /public/uploads directory
- **File Types:** Images (jpg, png, gif), PDFs, documents
- **Size Limit:** 25MB per file
- **Future:** S3 integration planned

---

## 10. Known Limitations & Technical Debt

### Pre-existing Issues (Not Phase 3 Related)
1. **Email display names:** Sender names parse incorrectly in some cases (e.g., "SANTOS OZUNA EMAIL")
2. **Auto-assignment:** Round-robin assignment not functioning; needs investigation
3. **Activity timestamps:** Missing specific times (should show "Dec 5, 2024 at 3:45 PM")

### Phase 3 Specific
- None identified - system fully functional

### Planned Future Work
1. **DocuSeal Integration:** Digital signatures for documents
2. **Commission Tracker:** Salesman commission tracking with tiers
3. **Auto-task Creation:** Rules-based automatic task generation
4. **Lead Scoring:** Machine learning based lead prioritization
5. **WordPress Car Import:** Auto-sync vehicles from WordPress
6. **Cross-dealership Intelligence:** Blacklist system, analytics

### Technical Debt
1. **Turbopack Issues:** Next.js 16 default can throw Jest worker errors on Windows
2. **TypeScript:** Some pre-existing prop type mismatches in UI components
3. **File Storage:** Local storage should migrate to cloud (S3)
4. **Email Sync:** Should be real-time (WebSocket or polling optimization)

---

## 11. Project Statistics

### Database Models
- **Total Tables:** 14 (Users, Dealerships, Leads, Tasks, Activities, Vehicles, Emails, Documents, EmailTemplates, EmailSignatures, Contractors, Requests, RequestMessages, RequestAttachments)
- **Enums:** 13 (UserRole, ContractorDepartment, RequestStatus, RequestPriority, and others)

### API Endpoints
- **Total Routes:** 60+ endpoints across all modules
- **Contractors:** 7 endpoints
- **Requests:** 12 endpoints
- **Email:** 12 endpoints
- **Leads/Tasks/Pipeline:** 20+ endpoints
- **Settings/Admin:** 15+ endpoints

### Code Size
- **Backend:** ~3,000 lines (API routes, utilities)
- **Database Schema:** ~500 lines (Prisma)
- **Migrations:** ~2,000 lines (across 10+ migrations)
- **Frontend:** ~10,000+ lines (React components, pages)

### Features Implemented
- **Phases Completed:** 3 (Core CRM, Inventory, Admin, Email, Communications, Documents, Contractor System)
- **Sub-phases:** 6 (1, 1.5, 1.6, 2, 2.5, 2.75, 3)
- **Major Features:** 40+ individual features

---

## 12. Development Guidelines

### Running the Project

```bash
# Start PostgreSQL
docker-compose up -d

# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Seed test data
npm run db:seed

# Start dev server
npm run dev

# Test credentials
Email: john@classiccars.com
Password: password123
```

### Database Schema Changes

```bash
# Modify schema.prisma, then:
npx prisma db push       # Push to database
npx prisma generate      # Regenerate Prisma client
# Restart dev server
```

### File Organization
- `/src/app` - Next.js pages and API routes
- `/src/components` - React components
- `/src/lib` - Business logic and utilities
- `/src/types` - TypeScript types and enums
- `/prisma` - Database schema and migrations

### Key Files Reference
- `prisma/schema.prisma` - Database schema (source of truth)
- `src/lib/permissions.ts` - Permission/authorization logic
- `src/lib/auth.ts` - JWT and authentication
- `src/lib/email.ts` - SMTP sending
- `src/lib/email-receive.ts` - IMAP receiving and parsing
- `src/app/(dashboard)/email/page.tsx` - Email client UI (1000+ lines)
- `src/app/api/requests/route.ts` - Request list/creation
- `src/app/api/contractors/route.ts` - Contractor management

---

## 13. Project Success Metrics

**Completed:**
- ✅ Multi-tenant SaaS architecture
- ✅ Full CRUD for leads, tasks, activities
- ✅ Pipeline board with drag/drop
- ✅ Email system (send/receive/templates)
- ✅ Document generation (buyer's orders, invoices)
- ✅ Contractor system with department-based access
- ✅ File attachments in request messages
- ✅ Role-based access control

**Next Phase Goals:**
- Auto-task creation rules
- Lead scoring system
- Salesman commission tracker
- Cross-dealership intelligence (blacklist, analytics)

---

**This specification serves as the authoritative source of truth for the Dr Tokyo IT CRM system. All architectural, feature, and implementation decisions should be validated against this document.**

**Last updated:** December 22, 2024
**By:** Project Memory Keeper (Claude Code)
