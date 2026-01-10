# Dr Tokyo IT - Car Dealership CRM

Lightweight CRM for car dealerships. The system is smart so the salesperson can be simple - salespeople work through a daily task list while the system handles the thinking.

## Quick Start for New Sessions

**READ THIS FIRST** when starting a new Claude session:
1. Read this README completely
2. Read `../MYIDEAS.MD` for pending feature ideas
3. Check "Known Bugs" section below for issues to fix
4. Check "Session Notes" section for recent context

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Database**: PostgreSQL 16 via Docker
- **ORM**: Prisma 7 with driver adapter pattern
- **Auth**: JWT with httpOnly cookies (jose library)
- **UI**: Tailwind CSS 4, custom components
- **Drag & Drop**: @dnd-kit for pipeline board

## Local Development

### Prerequisites
- Node.js 20+
- Docker & Docker Compose

### Setup

```bash
# Start PostgreSQL
docker-compose up -d

# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Seed test data
npm run db:seed

# Start dev server (port 3100)
npm run dev
```

### Test Credentials
- Email: `john@classiccars.com`
- Password: `password123`

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login page
│   ├── (dashboard)/     # Protected pages
│   │   ├── my-day/      # Daily task list
│   │   ├── pipeline/    # Kanban board
│   │   ├── leads/       # Lead list & detail
│   │   ├── inventory/   # Vehicle inventory
│   │   ├── email/       # Email client
│   │   ├── requests/    # Contractor request dashboard
│   │   ├── settings/    # Manager settings
│   │   │   ├── dealership/  # Dealership info
│   │   │   ├── email/       # Email config
│   │   │   └── users/       # Team management (includes contractors)
│   │   └── admin/       # Agency admin pages
│   │       └── dealerships/ # Manage dealerships
│   └── api/             # API routes
│       └── requests/    # Request CRUD endpoints
├── components/
│   ├── ui/              # Button, Input, Badge, Card
│   ├── layout/          # Sidebar, Header
│   ├── pipeline/        # LeadCard, PipelineColumn
│   ├── email/           # EmailComposer
│   └── requests/        # RequestDetail, RequestList, MessageThread
├── lib/
│   ├── db/              # Prisma client
│   ├── auth.ts          # JWT helpers
│   ├── leads.ts         # Lead business logic
│   ├── email.ts         # SMTP send
│   ├── email-receive.ts # IMAP sync
│   ├── email-parser.ts  # Form submission parser
│   └── permissions.ts   # Request & contractor permissions
└── types/               # Stage config, enums
```

## Development Progress

### Phase 1: Core CRM (Completed)

- [x] Database schema (Users, Leads, Tasks, Activities, Dealerships)
- [x] JWT authentication with login/logout
- [x] Lead CRUD with duplicate detection
- [x] Pipeline board with drag-drop stage changes
- [x] Lead detail page with editable contact info, notes, activity timeline
- [x] My Day task list view
- [x] 5-attempt follow-up cadence logic
- [x] Stage-based win probability
- [x] Quick action buttons on lead detail (log calls, emails, voicemail, etc.)
- [x] Lead merge functionality

### Phase 1.5: Inventory System (Completed)

- [x] Vehicle model with full inventory details (year, make, model, VIN, pricing, status, etc.)
- [x] Inventory management page (`/inventory`)
  - Table view of all vehicles with status badges
  - Filter by status (available, pending, reserved, sold)
  - Add/edit/delete vehicles with full form modal
- [x] Vehicle linking on lead detail page
  - Link leads to inventory vehicles
  - Easy to change if customer picks different car
- [x] Shipping calculator on lead detail page
  - Calculates distance using ZIP code regions
  - Shows open/enclosed transport price ranges
  - Estimates delivery days based on distance

### Phase 1.6: Admin & Settings (Completed)

- [x] Agency admin dashboard (`/admin/dealerships`)
  - Create/manage dealerships
  - Auto-creates manager user when creating dealership
- [x] Manager settings (`/settings/dealership`)
  - Edit dealership info (name, address, website)
  - Manage multiple phone numbers
  - Manage multiple email addresses
- [x] Team management (`/settings/users`)
  - Add users with roles (Sales, Tech, Content Creator, Manager)
  - Pause/Activate user access
  - Reset user passwords
  - Delete users
- [x] Role-based access control
  - Salesperson/Tech/Content Creator: Main nav only
  - Manager: Main nav + Settings section
  - Agency Admin: Main nav + Settings + Admin section

### Phase 2: Email System (Completed)

- [x] Email settings page (`/settings/email`)
  - SMTP configuration (outgoing email)
  - IMAP configuration (incoming email)
  - Connection testing for both
- [x] Email templates management
  - Create/edit reusable templates
  - Categories: Follow-up, Introduction, Offer, Thank You, Custom
  - Variable placeholders for personalization
  - **Personal templates** - Salespeople can create their own (Dec 22, 2024)
  - **Dealership-wide templates** - All dealership users can create shared templates (Dec 23, 2024)
- [x] Email signatures
  - **Personal signatures** - All users can create their own
  - **Dealership-wide signatures** - All dealership users can create shared signatures (Dec 23, 2024)
  - Set default signature
  - **Auto-insert default signature** - Automatically inserts into composer (Dec 23, 2024)
  - **Compact signature UI** - Footer button with dropdown menu (Dec 23, 2024)
- [x] Email client (`/email`)
  - Gmail/Outlook-style 3-panel layout
  - Inbox, Sent, All Mail, Spam, Trash folders
  - Compose new emails with templates
  - Reply to emails (Ctrl+Enter to send)
  - Search emails
  - Link emails to leads
  - Create lead from email with modal
  - Move to Spam/Trash, Restore from Spam/Trash
  - **Enhanced composer** - Auto-signature, compact button UI (Dec 23, 2024)
- [x] Send emails via SMTP
- [x] Receive emails via IMAP
- [x] Auto-link incoming emails to leads by email address
- [x] Auto-create leads from WordPress form submissions

### Email Module Access Matrix

| Feature | Salesperson | Manager | Agency Admin | Contractor |
|---------|:-----------:|:-------:|:------------:|:----------:|
| View Settings → Email | ✅ | ✅ | ✅ | ❌ |
| Email Settings Page | ✅ | ✅ | ✅ | ❌ |
| Create/Edit Signatures (Dealership) | ✅ | ✅ | ✅ | ❌ |
| Create/Edit Signatures (Personal) | ✅ | ✅ | ✅ | ✅ |
| Create/Edit Templates (Dealership) | ✅ | ✅ | ✅ | ❌ |
| Create/Edit Templates (Personal) | ✅ | ✅ | ✅ | ✅ |
| Email Composer with Auto-signature | ✅ | ✅ | ✅ | ✅ |

**Changes (Dec 23, 2024):**
- Salespeople can now access all email settings (previously manager-only)
- Salespeople can create dealership-wide signatures and templates
- Contractors remain restricted to personal signatures/templates only

#### WordPress Form Integration

Auto-create leads from Fluent Forms PRO submissions sent via email notification.

**Fluent Forms Email Configuration:**
- **Subject**: `[LEAD] New Inquiry - {embed_post.post_title}`
- **Body (Plain Text)**:
```
--- LEAD FORM SUBMISSION ---

Full Name: {inputs.user_full_name}
Email: {inputs.user_email}
Phone: {inputs.user_phone_number}

Vehicle: {embed_post.post_title}
Vehicle URL: {embed_post.permalink}

Message:
{inputs.user_message}


--- TRACKING ---
Ip Address : {ip}
Date:{date.m/d/Y}
Browser:{browser.name}
OS/Platform:{browser.platform}


--- META TRACKING ---

Campaign ID: {inputs.campaign_id}
Ad Set ID: {inputs.adset_id}
Ad ID: {inputs.ad_id}
Account ID: {inputs.account_id}
UTM Campaign: {inputs.utm_campaign}
UTM Source: {inputs.utm_source}
UTM Medium: {inputs.utm_medium}
```

**Meta Ads Tracking:**

The system extracts Facebook/Meta Ads attribution data from form submissions:
- **Campaign ID** (`metaCampaignId`) - Facebook campaign ID
- **Ad Set ID** (`metaAdsetId`) - Facebook ad set ID
- **Ad ID** (`metaAdId`) - Facebook ad ID
- **Account ID** (`metaAccountId`) - Facebook account ID
- **UTM Campaign** (`utmCampaign`) - UTM campaign parameter
- **UTM Source** (`utmSource`) - UTM source parameter (e.g., "facebook")
- **UTM Medium** (`utmMedium`) - UTM medium parameter (e.g., "cpc")

To capture these on your WordPress form:
1. Add hidden fields to your Fluent Form: `campaign_id`, `adset_id`, `ad_id`, `account_id`, `utm_campaign`, `utm_source`, `utm_medium`
2. Set their default values from URL parameters (Fluent Forms supports this via Advanced Options)
3. Your Facebook ad URLs should include: `?campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}&utm_source=facebook&utm_medium=cpc&utm_campaign={{campaign.name}}`

**How it works:**
1. User clicks Facebook ad with tracking parameters in URL
2. User fills form on WordPress vehicle page
3. Hidden fields capture the Meta tracking data from URL
4. Fluent Forms sends email to dealership inbox with all tracking info
5. CRM syncs inbox via IMAP
6. System detects `[LEAD]` prefix in subject
7. Parses form data including Meta tracking and creates new lead
8. Links to vehicle if found in inventory
9. Auto-assigns to salesperson (round-robin or if only one)
10. Skips duplicate leads (same email already exists)

#### Titan Email Configuration

For Titan Email users:
- **SMTP Host**: `smtp.titan.email`
- **SMTP Port**: `465` (SSL) or `587` (TLS)
- **IMAP Host**: `imap.titan.email`
- **IMAP Port**: `993` (SSL)
- **Username**: Full email address (e.g., `user@yourdomain.com`)

### Phase 2.5: Communications (Completed)
- [x] Time zone clocks in header (configurable from dealership settings)
- [x] Dealership branding (logo upload, brand color picker)
- [x] Media folder for dealership uploads
- [x] Email composer: auto-insert default signature
- [x] Email composer: "Use Template" dropdown
- [x] Email templates: "Car Description" category added
- [x] Vehicle Sales Info page (Website Description, Technical Bulletpoints, Call Script)
- [x] IPv6 geolocation support for lead IP detection
- [x] Email composer size increased (larger modal for long emails) - Dec 19
- [x] Email threading with In-Reply-To headers - Dec 19
- [x] Email undo feature (10-second send delay) - Dec 19
- [x] Image viewer with zoom/pan/keyboard navigation - Dec 22
- [x] Folder upload supporting nested structure - Dec 22
- [x] Insert images into email composer - Dec 22
- [x] Vehicle detail page redesign (combine details + sales info into single page)
- [ ] Email template selector in lead composer (when sending from lead detail)
- [ ] Vehicle info popup widget (floating panel for quick access during calls)
- [ ] VoIP integration with Yate PBX (click-to-call, call logging)

### Phase 2.75: Documents & Invoicing (Completed)
- [x] Buyer's Order builder (wizard mode, LLC/DBA formatting, professional print layout)
- [x] Invoice builder (wizard mode, payment method selection, wire transfer details)
- [x] Wire transfer details (account name, account number, routing number)
- [ ] DocuSeal integration for digital signatures (planned)

### Phase 3: Contractor System (Completed)

- [x] Contractor user role with department-based access (IT, Marketing, Content)
- [x] Multi-dealership contractor access system
- [x] Request/Ticket system for dealership support requests
- [x] Conversation threads with message history
- [x] File attachment support (images, PDFs, documents up to 25MB)
- [x] Department-based permissions (no assignment required)
- [x] Status workflow: open → in_progress → resolved → closed
- [x] Request priority levels (low, normal, high, urgent)

#### Request System Workflow

1. **Dealership users** (salespersons, managers, content creators) create support requests
   - Select department (IT, Marketing, or Content)
   - Set priority level (low, normal, high, urgent)
   - Add title and description
   - Attach files (images, PDFs, documents)

2. **Contractor dashboard** displays available requests
   - Filtered by contractor's assigned department(s)
   - All contractors in a department see all department requests
   - No assignment required - any contractor can work on any request

3. **Conversation threads** for collaboration
   - View request details, status, and conversation history
   - Post messages to request thread
   - Upload attachments to messages
   - Update request status as work progresses

4. **Status tracking**
   - `open`: New request
   - `in_progress`: Actively being worked on
   - `resolved`: Work complete, pending closure
   - `closed`: Archived

5. **Optional assignment** (for managers)
   - Managers can assign specific contractors to requests
   - Assignee is notified and can claim/work the request
   - Unassigned requests visible to all contractors in department

#### New User Role

- **Contractor**: External team member handling IT, Marketing, or Content requests
  - Assigned to one or more dealerships
  - Assigned to one department (IT, Marketing, or Content)
  - Can only see requests from their assigned dealerships and department
  - Cannot see CRM data (leads, pipeline, etc.)

#### Database Tables

- `contractor_dealership_access` - Junction table for contractor-to-dealership relationships
- `requests` - Support request tickets with status and priority
- `request_messages` - Conversation threads with message history
- `request_attachments` - File uploads associated with messages

### Phase 4: Automation & Analytics (Planned)
- Salesman commission tracker (weekly % tiers, past earnings, payment status)
- Auto-task creation
- Reminder system
- Lead scoring
- WordPress car import (research completed - see below)

### Phase 4: Cross-Dealership Intelligence (Planned)
- Blacklist system (cross-dealership warnings)
- "Never answers" tracking
- Same IP different contact flagging
- Admin analytics portal

## WordPress Car Import (Research Complete)

**Status:** Research phase complete (Dec 22, 2024). Ready for implementation.

**Recommended Approach:** Scheduled sync using WordPress REST API with Application Password authentication.

### Key Findings

**Best WordPress Plugin:** Inventory Presser
- Native REST API support for vehicle listings
- Comprehensive meta field exposure (VIN, year, make, model, price, mileage, etc.)
- Designed for external integrations

**Authentication:** Application Passwords (WordPress core, no plugins required)
- Setup: WordPress Admin → Users → Profile → Application Passwords
- Auth: Basic Auth over HTTPS (`username:app_password`)

**Implementation Strategy:**
1. **Scheduled Sync** - Vercel Cron job every 6 hours
2. **VIN-Based Deduplication** - Primary unique identifier
3. **Stock Number Fallback** - For vehicles without VIN
4. **Image Import** - Download from WordPress, upload to Vercel Blob Storage
5. **Batch Processing** - Handle 100+ vehicles efficiently

**Field Mapping:**
```
WordPress (Inventory Presser)    →    Dr Tokyo CRM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
inventory_presser_year           →    year
inventory_presser_vin            →    vin (unique)
inventory_presser_price          →    askingPrice
inventory_presser_odometer       →    mileage
inventory_presser_color          →    exteriorColor
inventory_presser_transmission   →    transmission
inventory_presser_stock_number   →    stockNumber
inventory_presser_availability   →    status (mapped)
post_content                     →    description (HTML stripped)
wp:featuredmedia                 →    photos[] (downloaded)
```

**Cost Estimate:** ~$1-5/month for 200-1000 vehicles
- Vercel Blob Storage: $0.15/GB
- API requests: Free (WordPress REST API)
- Vercel Cron: Included in Pro plan

**Timeline:** 2-4 weeks to production
- Week 1: WordPress setup, API testing
- Week 2-3: Implementation (client, API routes, image processing)
- Week 4: Testing, monitoring, production deployment

**Environment Variables Needed:**
```bash
WORDPRESS_URL=https://your-wordpress-site.com
WORDPRESS_USERNAME=admin
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx
CRON_SECRET=random-secure-string
BLOB_READ_WRITE_TOKEN=vercel_blob_token
```

**API Endpoints:**
```typescript
POST /api/vehicles/import-wordpress
// Triggers sync, protected by CRON_SECRET
// Returns: { imported, updated, failed, total }

GET /api/vehicles/import-status
// Returns last import log with stats
```

**Prisma Schema Changes:**
```prisma
model Vehicle {
  vin String? @unique
  @@unique([dealershipId, stockNumber], name: "dealership_stock_unique")
}
```

**Error Handling:**
- Retry logic with exponential backoff
- Detailed logging for failed imports
- Rate limiting protection (1200 req/hour)
- Graceful degradation if WordPress unavailable

**Alternative WordPress Plugins:**
- Motors Car Dealership (less REST API support)
- Auto Listings (requires custom field hooks)
- WP Car Manager (basic support)

**Next Steps When Ready to Implement:**
1. Install Inventory Presser on WordPress site
2. Create Application Password in WordPress admin
3. Test REST API access: `GET /wp-json/wp/v2/inventory`
4. Implement WordPress client library (`/src/lib/wordpress-client.ts`)
5. Create import API route (`/src/app/api/vehicles/import-wordpress/route.ts`)
6. Set up Vercel Cron job or GitHub Actions
7. Test with 10-20 vehicles, then full inventory

## Database

### Key Models
- **Lead**: Contact info, stage, win probability, attempt count, vehicle link, Meta Ads tracking (campaign/adset/ad IDs, UTM params)
- **Task**: Follow-ups with due dates, linked to leads
- **Activity**: Timeline of all interactions
- **Vehicle**: Inventory with year/make/model, pricing, status, location
- **Email**: Inbound/outbound emails linked to leads, folder field (null/spam/trash)
- **Document**: Buyer's orders, invoices with status tracking (draft/sent/viewed/signed)
- **Dealership**: Multi-tenant support with SMTP/IMAP config, time zones
- **User**: Salespeople, managers, contractors with roles
- **Request**: Support tickets with department, priority, status, and conversation threads
- **RequestMessage**: Messages in request conversation with timestamps
- **RequestAttachment**: Files attached to requests or messages
- **ContractorDealershipAccess**: Junction table for contractor multi-dealership access

### Lead Stages
1. new_lead (10%)
2. interested (25%)
3. negotiating (50%)
4. buyers_order_sent (65%)
5. buyers_order_signed (80%)
6. invoice_sent (90%)
7. won_invoice_paid (100%)
8. won_preparing (100%)
9. won_ready_to_ship (100%)
10. won_arrived (100%)
11. lost (0%)
12. lost_unanswered (0%)

## Known Bugs

- **Email display name issue**: In email list, sender names like "SANTOS OZUNA EMAIL" should display as "Santos Ozuna" (without "EMAIL" suffix). The fix was attempted in `getDisplayName()` function in `src/app/(dashboard)/email/page.tsx` but still not working. The `fromAddress` field contains the raw "Name <email>" format and needs better parsing.
- **Automatic Lead assignment not working**: New leads from form submissions should auto-assign to salespeople (round-robin), but this isn't functioning. Needs investigation in `src/lib/email-receive.ts`.
- **Activity Timeline missing timestamps**: Activities show dates but not specific times. Should display "Dec 5, 2024 at 3:45 PM" format.

## Known Issues

- Turbopack (Next.js 16 default) can occasionally throw Jest worker errors on Windows. Restart dev server if this happens.
- When modifying Prisma schema, always run `npx prisma generate` and restart dev server for changes to take effect.

## Session Notes

**Current Session (Dec 23, 2024) - Email Module Enhancements:**

1. **Email Module Access for Salespeople**
   - Salespeople now have access to Settings → Email (previously manager-only)
   - Sidebar navigation updated: Shows Email for all dealership users (salespeople, managers, admins)
   - Contractors excluded from email module access (personal templates/signatures only)
   - Email settings page now accessible to salespeople
   - Email templates page allows salespeople to create personal and dealership-wide templates
   - Email signatures page allows salespeople to create personal and dealership-wide signatures

2. **Email Composer Signature Enhancement**
   - Auto-insert default signature when composer opens
   - Visual separator (---) clearly marks signature boundary
   - Compact signature button in footer (replaced large dropdown in header)
   - Easy signature switching via dropdown menu from button
   - Real-time signature preview while composing (not just when sending)

3. **API Endpoints Enhanced**
   - Email templates API: Salespeople can create dealership-wide templates
   - Email signatures API: Salespeople can create dealership-wide signatures
   - Permission checks updated: All dealership users (except contractors) have full access

4. **Bug Fixes**
   - Fixed Button component variants in 7 files (15 total buttons)
   - Changed invalid `variant="outline"` to `variant="secondary"`
   - Files fixed: sidebar.tsx, email pages, template pages, signature pages, vehicle pages

**Previous Session (Dec 22, 2024 PM) - Inventory Permissions & WordPress Research:**

1. **Inventory Permission Fix**
   - Salespeople can now add/edit/delete vehicles (previously manager-only)
   - Updated API routes: `/api/vehicles/route.ts` and `/api/vehicles/[id]/route.ts`
   - New logic: Only contractors are blocked from vehicle management
   - Salespeople, managers, and agency admins all have full inventory access

2. **WordPress Car Import Research** (Phase 4)
   - Comprehensive research completed for WordPress vehicle import integration
   - Recommended plugin: Inventory Presser (best REST API support)
   - Recommended approach: Scheduled sync (Vercel Cron every 6 hours)
   - Authentication: WordPress Application Passwords (core feature, no plugins)
   - VIN-based deduplication with stock number fallback
   - Image import: Download from WordPress, upload to Vercel Blob
   - Cost: ~$1-5/month for 200-1000 vehicles
   - Timeline: 2-4 weeks to production
   - Full implementation plan added to README

**Previous Session (Dec 22, 2024 AM) - Phase 3 Contractor System Completed:**

1. **Contractor User Role & Multi-Dealership Access**
   - New role: `contractor` in UserRole enum
   - Added `contractorDepartment` field (IT, Marketing, Content)
   - `ContractorDealershipAccess` junction table for many-to-many relationships
   - Contractors can access multiple dealerships
   - Contractors are isolated from CRM data (leads, pipeline, etc.)

2. **Request/Ticket System**
   - `Request` model with department, priority, status fields
   - Status workflow: open → in_progress → resolved → closed
   - Priority levels: low, normal, high, urgent
   - Optional assignment to specific contractors
   - Department-based permissions for visibility

3. **Conversation Threads & File Attachments**
   - `RequestMessage` model for thread conversations
   - Timestamps and user tracking on each message
   - `RequestAttachment` model for file uploads (supports up to 25MB)
   - Attachments linked to messages or directly to requests
   - MIME type tracking for all files

4. **Permission System**
   - Contractors only see requests from their assigned dealerships
   - Contractors only see requests from their assigned department
   - No assignment required - any department contractor can work any request
   - Managers can assign specific contractors to requests
   - Dealership users cannot see contractor data

5. **Bug Fixes in Phase 3**
   - Contractor email validation now uses lowercase normalization
   - Auto-attach dealershipId when creating requests
   - Simplified permissions - removed assignment requirement
   - Fixed `canViewRequest` permissions for all user types

**Previous Session (Dec 19-22, 2024) - Email Enhancements & Media Module:**

1. **Email Threading & Composer Improvements** (Dec 19)
   - Implemented automatic email threading with In-Reply-To headers
   - Expanded email composer modal: width 5xl, height 95vh, textarea 500px
   - Email undo feature: 10-second delay with countdown toast and undo button
   - Prevents accidental email sends

2. **Documents Enhancement** (Dec 19)
   - Invoice wire transfer details: account name, account number, routing number fields
   - Appears in wizard mode and full form mode
   - Exports correctly to PDF with proper formatting

3. **Media Module Quick Wins** (Dec 22)
   - Image viewer: Full-screen modal with zoom (0.25x-5x), pan, keyboard navigation
     - Zoom: +/- buttons or +/- keys
     - Pan: Drag when zoomed, arrow keys for navigation
     - Download, image dimensions, image counter
   - Folder upload: Upload entire folders preserving nested structure
     - Recursive folder creation maintains path structure
   - Insert images in email: Media picker with search and multi-select
     - Visual thumbnails in email body (Gmail-style)
     - Available in lead detail and main email module

4. **Personal Email Templates & Signatures** (Dec 22)
   - Salespeople can now create personal email templates
   - Added `userId` field to EmailTemplate model (nullable)
   - API routes updated: `isPersonal` parameter for creation
   - Permission logic:
     - Personal templates: Only owner can edit/delete
     - Dealership-wide templates: Only managers can create/edit/delete
   - Migration: `20251222111944_add_user_id_to_email_templates`
   - Matches existing signature pattern (signatures already supported personal)

**Previous Session (Dec 5, 2024) - Phase 2.75 Documents & Meta Tracking:**
- Invoice Builder: Wizard mode, LLC/DBA formatting, wire transfer method selection
- Meta Ads Tracking: Campaign ID, Ad Set ID, Ad ID, Account ID, UTM parameters
- Buyer's Order: Wizard mode, professional print layout

**Session (Dec 4, 2024) - Phase 2.5 Features:**
- Dealership Branding (logo, colors)
- Media folder uploads
- Email composer enhancements (templates, signatures)
- Vehicle Sales Info page

**Key Files for Documents Module:**
- `src/components/documents/buyers-order-builder.tsx` - Buyer's Order with wizard
- `src/components/documents/invoice-builder.tsx` - Invoice with wizard
- `src/app/api/documents/route.ts` - Document CRUD API
- `src/app/(dashboard)/leads/[id]/page.tsx` - Lead detail with document buttons

**Key Files for Email Module:**
- `src/app/(dashboard)/email/page.tsx` - Email client UI (1000+ lines)
- `src/app/api/email/inbox/route.ts` - Email list API with folder filtering
- `src/app/api/email/[id]/route.ts` - Single email API (GET, PATCH, PUT)
- `src/lib/email-receive.ts` - IMAP sync logic
- `src/lib/email-parser.ts` - Form email parsing for auto-lead creation
- `prisma/schema.prisma` - Email model with folder field

**Prisma Schema Changes:**
If you modify the schema, run:
```bash
npx prisma db push   # Push to database
npx prisma generate  # Regenerate client
# Then restart dev server
```

## Ideas Considered But Deferred

*(See MYIDEAS.md for full list)*

- **Dealership branding/media uploads**: Phase 2.5 with email templates
- **Blacklist system**: Phase 3+ cross-dealership intelligence
- **"Never answers" tracking**: Phase 3+ admin-only analytics

## Scripts

```bash
npm run dev          # Start dev server on port 3100
npm run build        # Production build
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed test data
npm run db:reset     # Reset database (destructive)
```
