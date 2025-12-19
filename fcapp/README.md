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
│   │   ├── settings/    # Manager settings
│   │   │   ├── dealership/  # Dealership info
│   │   │   ├── email/       # Email config
│   │   │   └── users/       # Team management
│   │   └── admin/       # Agency admin pages
│   │       └── dealerships/ # Manage dealerships
│   └── api/             # API routes
├── components/
│   ├── ui/              # Button, Input, Badge, Card
│   ├── layout/          # Sidebar, Header
│   ├── pipeline/        # LeadCard, PipelineColumn
│   └── email/           # EmailComposer
├── lib/
│   ├── db/              # Prisma client
│   ├── auth.ts          # JWT helpers
│   ├── leads.ts         # Lead business logic
│   ├── email.ts         # SMTP send
│   ├── email-receive.ts # IMAP sync
│   └── email-parser.ts  # Form submission parser
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
- [x] Email signatures
  - Personal or dealership-wide signatures
  - Set default signature
- [x] Email client (`/email`)
  - Gmail/Outlook-style 3-panel layout
  - Inbox, Sent, All Mail, Spam, Trash folders
  - Compose new emails with templates
  - Reply to emails (Ctrl+Enter to send)
  - Search emails
  - Link emails to leads
  - Create lead from email with modal
  - Move to Spam/Trash, Restore from Spam/Trash
- [x] Send emails via SMTP
- [x] Receive emails via IMAP
- [x] Auto-link incoming emails to leads by email address
- [x] Auto-create leads from WordPress form submissions

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

### Phase 2.5: Communications (In Progress)
- [x] Time zone clocks in header (configurable from dealership settings)
- [x] Dealership branding (logo upload, brand color picker)
- [x] Media folder for dealership uploads
- [x] Email composer: auto-insert default signature
- [x] Email composer: "Use Template" dropdown
- [x] Email templates: "Car Description" category added
- [x] Vehicle Sales Info page (Website Description, Technical Bulletpoints, Call Script)
- [x] IPv6 geolocation support for lead IP detection
- [ ] Media folder enhancements (folder creation for organizing 100+ car photos)
- [ ] Vehicle detail page redesign (combine details + sales info into single page)
- [ ] Email template selector in lead composer (when sending from lead detail)
- [ ] Email composer size (make larger for long emails)
- [ ] Vehicle info popup widget (floating panel for quick access during calls)
- [ ] VoIP integration with Yate PBX (click-to-call, call logging)

### Phase 2.75: Documents & Invoicing (Planned)
- [ ] Buyer's Order builder (generate from lead + vehicle, electronic signature)
- [ ] Invoice builder (generate from lead + vehicle + dealership data)

### Phase 3: Automation & Analytics (Planned)
- Salesman commission tracker (weekly % tiers, past earnings, payment status)
- Auto-task creation
- Reminder system
- Lead scoring
- WordPress car import

### Phase 4: Cross-Dealership Intelligence (Planned)
- Blacklist system (cross-dealership warnings)
- "Never answers" tracking
- Same IP different contact flagging
- Admin analytics portal

## Database

### Key Models
- **Lead**: Contact info, stage, win probability, attempt count, vehicle link, Meta Ads tracking (campaign/adset/ad IDs, UTM params)
- **Task**: Follow-ups with due dates, linked to leads
- **Activity**: Timeline of all interactions
- **Vehicle**: Inventory with year/make/model, pricing, status, location
- **Email**: Inbound/outbound emails linked to leads, folder field (null/spam/trash)
- **Document**: Buyer's orders, invoices with status tracking (draft/sent/viewed/signed)
- **Dealership**: Multi-tenant support with SMTP/IMAP config, time zones
- **User**: Salespeople with roles

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

**Last Session (Dec 5, 2024) - Phase 2.75 Documents & Meta Tracking:**

1. **Invoice Builder Overhaul**
   - Added wizard mode with 6 steps: Buyer's Order link, LLC info, Payment method, Amount, Customer, Review
   - LLC/DBA name formatting: **LLC Name** DBA *Dealership Name*
   - Payment method selection: Wire Transfer or Cashier's Check (with bank branch info)
   - Links to Buyer's Order number - description shows "Payment as per Buyer's Order Number XXX"
   - Separate dealership address (header) vs LLC address (payment section)
   - File: `src/components/documents/invoice-builder.tsx`

2. **Meta Ads Tracking**
   - Updated email parser to extract Facebook/Meta attribution data from WordPress form emails
   - New Lead fields: `metaAccountId`, `utmCampaign`, `utmSource`, `utmMedium`
   - Parses Campaign ID, Ad Set ID, Ad ID, Account ID, and UTM parameters
   - Files: `src/lib/email-parser.ts`, `src/lib/email-receive.ts`
   - Schema updated with new fields on Lead model

3. **Buyer's Order Enhancements** (from previous session)
   - Wizard mode for quick completion
   - LLC/DBA formatting
   - Auto-populate salesperson from logged-in user
   - Professional A4 print layout

**Previous Session (Dec 4, 2024) - Phase 2.5 Features:**
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
