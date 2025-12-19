FCapp - Car Dealership CRM
Project Brief for Claude

Context
You are helping build FCapp, a lightweight CRM for car dealerships. This is being built from scratch (not using ERPNext or other existing ERPs) because the target users (car salespeople) have rejected traditional CRMs - "paper works better for them."
The operator is a marketing agency that runs Meta ads for up to 10 classic car dealerships. Each dealership has 1-3 salespeople. The agency owner needs cross-dealership analytics to optimize ad campaigns.
Core philosophy: The system must be smart so the salesperson can be simple. They work through a daily task list - the system handles the thinking.

Technical Stack
LayerTechnologyRationaleFrontendNext.js (TypeScript)Modern, fast, can become PWADatabasePostgreSQLTraditional, portable, easy to migrate serversORMPrisma or DrizzleType-safe database accessAuthNextAuth.js or custom JWTSimple, self-containedVoIPYate PBX + custom API bridgeSeparate service, REST API for appEmailIMAP/SMTP integrationDirect connection to email providersDocumentsReact-PDF or PDFKitGenerate buyer's orders, invoicesSignaturesDocuSeal (self-hosted, open source)Digital signaturesMeta IntegrationMeta Marketing APICampaign data, lead attributionLLM (Phase 4)Anthropic Claude APILead summaries, analysis
Deployment path: Local development first → can move to any VPS/server with PostgreSQL

Database Schema
sql-- Multi-tenancy: Every query filters by dealership_id
-- Agency admin role bypasses dealership filter for analytics

CREATE TYPE user_role AS ENUM ('salesperson', 'manager', 'agency_admin');

CREATE TYPE lead_stage AS ENUM (
  'new_lead',
  'interested',
  'negotiating',
  'buyers_order_sent',
  'buyers_order_signed',
  'invoice_sent',
  'won_invoice_paid',
  'won_preparing',
  'won_ready_to_ship',
  'won_arrived',
  'lost',
  'lost_unanswered'
);

CREATE TYPE lead_source AS ENUM (
  'meta_ad',
  'website_form',
  'phone_call',
  'walk_in',
  'referral'
);

CREATE TYPE activity_type AS ENUM (
  'email_sent',
  'email_received',
  'call_outbound',
  'call_inbound',
  'call_missed',
  'voicemail_left',
  'note_added',
  'stage_changed',
  'document_sent',
  'document_signed'
);

CREATE TYPE task_type AS ENUM (
  'follow_up_call',
  'follow_up_email',
  'review_document',
  'custom'
);

CREATE TYPE document_type AS ENUM (
  'buyers_order',
  'invoice',
  'loan_agreement'
);

CREATE TYPE document_status AS ENUM (
  'draft',
  'sent',
  'viewed',
  'signed'
);

-- Dealerships (tenants)
CREATE TABLE dealerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users (salespeople, managers, agency admin)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID REFERENCES dealerships(id),  -- NULL for agency_admin
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'salesperson',
  voip_extension VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Leads (the core entity)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id),
  assigned_to UUID REFERENCES users(id),
  
  -- Pipeline
  stage lead_stage NOT NULL DEFAULT 'new_lead',
  win_probability DECIMAL(3,2) DEFAULT 0.10,
  
  -- Source & Attribution
  source lead_source,
  meta_campaign_id VARCHAR(100),
  meta_adset_id VARCHAR(100),
  meta_ad_id VARCHAR(100),
  
  -- Contact Info
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  primary_email VARCHAR(255),
  primary_phone VARCHAR(50),
  alternate_emails TEXT[] DEFAULT '{}',
  alternate_phones TEXT[] DEFAULT '{}',
  
  -- Location
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  
  -- Interest
  interested_vehicle TEXT,
  notes TEXT,
  
  -- Follow-up Tracking
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  next_follow_up_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  
  -- Indexes for deduplication
  CONSTRAINT idx_lead_primary_email UNIQUE (dealership_id, primary_email) WHERE primary_email IS NOT NULL
);

CREATE INDEX idx_leads_dealership ON leads(dealership_id);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);
CREATE INDEX idx_leads_phone ON leads(primary_phone);
CREATE INDEX idx_leads_next_followup ON leads(next_follow_up_at);

-- Activity Log (full history of interactions)
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  activity_type activity_type NOT NULL,
  details JSONB DEFAULT '{}',  -- email content, call duration, old/new stage, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activities_lead ON activities(lead_id);
CREATE INDEX idx_activities_created ON activities(created_at);

-- Tasks (auto-generated and manual)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  dealership_id UUID NOT NULL REFERENCES dealerships(id),
  
  task_type task_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  due_date DATE NOT NULL,
  due_time TIME,
  
  is_auto_generated BOOLEAN DEFAULT false,
  attempt_number INTEGER,  -- For follow-up sequence (1-5)
  
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_due ON tasks(user_id, due_date) WHERE completed = false;
CREATE INDEX idx_tasks_dealership ON tasks(dealership_id);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  dealership_id UUID NOT NULL REFERENCES dealerships(id),
  
  document_type document_type NOT NULL,
  status document_status DEFAULT 'draft',
  
  file_path TEXT,  -- Local file path or URL
  signature_request_id VARCHAR(255),  -- From DocuSeal
  
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  signed_at TIMESTAMP
);

CREATE INDEX idx_documents_lead ON documents(lead_id);

-- Meta Campaign Mapping (links Meta campaigns to dealerships)
CREATE TABLE meta_campaign_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id),
  meta_campaign_id VARCHAR(100) NOT NULL UNIQUE,
  campaign_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Email Messages (for in-app email)
CREATE TABLE emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id),
  dealership_id UUID NOT NULL REFERENCES dealerships(id),
  
  direction VARCHAR(10) NOT NULL,  -- 'inbound' or 'outbound'
  from_address VARCHAR(255) NOT NULL,
  to_address VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  body_text TEXT,
  body_html TEXT,
  
  message_id VARCHAR(255),  -- Email Message-ID header for threading
  in_reply_to VARCHAR(255),
  
  is_read BOOLEAN DEFAULT false,
  opened_at TIMESTAMP,  -- Tracking pixel detection
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_emails_lead ON emails(lead_id);
CREATE INDEX idx_emails_user ON emails(user_id);

-- Call Logs (from Yate PBX)
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id),
  dealership_id UUID NOT NULL REFERENCES dealerships(id),
  
  direction VARCHAR(10) NOT NULL,  -- 'inbound' or 'outbound'
  from_number VARCHAR(50),
  to_number VARCHAR(50),
  did_used VARCHAR(50),  -- Which DID was used for outbound
  
  status VARCHAR(20),  -- 'answered', 'missed', 'voicemail', 'busy', 'failed'
  duration_seconds INTEGER DEFAULT 0,
  recording_path TEXT,
  
  yate_call_id VARCHAR(100),
  
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);

CREATE INDEX idx_calls_lead ON call_logs(lead_id);
CREATE INDEX idx_calls_user ON call_logs(user_id);
```

---

## Pipeline Stages & Win Probability

When a lead's stage changes, auto-update `win_probability`:

| Stage | Win % | Auto Follow-up? |
|-------|-------|-----------------|
| new_lead | 10% | YES |
| interested | 20% | NO |
| negotiating | 40% | NO |
| buyers_order_sent | 60% | Optional |
| buyers_order_signed | 85% | NO |
| invoice_sent | 95% | NO |
| won_invoice_paid | 100% | NO |
| won_preparing | 100% | NO |
| won_ready_to_ship | 100% | NO |
| won_arrived | 100% | NO |
| lost | 0% | NO |
| lost_unanswered | 0% | NO |

---

## Follow-Up Attempt Logic

**Applies to:** `new_lead` stage only

**Business logic to implement:**
```
When lead is created with stage = 'new_lead':
  → Set next_follow_up_at = NOW (immediate task)
  → Create Task: "Initial contact - Attempt 1"

When salesperson completes task and marks "No response":
  → Increment attempt_count
  → Based on attempt_count, calculate next_follow_up_at:
      Attempt 1 → 2: +1 day
      Attempt 2 → 3: +2 days  
      Attempt 3 → 4: +3 days
      Attempt 4 → 5: +3 days
  → Create new Task for next attempt
  
When attempt_count reaches 5 and still no response:
  → Auto-change stage to 'lost_unanswered'
  → Set closed_at = NOW
  → No more tasks generated

When lead responds with interest (salesperson marks "Responded"):
  → Change stage to 'interested'
  → Clear next_follow_up_at
  → Set attempt_count = 0
  → Stop generating follow-up tasks
```

---

## Core User Interfaces

### 1. Pipeline Board (Kanban)

**Route:** `/dashboard` or `/pipeline`

**Layout:**
- Horizontal scrolling columns, one per stage
- Cards are draggable between columns
- Dropping a card on a column = stage change

**Card content:**
- Lead name
- Interested vehicle (truncated)
- Days in current stage
- Next task due indicator
- Source icon (Meta, phone, etc.)

**Filters:**
- By assigned salesperson
- By date range
- By source

**Actions:**
- Click card → Navigate to Lead Detail
- Drag card → Change stage (with confirmation for backward moves)

### 2. "My Day" Task List

**Route:** `/my-day` (default landing page for salespeople)

**This is where salespeople spend 80% of their time.**

**Layout:**
- Single column list of today's tasks
- Grouped: Overdue → Due Today → Upcoming
- Each task is expandable or links to lead

**Task card content:**
- Lead name + primary phone + primary email
- Task title ("Follow-up call - Attempt 3 of 5")
- Time due (if set)
- Quick action buttons

**Quick actions (without leaving the list):**
- 📞 Call → Initiates VoIP call
- ✉️ Email → Opens compose modal
- ✅ Mark Complete → Logs activity, asks for outcome
- ❌ No Response → Logs attempt, generates next task

**Outcome modal (on complete):**
- "Did they respond?"
  - Yes, interested → Move to Interested stage
  - Yes, not interested → Move to Lost
  - No answer → Increment attempt, schedule next

### 3. Lead Detail Page

**Route:** `/leads/[id]`

**Layout:** Single page with all lead info

**Sections:**

**Header:**
- Name, stage badge, win probability
- Click-to-call button, click-to-email button
- Edit button, Delete button

**Contact Info Panel:**
- Primary phone, primary email
- Alternate phones/emails
- Location (city, state)
- Source + Meta campaign (if applicable)

**Vehicle Interest:**
- Text field or dropdown

**Activity Timeline:**
- Chronological list of all activities
- Icons by type (📞 call, ✉️ email, 📝 note, 🔄 stage change)
- Expandable for details (email content, call duration)

**Notes:**
- Free-form text area
- Auto-saves

**Documents:**
- List of buyer's orders, invoices
- Status badges (draft, sent, signed)
- Generate new document button

**Tasks:**
- Upcoming tasks for this lead
- Complete/reschedule buttons

### 4. Agency Dashboard (Admin Only)

**Route:** `/admin/dashboard`

**Purpose:** Cross-dealership analytics for ad optimization

**Metrics:**
- Total leads by dealership
- Conversion rate by stage (funnel visualization)
- Average time in each stage
- Win rate by source
- Win rate by Meta campaign
- Geographic breakdown (which states produce buyers)
- Lead volume over time

---

## API Routes (Next.js API or separate Express)

### Auth
```
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/change-password
```

### Dealerships (admin only)
```
GET    /api/dealerships
POST   /api/dealerships
GET    /api/dealerships/:id
PUT    /api/dealerships/:id
DELETE /api/dealerships/:id
```

### Users
```
GET    /api/users                    # List users (filtered by dealership for non-admin)
POST   /api/users                    # Create user (admin or manager)
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
```

### Leads
```
GET    /api/leads                    # List with filters (stage, assigned, date range)
POST   /api/leads                    # Create (runs deduplication check)
GET    /api/leads/:id
PUT    /api/leads/:id
DELETE /api/leads/:id
PUT    /api/leads/:id/stage          # Change stage (logs activity, updates win_probability)
POST   /api/leads/:id/merge          # Merge with another lead
GET    /api/leads/duplicates         # Find potential duplicates
```

### Activities
```
GET    /api/leads/:id/activities     # Activity timeline for lead
POST   /api/leads/:id/activities     # Log manual activity (note, call, email)
```

### Tasks
```
GET    /api/tasks                    # My tasks (filtered by due date)
GET    /api/tasks/today              # Today's tasks for current user
POST   /api/tasks                    # Create manual task
PUT    /api/tasks/:id
PUT    /api/tasks/:id/complete       # Mark complete (with outcome)
DELETE /api/tasks/:id
```

### Documents
```
GET    /api/leads/:id/documents
POST   /api/leads/:id/documents      # Generate document
GET    /api/documents/:id
PUT    /api/documents/:id/send       # Send for signature
GET    /api/documents/:id/download   # Download PDF
```

### VoIP (proxy to Yate)
```
POST   /api/voip/call                # Initiate outbound call
POST   /api/voip/hangup
GET    /api/voip/status/:callId
POST   /api/voip/webhook/incoming    # Yate webhook for incoming calls
POST   /api/voip/webhook/ended       # Yate webhook for call ended
```

### Email
```
GET    /api/emails                   # Inbox for current user
GET    /api/emails/:id
POST   /api/emails                   # Send email
POST   /api/emails/webhook/incoming  # Webhook for incoming emails
```

### Meta Integration
```
GET    /api/meta/campaigns           # List campaigns from Meta
POST   /api/meta/mappings            # Map campaign to dealership
GET    /api/meta/mappings
GET    /api/meta/metrics/:campaignId
POST   /api/meta/webhook/lead        # Meta Lead Ads webhook
```

### Analytics (admin only)
```
GET    /api/analytics/overview       # Dashboard summary
GET    /api/analytics/funnel         # Conversion funnel
GET    /api/analytics/by-source
GET    /api/analytics/by-campaign
GET    /api/analytics/by-geography
GET    /api/analytics/by-dealership

Lead Deduplication Logic
On lead creation, before inserting:
javascriptasync function checkDuplicates(dealership_id, email, phone) {
  const duplicates = await db.query(`
    SELECT id, first_name, last_name, primary_email, primary_phone, stage
    FROM leads
    WHERE dealership_id = $1
      AND (
        primary_email = $2 
        OR primary_phone = $3
        OR $2 = ANY(alternate_emails)
        OR $3 = ANY(alternate_phones)
      )
  `, [dealership_id, email, phone]);
  
  return duplicates;
}

// If duplicates found, return them to UI for user decision:
// - Create anyway (different person, same contact)
// - Merge with existing lead
// - Cancel creation
```

**Merge logic:**
- Keep primary contact info from "winner" (user chooses)
- Add other lead's emails/phones to alternate arrays
- Combine activity histories
- Keep higher stage (further in pipeline)
- Sum attempt counts if both in new_lead stage
- Delete the "loser" lead

---

## VoIP Integration (Yate PBX)

**Yate runs as separate service** with its own API.

**DID rotation logic:**
- Each dealership has N DIDs assigned
- Track last used DID per dealership
- Round-robin: After every ~5 outbound calls, switch to next DID
- Prevents spam flagging

**Yate API service endpoints:**
```
POST /api/call/initiate
Body: { from_extension, to_number, dealership_id }
Returns: { call_id, did_used }

POST /api/call/hangup
Body: { call_id }

GET /api/call/status/:call_id
Returns: { status, duration }

Webhooks (Yate → App):
POST /webhook/call/started   { call_id, direction, from, to }
POST /webhook/call/answered  { call_id }
POST /webhook/call/ended     { call_id, duration, status }

Email Integration
Architecture: IMAP polling + SMTP sending
Per dealership configuration:
json{
  "imap_host": "imap.gmail.com",
  "imap_port": 993,
  "smtp_host": "smtp.gmail.com",
  "smtp_port": 587,
  "email_address": "sales@dealership.com",
  "password": "encrypted_password"
}
```

**Email → Lead linking:**
1. On incoming email, extract sender address
2. Search leads where `primary_email = sender OR sender = ANY(alternate_emails)`
3. If found, link email to lead
4. If not found, create new lead with source = 'email'

**Open tracking:**
- Embed tracking pixel in outgoing emails
- Pixel URL: `/api/emails/track/:email_id`
- On pixel load, update `opened_at`

---

## Development Phases

### Phase 1: Core CRM (Priority - MVP)

**Goal:** Replace paper, get salespeople using it

- [ ] Project setup (Next.js, TypeScript, PostgreSQL, Prisma/Drizzle)
- [ ] Database schema creation
- [ ] Auth system (login, sessions, role-based access)
- [ ] Dealership CRUD (admin only)
- [ ] User CRUD (admin/manager)
- [ ] Lead CRUD with deduplication
- [ ] Pipeline board (Kanban with drag-drop)
- [ ] Lead detail page
- [ ] Activity logging (manual - "I called", "I emailed" buttons)
- [ ] Task system with auto-generation
- [ ] "My Day" task list view
- [ ] Follow-up cadence logic (the 5-attempt system)

### Phase 2: Communications

**Goal:** Call and email from within the app

- [ ] Yate PBX service setup
- [ ] Yate API bridge
- [ ] Click-to-call from app
- [ ] Call logging (auto-save to activities)
- [ ] Incoming call popup with lead lookup
- [ ] Email integration (IMAP/SMTP)
- [ ] In-app email compose
- [ ] In-app inbox
- [ ] Email-to-lead auto-linking
- [ ] Email open tracking

### Phase 3: Documents

**Goal:** Generate and sign paperwork digitally

- [ ] Buyer's Order template
- [ ] PDF generation
- [ ] DocuSeal integration (or similar)
- [ ] Document status tracking
- [ ] Invoice generation
- [ ] Loan agreement template (5 pages, pages 1 & 5 variable)

### Phase 4: Intelligence & Analytics

**Goal:** Optimize ads, add AI assistance

- [ ] Meta Marketing API integration
- [ ] Campaign-to-dealership mapping
- [ ] Lead attribution tracking
- [ ] Agency dashboard (cross-dealership analytics)
- [ ] Geographic analysis (buyer locations)
- [ ] LLM integration: Summarize lead communications
- [ ] LLM integration: Suggest responses
- [ ] LLM integration: Analyze which creatives perform best

---

## File Structure (Suggested)
```
fcapp/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── my-day/
│   │   │   ├── pipeline/
│   │   │   ├── leads/
│   │   │   │   └── [id]/
│   │   │   ├── settings/
│   │   │   └── layout.tsx
│   │   ├── admin/
│   │   │   ├── dashboard/
│   │   │   ├── dealerships/
│   │   │   └── users/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── leads/
│   │   │   ├── tasks/
│   │   │   ├── activities/
│   │   │   ├── voip/
│   │   │   ├── emails/
│   │   │   └── meta/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                # Shared UI components
│   │   ├── pipeline/          # Kanban board
│   │   ├── leads/             # Lead card, detail
│   │   ├── tasks/             # Task list, task card
│   │   └── layout/            # Nav, sidebar
│   ├── lib/
│   │   ├── db.ts              # Database client
│   │   ├── auth.ts            # Auth utilities
│   │   ├── email.ts           # Email service
│   │   ├── voip.ts            # Yate API client
│   │   └── meta.ts            # Meta API client
│   ├── hooks/                 # React hooks
│   └── types/                 # TypeScript types
├── yate-service/              # Separate Yate PBX service
│   ├── Dockerfile
│   ├── config/
│   └── api/                   # Express API for Yate
├── docker-compose.yml
├── .env.example
└── README.md

Environment Variables
env# Database
DATABASE_URL=postgresql://fcapp:password@localhost:5432/fcapp

# Auth
JWT_SECRET=your-secret-key
SESSION_DURATION_DAYS=7

# Yate PBX
YATE_API_URL=http://localhost:3020

# Email (default, can be overridden per dealership)
DEFAULT_IMAP_HOST=imap.gmail.com
DEFAULT_SMTP_HOST=smtp.gmail.com

# Meta
META_APP_ID=your-app-id
META_APP_SECRET=your-app-secret

# LLM (Phase 4)
ANTHROPIC_API_KEY=your-key

UI/UX Principles

"My Day" is home - Salespeople land here, work from here
One-click actions - Call, email, complete task = single click
Minimal navigation - Two main views: My Day + Pipeline
Fast - Page loads under 1 second, no spinners for basic actions
Paper simple - If paper was enough, this should feel equally light
Mobile works but desktop first - They use Windows PCs at desks


Getting Started Commands
bash# Initialize project
npx create-next-app@latest fcapp --typescript --tailwind --app

# Add dependencies
npm install @prisma/client prisma
npm install next-auth
npm install @tanstack/react-query
npm install @dnd-kit/core @dnd-kit/sortable  # For drag-drop

# Initialize Prisma
npx prisma init

# After creating schema
npx prisma migrate dev --name init
npx prisma generate

# Run dev server
npm run dev

Start with Phase 1. Get the pipeline board and task list working with fake data, then connect to PostgreSQL. Once a salesperson can drag leads and complete tasks, you have an MVP.