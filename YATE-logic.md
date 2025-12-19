# FCapp VoIP Architecture
================================================================================

## Infrastructure Components
================================================================================

### DID Providers (Phone Numbers)
┌─────────────────┬──────────┬─────────────────┐
│ Provider        │ DIDs     │ Purpose         │
├─────────────────┼──────────┼─────────────────┤
│ Telnyx          │ 100      │ Primary pool    │
│ VoIP.ms         │ 100      │ Secondary pool  │
│ Flowroute       │ 100      │ Tertiary pool   │
├─────────────────┼──────────┼─────────────────┤
│ TOTAL           │ ~300     │                 │
└─────────────────┴──────────┴─────────────────┘

### SIP Providers (Call Routes)
┌─────────────────┬──────────┬─────────────────┐
│ Provider        │ Priority │ Use Case        │
├─────────────────┼──────────┼─────────────────┤
│ Telnyx          │ 1        │ Primary         │
│ VoIP.ms         │ 2        │ Secondary       │
│ Flowroute       │ 3        │ Tertiary        │
│ Twilio          │ 4        │ Failover        │
│ Plivo           │ 5        │ Failover        │
└─────────────────┴──────────┴─────────────────┘


## Full Architecture Diagram
================================================================================

┌─────────────────────────────────────────────────────────────────────────────────┐
│                            DID PROVIDERS (Numbers)                              │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                 │
│  │   TELNYX        │  │   VoIP.ms       │  │   Flowroute     │                 │
│  │   100 DIDs      │  │   100 DIDs      │  │   100 DIDs      │                 │
│  │                 │  │                 │  │                 │                 │
│  │ +1-305-555-0001 │  │ +1-786-555-0001 │  │ +1-954-555-0001 │                 │
│  │ +1-305-555-0002 │  │ +1-786-555-0002 │  │ +1-954-555-0002 │                 │
│  │ ...             │  │ ...             │  │ ...             │                 │
│  │ +1-305-555-0100 │  │ +1-786-555-0100 │  │ +1-954-555-0100 │                 │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                 │
│                                                                                 │
│                            TOTAL: ~300 DIDs                                     │
└─────────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          SIP PROVIDERS (Call Routes)                            │
│                                                                                 │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐        │
│  │  Telnyx   │ │ VoIP.ms   │ │ Flowroute │ │  Twilio   │ │  Plivo    │        │
│  │   SIP     │ │   SIP     │ │   SIP     │ │   SIP     │ │   SIP     │        │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘        │
│                                                                                 │
│        Any DID can route through ANY SIP provider (with proper config)         │
└─────────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              YATE PBX SERVER                                    │
│                         (Self-hosted on VPS)                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FCapp CRM                                          │
│                         (Next.js + PostgreSQL)                                  │
└─────────────────────────────────────────────────────────────────────────────────┘


## Per Dealership Number Structure
================================================================================

Each dealership has:
┌─────────────────┬──────────┬───────────────────────────────────────┐
│ Number Type     │ Quantity │ Purpose                               │
├─────────────────┼──────────┼───────────────────────────────────────┤
│ Main Advertised │ 1        │ On Meta Ads, website, business cards  │
│ Sales Line      │ 1        │ Ring group for inbound sales calls    │
│ Outbound Pool   │ Variable │ For calling leads (5 leads max/DID)   │
└─────────────────┴──────────┴───────────────────────────────────────┘


## Dealership Call Flow Diagram
================================================================================

┌─────────────────────────────────────────────────────────────────────────────────┐
│                         DEALERSHIP: MIAMI AUTO                                  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                     MAIN ADVERTISED NUMBER                               │   │
│  │                      +1-305-555-1000                                     │   │
│  │                                                                          │   │
│  │              (On Meta Ads, Website, Business Cards)                      │   │
│  │                                                                          │   │
│  │   Customer Calls ──► IVR: "Press 1 for Sales, 2 for Service..."         │   │
│  │                              │                                           │   │
│  │                              ▼                                           │   │
│  │                     ┌─────────────────┐                                  │   │
│  │                     │    Press 1      │                                  │   │
│  │                     └────────┬────────┘                                  │   │
│  │                              │                                           │   │
│  │                              ▼                                           │   │
│  └──────────────────────────────┼──────────────────────────────────────────┘   │
│                                 │                                               │
│                                 ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      SALES LINE (2nd Number)                             │   │
│  │                        +1-305-555-1001                                   │   │
│  │                                                                          │   │
│  │              Ring Group: All Sales Agents (anyone can pick up)           │   │
│  │                                                                          │   │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                    │   │
│  │   │  Joe    │  │  Ana    │  │  Mike   │  │  Sara   │                    │   │
│  │   │ Agent 1 │  │ Agent 2 │  │ Agent 3 │  │ Agent 4 │                    │   │
│  │   └─────────┘  └─────────┘  └─────────┘  └─────────┘                    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    OUTBOUND DIDs POOL (for this dealership)              │   │
│  │                                                                          │   │
│  │   DID #1: +1-305-555-2001          DID #2: +1-305-555-2002              │   │
│  │   ┌─────────────────────┐          ┌─────────────────────┐              │   │
│  │   │ Lead: John Doe      │          │ Lead: Sarah Smith   │              │   │
│  │   │ Lead: Mike Johnson  │          │ Lead: Tom Brown     │              │   │
│  │   │ Lead: Lisa Wong     │          │ Lead: Amy Chen      │              │   │
│  │   │ Lead: Bob Miller    │          │ Lead: (available)   │              │   │
│  │   │ Lead: Jane Davis    │          │ Lead: (available)   │              │   │
│  │   │ ───── FULL ─────    │          │                     │              │   │
│  │   └─────────────────────┘          └─────────────────────┘              │   │
│  │                                                                          │   │
│  │   DID #3: +1-305-555-2003          DID #4: +1-305-555-2004              │   │
│  │   ┌─────────────────────┐          ┌─────────────────────┐              │   │
│  │   │ Lead: (available)   │          │ Lead: (available)   │              │   │
│  │   │ Lead: (available)   │          │ ...                 │              │   │
│  │   │ ...                 │          │                     │              │   │
│  │   └─────────────────────┘          └─────────────────────┘              │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘


## Outbound Call Logic (Lead DID Assignment)
================================================================================

┌─────────────────────────────────────────────────────────────────────────────────┐
│                     AGENT CLICKS "CALL" ON NEW LEAD                             │
│                                                                                 │
│                              FCapp Logic:                                       │
│                                                                                 │
│   1. Check: Does this lead already have an assigned DID?                        │
│      │                                                                          │
│      ├──► YES ──► Use that DID for the call                                    │
│      │                                                                          │
│      └──► NO  ──► Find available DID for this dealership:                      │
│                   │                                                             │
│                   ▼                                                             │
│          ┌─────────────────────────────────────────────┐                       │
│          │  SELECT did FROM outbound_dids              │                       │
│          │  WHERE dealership_id = 'miami'              │                       │
│          │  AND assigned_leads_count < 5               │                       │
│          │  ORDER BY assigned_leads_count ASC          │                       │
│          │  LIMIT 1                                    │                       │
│          └─────────────────────────────────────────────┘                       │
│                   │                                                             │
│                   ▼                                                             │
│          Assign DID +1-305-555-2002 to this lead                               │
│          (Forever linked: Lead ↔ DID)                                          │
│                                                                                 │
│   2. Select SIP Provider (round-robin or least-cost routing):                   │
│      │                                                                          │
│      ├──► Call #1: Route via Telnyx SIP                                        │
│      ├──► Call #2: Route via VoIP.ms SIP                                       │
│      ├──► Call #3: Route via Flowroute SIP                                     │
│      └──► (rotate for cost/redundancy)                                         │
│                                                                                 │
│   3. Initiate call with Caller ID = Assigned DID                               │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘


## Same DID, Different SIP Providers (How It Works)
================================================================================

Lead: John Doe
Assigned DID: +1-305-555-2001
        │
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      YATE PBX                                   │
│                                                                 │
│   Call #1 (Monday)    ──► Telnyx SIP    ──► Customer Phone     │
│   Call #2 (Tuesday)   ──► VoIP.ms SIP   ──► Customer Phone     │
│   Call #3 (Wednesday) ──► Flowroute SIP ──► Customer Phone     │
│                                                                 │
│   All calls show same Caller ID: +1-305-555-2001               │
│   Customer sees consistent number every time                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Benefits:
  • Cost optimization (route via cheapest provider)
  • Failover (if Telnyx is down, use VoIP.ms)
  • Load balancing

Note: DID provider and SIP provider can be different, but some providers 
      require you to use their SIP if using their DIDs. Check terms.


## Inbound Call Flow (Customer Calls Back)
================================================================================

Customer Phone: +1-555-123-4567
        │
        │ Dials +1-305-555-2001 (the DID they were called from)
        ▼
┌─────────────────┐
│  Telnyx         │ Routes to Yate via SIP trunk
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      YATE PBX                                   │
│                                                                 │
│   1. Incoming call to +1-305-555-2001 from +1-555-123-4567     │
│                         │                                       │
│                         ▼                                       │
│   2. Lookup: Which lead is assigned to this DID                │
│      with caller ID +1-555-123-4567?                           │
│                         │                                       │
│                         ▼                                       │
│   3. Found: Lead "John Doe" at Miami Dealership                │
│             Assigned Agent: Joe                                 │
│                         │                                       │
│                         ▼                                       │
│   4. Route call to Agent Joe's softphone/browser               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FCapp CRM                                  │
│                                                                 │
│   Agent Joe sees popup:                                         │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  INCOMING CALL                                          │  │
│   │                                                         │  │
│   │  Lead: John Doe                                         │  │
│   │  Phone: +1-555-123-4567                                 │  │
│   │  Vehicle Interest: 1955 Chevrolet 3100                  │  │
│   │  Last Contact: 2 days ago                               │  │
│   │  Notes: Interested in financing options                 │  │
│   │                                                         │  │
│   │  [Accept]  [Decline]  [Send to Voicemail]              │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘


## Agent View in FCapp
================================================================================

┌─────────────────────────────────────────────────────────────────┐
│  LEAD: John Doe                                    [Call] [SMS] │
├─────────────────────────────────────────────────────────────────┤
│  Phone: +1-555-123-4567                                         │
│  Assigned DID: +1-305-555-2001                                  │
│  Vehicle Interest: 1955 Chevrolet 3100                          │
│  Source: Meta Ad (Campaign: Top Lease New)                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  CALL HISTORY                                            │   │
│  │                                                          │   │
│  │  📞 Dec 4, 2:30 PM - Outbound - 3:45 min  [▶ Play]      │   │
│  │     Via: Telnyx SIP                                      │   │
│  │                                                          │   │
│  │  📞 Dec 3, 10:15 AM - Inbound - 1:22 min  [▶ Play]      │   │
│  │     Via: VoIP.ms SIP                                     │   │
│  │                                                          │   │
│  │  📵 Dec 2, 4:00 PM - Missed call                        │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘


## Database Schema
================================================================================

-- DIDs Pool
CREATE TABLE dids (
    id UUID PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE,
    did_provider VARCHAR(50),           -- 'telnyx', 'voipms', 'flowroute'
    did_type VARCHAR(20),               -- 'main_advertised', 'sales_line', 'outbound_pool'
    dealership_id UUID REFERENCES dealerships(id),
    assigned_leads_count INT DEFAULT 0, -- Max 5 for outbound_pool
    is_active BOOLEAN DEFAULT true
);

-- Lead ↔ DID Assignment (Each lead gets ONE DID forever)
CREATE TABLE lead_did_assignments (
    id UUID PRIMARY KEY,
    lead_id UUID REFERENCES leads(id),
    did_id UUID REFERENCES dids(id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(lead_id)
);

-- SIP Providers
CREATE TABLE sip_providers (
    id UUID PRIMARY KEY,
    name VARCHAR(50),                   -- 'telnyx', 'voipms', 'twilio', 'plivo', 'flowroute'
    sip_server VARCHAR(255),
    username VARCHAR(255),
    password VARCHAR(255),
    priority INT,                       -- For routing preference
    cost_per_minute DECIMAL(10,4),
    is_active BOOLEAN DEFAULT true
);

-- Call Records
CREATE TABLE calls (
    id UUID PRIMARY KEY,
    lead_id UUID REFERENCES leads(id),
    did_id UUID REFERENCES dids(id),
    sip_provider_id UUID REFERENCES sip_providers(id),
    direction VARCHAR(10),              -- 'inbound', 'outbound'
    caller_id VARCHAR(20),
    destination VARCHAR(20),
    duration_seconds INT,
    recording_url TEXT,
    started_at TIMESTAMP,
    ended_at TIMESTAMP
);


## Cost Estimate
================================================================================

┌─────────────────────────┬──────────┬────────────┬─────────────┐
│ Item                    │ Quantity │ Unit Cost  │ Monthly     │
├─────────────────────────┼──────────┼────────────┼─────────────┤
│ DIDs (Telnyx)           │ 100      │ $1/mo      │ $100        │
│ DIDs (VoIP.ms)          │ 100      │ $0.85/mo   │ $85         │
│ DIDs (Flowroute)        │ 100      │ $1.25/mo   │ $125        │
│ Outbound minutes        │ 10,000   │ $0.007/min │ $70         │
│ Inbound minutes         │ 5,000    │ $0.005/min │ $25         │
│ Yate VPS Server         │ 1        │ $40/mo     │ $40         │
├─────────────────────────┼──────────┼────────────┼─────────────┤
│ TOTAL                   │          │            │ ~$445/mo    │
└─────────────────────────┴──────────┴────────────┴─────────────┘

If serving 100 dealerships = $4.45/dealership/month for full VoIP!


## Summary
================================================================================

┌─────────────────────────┬──────────┬───────────────────────────────────────────┐
│ Component               │ Quantity │ Purpose                                   │
├─────────────────────────┼──────────┼───────────────────────────────────────────┤
│ DID Providers           │ 2-3      │ Own the phone numbers (~300 total)        │
│ SIP Providers           │ 4-5      │ Route calls (redundancy + cost)           │
│ Main Advertised DID     │ 1/dealer │ On ads/website, has IVR                   │
│ Sales Line DID          │ 1/dealer │ Ring group for inbound                    │
│ Outbound Pool DIDs      │ Variable │ 5 leads max per DID                       │
└─────────────────────────┴──────────┴───────────────────────────────────────────┘