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

CREATE TYPE user_role AS ENUM ('salesperson', 'manager', 'agency_admin', 'contractor');

CREATE TYPE contractor_department AS ENUM ('IT', 'Marketing', 'Content');

CREATE TYPE request_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

CREATE TYPE request_priority AS ENUM ('low', 'normal', 'high', 'urgent');

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

-- Users (salespeople, managers, agency admin, contractors)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID REFERENCES dealerships(id),  -- NULL for agency_admin and contractors
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'salesperson',
  voip_extension VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  contractor_department contractor_department,  -- Only for contractors
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contractor-Dealership Access (many-to-many)
CREATE TABLE contractor_dealerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(contractor_id, dealership_id)
);

CREATE INDEX idx_contractor_dealerships_contractor ON contractor_dealerships(contractor_id);
CREATE INDEX idx_contractor_dealerships_dealership ON contractor_dealerships(dealership_id);

-- Requests/Tickets
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),

  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  department contractor_department NOT NULL,
  priority request_priority NOT NULL DEFAULT 'normal',
  status request_status NOT NULL DEFAULT 'open',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP
);

CREATE INDEX idx_requests_dealership ON requests(dealership_id);
CREATE INDEX idx_requests_department ON requests(department);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_assigned ON requests(assigned_to);

-- Request Messages (conversation thread)
CREATE TABLE request_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),

  message TEXT NOT NULL,
  attachment_path TEXT,
  attachment_name VARCHAR(255),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_request_messages_request ON request_messages(request_id);

-- Request Message Reads (read receipts)
CREATE TABLE request_message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES request_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX idx_request_message_reads_message ON request_message_reads(message_id);

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

### 5. Requests/Tickets Module

**Route:** `/requests`

**Purpose:** Dealership-contractor communication and task management

**Available to:** All users (filtered by role and permissions)

**Layout:**
- List view with request cards
- Filters: Status, Department, Priority
- Click card → Request detail with conversation thread

**Request Detail:**

**Header:**
- Title, department badge, priority badge, status badge
- Created by, assigned to, timestamps
- Status update dropdown (role-based permissions)
- Assign/Unassign contractor button

**Conversation Thread:**
- Chronological message list
- Each message shows: sender, timestamp, message content
- File attachments display with download links
- Read receipts: "Read by [names]" below each message
- Real-time updates (30 second polling)

**Message Input:**
- Text area for new messages
- File attachment button (images, PDFs, documents)
- Send button

**Actions:**
- Add message to thread
- Upload file attachment
- Change status (based on role)
- Assign to contractor
- Mark as resolved/closed

**Contractor View Differences:**
- See only requests for their department
- Can assign themselves to unassigned requests
- Update status as they work
- Add progress updates and file attachments

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

### Contractors
```
GET    /api/contractors                            # List all contractors
POST   /api/contractors                            # Create contractor
GET    /api/contractors/:id                        # Get contractor details
PUT    /api/contractors/:id                        # Update contractor
DELETE /api/contractors/:id                        # Delete contractor
GET    /api/contractors/:id/dealerships            # Get assigned dealerships
POST   /api/contractors/:id/dealerships            # Assign dealerships
DELETE /api/contractors/:id/dealerships/:dealershipId  # Remove assignment
```

### Requests
```
GET    /api/requests                               # List requests (filtered by role)
POST   /api/requests                               # Create request
GET    /api/requests/:id                           # Get request details
PUT    /api/requests/:id                           # Update request
DELETE /api/requests/:id                           # Delete request
PUT    /api/requests/:id/status                    # Update status
PUT    /api/requests/:id/assign                    # Assign contractor
GET    /api/requests/:id/messages                  # Get conversation thread
POST   /api/requests/:id/messages                  # Add message to thread
PUT    /api/requests/:id/messages/:messageId/read  # Mark message as read
POST   /api/requests/:id/attachments               # Upload attachment
GET    /api/requests/stats                         # Get request statistics
GET    /api/contractors/:id/requests               # Get contractor's requests
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

## Recent Improvements (Dec 19-22, 2024)

### Quick Wins Completed (Dec 19-22)

1. **Email Threading Enhancement** (Dec 19)
   - Implemented automatic email threading for lead conversations
   - Emails properly use In-Reply-To headers to maintain conversation threads
   - Replying to a lead automatically continues the existing email thread

2. **Email Composer Size Increase** (Dec 19)
   - Increased modal width from `max-w-4xl` to `max-w-5xl`
   - Increased modal height from `max-h-[90vh]` to `max-h-[95vh]`
   - Increased textarea height from `min-h-[350px]` to `min-h-[500px]`
   - Reduces scrolling when composing long emails

3. **Invoice Wire Transfer Details** (Dec 19)
   - Added fields for account name, account number, and routing number
   - Wire transfer instructions display complete banking information
   - Available in both wizard mode and full form mode
   - Shows in PDF print output with proper formatting

4. **Media Folder Recursive Deletion** (Dec 19)
   - Folders can now be deleted even when they contain files and subfolders
   - Automatically deletes all nested contents recursively
   - No need to manually empty folders before deletion

5. **Email Undo Feature** (Dec 19)
   - 10-second delay before sending emails (like Gmail/Titan)
   - Toast notification with countdown timer
   - One-click "Undo" button to cancel send
   - Restores email content when undone
   - Prevents accidental sends

6. **Email Module Access for Salespeople - COMPLETED** (Dec 22)
   - **Expanded Permissions**
     - Salespeople can now access Settings → Email module (previously manager-only)
     - Salespeople can create personal email templates
     - Salespeople can create dealership-wide signatures and templates
     - Contractors excluded from email module access
   - **Enhanced Email Composer**
     - Auto-insert default signature when composer opens
     - Visual signature separator (---) for clarity
     - Compact signature button in footer (replaced large dropdown)
     - Easy signature switching via dropdown menu
     - Real-time signature preview while composing
   - **Bug Fixes**
     - Fixed 15 Button component variants across 7 files (changed invalid `variant="outline"` to `variant="secondary"`)

7. **Phase 3: Contractor System & Requests - COMPLETED** (Dec 22)
   - **Contractor Role System**
     - New `contractor` user role with department specialization
     - Three departments: IT (full access), Marketing (leads/email), Content (media/inventory)
     - Multi-dealership assignment (many-to-many relationship)
     - Dealership selector in navigation (like agency admin)
     - Department-based permission system
   - **Request/Ticket System**
     - Create requests with department, priority, and file attachments
     - Full conversation threads with real-time updates
     - Read receipts showing who viewed messages
     - Status workflow: Open → In Progress → Resolved → Closed
     - Priority levels: Low, Normal, High, Urgent with color-coded badges
     - Request assignment to contractors
     - Filter by status, department, and dealership
     - File attachment support in messages
   - **Contractor Management UI**
     - Admin interface to create and manage contractors
     - Assign/unassign dealerships
     - Track contractor workload
     - Department badges for easy identification

8. **Media Module Enhancements - COMPLETED** (Dec 22)
   - **Image Viewer with Zoom, Pan, and Navigation**
     - Full-screen modal viewer with zoom 0.25x to 5x
     - Pan/drag when zoomed (grab cursor feedback)
     - Keyboard shortcuts: arrow keys for navigation, +/- for zoom, Esc to close
     - Next/Previous navigation buttons
     - Download functionality
     - Image dimensions and position display
   - **Folder Upload Support**
     - Upload entire folders preserving nested structure
     - Recursive folder creation
     - Maintains folder hierarchy and path structure
     - Batch file upload capability
   - **Insert Images into Email Composer**
     - Media picker modal with search functionality
     - Multi-select images from media library
     - Images render as visual thumbnails in email body (Gmail-style)
     - Available in both lead detail and main email module
     - Maintains text direction and formatting

---

## Contractor System & Request Management

### Overview

Phase 3 introduces a contractor role system and request/ticket module for dealerships to collaborate with external contractors (IT, Marketing, Content).

### User Roles & Departments

**Contractor Role:**
- External service providers with specialized department access
- Can be assigned to multiple dealerships
- Department determines permissions and visibility

**Contractor Departments:**

| Department | Access Permissions |
|-----------|-------------------|
| **IT** | Settings, Users, Media, Email, Inventory, Dealership Config |
| **Content** | Media, Inventory |
| **Marketing** | Leads, Email Templates, Media |

### For Agency Admins

**Managing Contractors:**

1. Navigate to **Admin > Contractors**
2. Click **"Create Contractor"** button
3. Fill in contractor details:
   - Name and email
   - Select department (IT, Marketing, Content)
   - Set password
4. Click **"Assign Dealerships"** to grant access
5. Select one or more dealerships
6. Monitor contractor activity in dashboard

**Contractor Management Features:**
- View all contractors with department badges
- Edit contractor information and department
- Reassign dealerships
- Deactivate contractor accounts
- Track contractor request workload

### For Dealership Users

**Creating Requests:**

1. Navigate to **Requests** in sidebar
2. Click **"New Request"** button
3. Fill in request details:
   - **Title**: Brief description
   - **Description**: Full details of the request
   - **Department**: IT, Marketing, or Content
   - **Priority**: Low, Normal, High, or Urgent
   - **Attachments** (optional): Upload files
4. Submit request

**Managing Requests:**

- View all requests in list with filters
- Filter by status (Open, In Progress, Resolved, Closed)
- Filter by department
- Click request to view full conversation thread
- Add messages to conversation
- Attach additional files as needed
- Mark as resolved when complete
- Reopen if issue persists

**Request Features:**
- Real-time conversation threads
- File attachments (images, documents)
- Read receipts showing who has viewed messages
- Priority badges for urgent items
- Status tracking through workflow

### For Contractors

**Switching Between Dealerships:**

- Use dealership selector in top navigation
- Switches to selected dealership's context
- View requests specific to that dealership

**Working with Requests:**

1. Navigate to **Requests** in sidebar
2. View requests filtered to your department
3. Click on unassigned request
4. Click **"Assign to Me"** to take ownership
5. Update status to **"In Progress"**
6. Respond in conversation thread
7. Upload work files or screenshots
8. Update status to **"Resolved"** when complete
9. Close request after client confirmation

**Contractor Workflow:**

- **Open**: New requests awaiting assignment
- **In Progress**: Actively working on request
- **Resolved**: Work complete, pending client approval
- **Closed**: Request fully complete and approved

**Best Practices:**
- Respond to requests within 24 hours
- Update status regularly to keep clients informed
- Use attachments to show progress
- Mark resolved only when work is complete
- Close requests after client confirms satisfaction

### Request Priority Levels

| Priority | Description | Badge Color |
|---------|-------------|------------|
| **Low** | Non-urgent, can be handled in normal schedule | Gray |
| **Normal** | Standard priority, handle in regular queue | Blue |
| **High** | Important, prioritize in daily work | Orange |
| **Urgent** | Critical issue, immediate attention required | Red |

### API Endpoints

**Contractor Management** (8 endpoints):
- `GET /api/contractors` - List contractors
- `POST /api/contractors` - Create contractor
- `GET /api/contractors/:id` - Get contractor details
- `PUT /api/contractors/:id` - Update contractor
- `DELETE /api/contractors/:id` - Delete contractor
- `GET /api/contractors/:id/dealerships` - Get assigned dealerships
- `POST /api/contractors/:id/dealerships` - Assign dealerships
- `DELETE /api/contractors/:id/dealerships/:dealershipId` - Remove assignment

**Request System** (13 endpoints):
- `GET /api/requests` - List requests (filtered by role)
- `POST /api/requests` - Create request
- `GET /api/requests/:id` - Get request details
- `PUT /api/requests/:id` - Update request
- `DELETE /api/requests/:id` - Delete request
- `PUT /api/requests/:id/status` - Update status
- `PUT /api/requests/:id/assign` - Assign contractor
- `GET /api/requests/:id/messages` - Get conversation
- `POST /api/requests/:id/messages` - Add message
- `PUT /api/requests/:id/messages/:messageId/read` - Mark read
- `POST /api/requests/:id/attachments` - Upload attachment
- `GET /api/requests/stats` - Get statistics
- `GET /api/contractors/:id/requests` - Get contractor's requests

For detailed API documentation, see `CONTRACTOR_API_REFERENCE.md`.

---

## Development Phases

### Phase 1: Core CRM (Priority - MVP) ✅ COMPLETED

**Goal:** Replace paper, get salespeople using it

- [x] Project setup (Next.js, TypeScript, PostgreSQL, Prisma)
- [x] Database schema creation
- [x] Auth system (login, sessions, JWT-based)
- [x] Dealership CRUD (admin only)
- [x] User CRUD (admin/manager)
- [x] Lead CRUD with deduplication
- [x] Pipeline board (Kanban with drag-drop)
- [x] Lead detail page
- [x] Activity logging (manual - "I called", "I emailed" buttons)
- [x] Task system with auto-generation
- [x] "My Day" task list view
- [x] Follow-up cadence logic (the 5-attempt system)

### Phase 2: Communications ✅ COMPLETED

**Goal:** Call and email from within the app

- [x] Email integration (IMAP/SMTP)
- [x] In-app email compose with templates and signatures
- [x] In-app inbox
- [x] Email-to-lead auto-linking
- [x] Email open tracking
- [x] **Email threading** - Automatic conversation threading with In-Reply-To headers
- [x] Email folder management (inbox, spam, trash, important)
- [ ] Yate PBX service setup (planned for future)
- [ ] Click-to-call from app (planned for future)
- [ ] Call logging (planned for future)
- [ ] Incoming call popup with lead lookup (planned for future)

### Phase 2.5: Media Management ✅ COMPLETED (Dec 22, 2024)

**Goal:** Organize and manage dealership media assets

- [x] Media folder structure with nested folders
- [x] File upload with drag-and-drop support
- [x] **Folder upload** - Upload entire folders preserving structure (Dec 22)
- [x] Grid and list view modes
- [x] **Image viewer with zoom** - Full-screen modal with pan, drag-to-pan, keyboard navigation (Dec 22)
  - Zoom: 0.25x to 5x with +/- keys or buttons
  - Pan: Click-drag when zoomed, arrow keys for navigation
  - Download button, image dimensions display
- [x] **Insert images into emails** - Rich contentEditable composer with visual thumbnails (Dec 22)
  - Media picker modal with search and multi-select
  - Images render as visual previews in email body
  - Available in lead detail and main email module
- [x] Image preview functionality
- [x] File operations (rename, move, delete, recursive folder deletion)
- [x] Search functionality
- [x] Breadcrumb navigation
- [x] Agency admin dealership selector with search
- [x] Permission system - all authenticated users can access media

### Phase 2.75: Documents & Invoicing ✅ COMPLETED (Dec 5, 2024)

**Goal:** Generate and sign paperwork digitally

- [x] Buyer's Order builder with wizard mode
- [x] LLC/DBA name formatting
- [x] Professional print layouts with brand colors
- [x] Invoice builder with wizard mode
- [x] Payment method selection (Wire Transfer, Cashier's Check)
- [x] **Wire transfer details** - Account name, account number, routing number
- [x] Buyer's Order linking to invoices
- [x] PDF generation and printing
- [x] Document status tracking (draft, sent, viewed, signed)
- [ ] DocuSeal integration for digital signatures (planned)
- [ ] Loan agreement template (planned)

### Phase 3: Contractor Access & Request System ✅ COMPLETED (Dec 22, 2024)

**Goal:** Enable external contractors (IT, Marketing, Content) to work with dealerships

#### Contractor Role System
- [x] New user role: `contractor` with department field (IT, Marketing, Content)
- [x] Contractor-to-dealership access mapping (many-to-many relationship)
- [x] Department-based permissions:
  - **IT contractors**: Full access (settings, users, media, email, inventory, dealership config)
  - **Content creators**: Media and inventory (upload photos/descriptions)
  - **Marketing contractors**: Leads, email templates, and media
- [x] Contractor management interface for agency admins
- [x] Dealership selector for contractors (like agency admin)

#### Request/Ticket System Module
- [x] New "Requests" module for dealerships and contractors
- [x] Create request with:
  - Department selection (IT, Marketing, Content)
  - Title and description
  - File attachments
  - Priority level (Low, Normal, High, Urgent)
- [x] Contractor notification of new requests
- [x] Full conversation thread per request:
  - Text messages
  - File attachments (images, documents)
  - Read receipts with "Read by" display
  - Timestamp for each message
  - Real-time updates via polling
- [x] Request status tracking (Open, In Progress, Resolved, Closed)
- [x] Request assignment to specific contractor
- [x] Filter requests by status, department, dealership
- [x] Priority badges and status indicators
- [x] Department routing to correct contractors

#### Media Module - Completed & Future Enhancements
- [x] **Folder upload** ✅ (Dec 22, 2024)
- [x] **Image viewer with zoom/pan/navigation** ✅ (Dec 22, 2024)
- [x] **Insert images into email composer** ✅ (Dec 22, 2024)
- [ ] **Vehicle-based organization** (Future):
  - Auto-create folder per vehicle (using VIN or stock number)
  - Subfolders: Exterior, Interior, Engine, Damage, Documents
  - Link vehicle media to inventory listings
  - Auto-display vehicle photos in email templates
  - Integration with vehicle inventory system

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

## Troubleshooting

### Common Issues

**Q: Contractor can't see any requests**
- Verify contractor is assigned to the correct dealership in Admin > Contractors
- Check that contractor's department matches the request department
- Confirm contractor has selected the correct dealership from the selector

**Q: Unable to assign contractor to request**
- Ensure contractor's department matches the request department
  - IT contractors can only be assigned to IT requests
  - Marketing contractors only to Marketing requests
  - Content contractors only to Content requests
- Verify contractor has access to the request's dealership

**Q: File upload fails in request attachments**
- Check file size is under the maximum limit (typically 10MB)
- Verify file type is allowed (images, PDFs, documents)
- Ensure proper write permissions on upload directory
- Check browser console for detailed error messages

**Q: Read receipts not updating**
- Real-time updates use polling (30 second intervals)
- Refresh the page to force immediate update
- Check browser network tab for failed API calls

**Q: Can't change request status**
- Only assigned contractors can change status
- Dealership users can mark as resolved/closed
- Agency admins have full access to modify status

**Q: Contractor doesn't appear in assignment dropdown**
- Verify contractor is assigned to the dealership
- Check contractor's department matches request department
- Confirm contractor account is active (not deactivated)

**Q: Dealership selector not appearing for contractor**
- Ensure user role is set to `contractor` (not salesperson/manager)
- Verify contractor has at least one dealership assignment
- Check that contractor has logged out and back in after assignment

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
│   │   │   ├── users/
│   │   │   └── contractors/    # Contractor management
│   │   ├── requests/            # Request/ticket system
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── leads/
│   │   │   ├── tasks/
│   │   │   ├── activities/
│   │   │   ├── voip/
│   │   │   ├── emails/
│   │   │   ├── contractors/     # Contractor endpoints
│   │   │   ├── requests/        # Request endpoints
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