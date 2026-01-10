# Testing Tracker - FCapp

> **Purpose**: Manual testing checklist for all implemented features. Mark each item as you test it and note any issues found.

**Legend:**
- [ ] Not tested yet
- [x] Tested and working ✅
- [!] Tested but has issues ❌

---

## Phase 1: Core CRM

### Authentication & Access Control
- [ ] **Login with valid credentials** - john@classiccars.com / password123
  - Status:
  - Notes:

- [ ] **Logout functionality**
  - Status:
  - Notes:

- [ ] **Role-based access - Salesperson role**
  - Can see: My Day, Pipeline, Leads, Inventory, Email, Media
  - Cannot see: Settings, Admin sections
  - Status:
  - Notes:

- [ ] **Role-based access - Manager role**
  - Can see: Everything + Settings section
  - Cannot see: Admin section
  - Status:
  - Notes:

- [ ] **Role-based access - Agency Admin role**
  - Can see: Everything including Admin section
  - Can switch between dealerships
  - Status:
  - Notes:

### Lead Management

- [ ] **Create new lead manually**
  - Fill all fields, save successfully
  - Status:
  - Notes:

- [ ] **Duplicate detection on lead creation**
  - Try creating lead with existing email
  - Should show duplicate warning
  - Status:
  - Notes:

- [ ] **Edit lead details**
  - Update contact info, notes, vehicle interest
  - Status:
  - Notes:

- [ ] **Lead merge functionality**
  - Merge two duplicate leads
  - Verify activity history combined
  - Status:
  - Notes:

- [ ] **Delete lead**
  - Delete a test lead
  - Verify it's removed from pipeline
  - Status:
  - Notes:

### Pipeline Board (Kanban)

- [ ] **View pipeline board**
  - All stages display correctly
  - Leads show in correct columns
  - Status:
  - Notes:

- [ ] **Drag lead between stages**
  - Drag from "New Lead" to "Interested"
  - Win probability updates automatically
  - Activity log created
  - Status:
  - Notes:

- [ ] **Lead cards display correct info**
  - Name, vehicle, days in stage, source icon
  - Status:
  - Notes:

- [ ] **Filter by salesperson**
  - Filter shows only assigned leads
  - Status:
  - Notes:

- [ ] **Click lead card to open detail page**
  - Status:
  - Notes:

### Lead Detail Page

- [ ] **View lead details**
  - All contact info displays
  - Activity timeline shows
  - Status:
  - Notes:

- [ ] **Edit contact information inline**
  - Change email, phone, name
  - Auto-saves
  - Status:
  - Notes:

- [ ] **Add note to lead**
  - Type note, save, verify in activity timeline
  - Status:
  - Notes:

- [ ] **Quick action buttons**
  - Log Call, Log Email, Log Voicemail buttons work
  - Create activity in timeline
  - Status:
  - Notes:

- [ ] **Link vehicle to lead**
  - Select vehicle from inventory
  - Shows vehicle details
  - Status:
  - Notes:

- [ ] **Shipping calculator**
  - Enter ZIP codes
  - Shows distance, price range, delivery days
  - Status:
  - Notes:

### Task System & Follow-up Cadence

- [ ] **"My Day" task list**
  - Shows today's tasks
  - Grouped: Overdue, Due Today, Upcoming
  - Status:
  - Notes:

- [ ] **Create manual task**
  - Add task for a lead
  - Set due date
  - Status:
  - Notes:

- [ ] **Complete task**
  - Mark task complete
  - Activity logged
  - Status:
  - Notes:

- [ ] **5-attempt follow-up cadence**
  - Create new lead (stage = new_lead)
  - Verify task created immediately
  - Mark "No Response" → next task scheduled (+1 day)
  - Repeat 5 times → lead auto-moves to "lost_unanswered"
  - Status:
  - Notes:

---

## Phase 1.5: Inventory System

### Vehicle Management

- [ ] **View inventory page**
  - Table shows all vehicles
  - Status badges display
  - Status:
  - Notes:

- [ ] **Add new vehicle**
  - Fill form (year, make, model, VIN, price, etc.)
  - Save successfully
  - Status:
  - Notes:

- [ ] **Edit vehicle details**
  - Modify pricing, status, location
  - Status:
  - Notes:

- [ ] **Delete vehicle**
  - Remove test vehicle
  - Status:
  - Notes:

- [ ] **Filter by vehicle status**
  - Filter: Available, Pending, Reserved, Sold
  - Status:
  - Notes:

- [ ] **Vehicle Sales Info page** (Details tab)
  - View website description
  - View technical bulletpoints
  - View call script
  - Status:
  - Notes:

---

## Phase 1.6: Admin & Settings

### Agency Admin - Dealerships

- [ ] **Create new dealership** (agency_admin only)
  - Fill name, address
  - Auto-creates manager user
  - Status:
  - Notes:

- [ ] **Edit dealership**
  - Update dealership info
  - Status:
  - Notes:

- [ ] **Delete dealership**
  - Remove test dealership
  - Status:
  - Notes:

- [ ] **Switch between dealerships** (agency_admin)
  - Use dealership selector
  - Data filters correctly
  - Status:
  - Notes:

### Manager Settings - Dealership Info

- [ ] **Edit dealership name and address**
  - Save changes
  - Status:
  - Notes:

- [ ] **Manage phone numbers**
  - Add/remove multiple phones
  - Status:
  - Notes:

- [ ] **Manage email addresses**
  - Add/remove multiple emails
  - Status:
  - Notes:

- [ ] **Upload dealership logo**
  - Upload image file
  - Shows in header
  - Status:
  - Notes:

- [ ] **Set brand color**
  - Use color picker
  - Updates UI theme
  - Status:
  - Notes:

- [ ] **Configure time zone clocks**
  - Add/remove time zones
  - Shows in header
  - Status:
  - Notes:

### Manager Settings - Team Management

- [ ] **Add new user**
  - Create salesperson
  - Create tech/content creator
  - Set role correctly
  - Status:
  - Notes:

- [ ] **Edit user details**
  - Change name, email, role
  - Status:
  - Notes:

- [ ] **Pause user access**
  - Mark user inactive
  - User cannot login
  - Status:
  - Notes:

- [ ] **Activate paused user**
  - Reactivate user
  - User can login again
  - Status:
  - Notes:

- [ ] **Reset user password**
  - Set new password
  - User logs in with new password
  - Status:
  - Notes:

- [ ] **Delete user**
  - Remove test user
  - Status:
  - Notes:

---

## Phase 2: Email System

### Email Configuration

- [ ] **Configure SMTP settings**
  - Enter SMTP host, port, credentials
  - Test connection (should succeed)
  - Status:
  - Notes:

- [ ] **Configure IMAP settings**
  - Enter IMAP host, port, credentials
  - Test connection (should succeed)
  - Status:
  - Notes:

### Email Templates

- [ ] **Create personal template (Salesperson)** (NEW Dec 22)
  - Log in as salesperson
  - Create template with "Personal Template" option checked
  - Only visible to you
  - Status:
  - Notes:

- [ ] **Create dealership-wide template (Manager)**
  - Log in as manager
  - Create template without "Personal" checked
  - Visible to all users
  - Status:
  - Notes:

- [ ] **Edit personal template (Owner only)**
  - Edit your own personal template
  - Try to edit someone else's personal template (should fail)
  - Status:
  - Notes:

- [ ] **Delete personal template (Owner only)**
  - Delete your own personal template
  - Try to delete someone else's personal template (should fail)
  - Status:
  - Notes:

- [ ] **Salespeople cannot create dealership templates**
  - Try creating dealership-wide template as salesperson
  - Should show permission error
  - Status:
  - Notes:

- [ ] **Use template in email composer**
  - Open composer, select template
  - Variables replaced correctly
  - Status:
  - Notes:

### Email Signatures

- [ ] **Create email signature**
  - Add signature content
  - Set as default
  - Status:
  - Notes:

- [ ] **Auto-insert signature in new emails**
  - Compose new email
  - Signature appears automatically
  - Status:
  - Notes:

### Email Client

- [ ] **View inbox**
  - Shows received emails
  - Unread count accurate
  - Status:
  - Notes:

- [ ] **View sent emails**
  - Shows sent messages
  - Status:
  - Notes:

- [ ] **Search emails**
  - Search by subject/sender
  - Returns correct results
  - Status:
  - Notes:

- [ ] **Compose new email**
  - Fill to, subject, body
  - Send successfully
  - Status:
  - Notes:

- [ ] **Reply to email (Ctrl+Enter)**
  - Open email, click Reply
  - Press Ctrl+Enter to send
  - Status:
  - Notes:

- [ ] **Email threading**
  - Reply to email
  - Verify In-Reply-To header set
  - Thread continues correctly
  - Status:
  - Notes:

- [ ] **Email undo feature**
  - Send email, see countdown toast
  - Click "Undo" within 10 seconds
  - Email send cancelled, content restored
  - Status:
  - Notes:

- [ ] **Link email to lead**
  - Select lead from dropdown
  - Email linked correctly
  - Status:
  - Notes:

- [ ] **Create lead from email**
  - Click "Create Lead" button
  - Modal opens, pre-fills contact info
  - Lead created successfully
  - Status:
  - Notes:

- [ ] **Auto-link incoming emails to leads**
  - Receive email from existing lead contact
  - Automatically linked
  - Status:
  - Notes:

- [ ] **Move email to Spam**
  - Mark email as spam
  - Moves to Spam folder
  - Status:
  - Notes:

- [ ] **Move email to Trash**
  - Delete email
  - Moves to Trash folder
  - Status:
  - Notes:

- [ ] **Restore from Spam/Trash**
  - Restore email to inbox
  - Status:
  - Notes:

### WordPress Form Integration

- [ ] **Auto-create lead from WordPress form email**
  - Send test form submission email with [LEAD] prefix
  - IMAP syncs email
  - Lead created automatically
  - Contact info parsed correctly
  - Status:
  - Notes:

- [ ] **Meta Ads tracking captured**
  - Form email includes Campaign ID, Ad Set ID, Ad ID
  - Lead created with Meta fields populated
  - UTM parameters captured
  - Status:
  - Notes:

- [ ] **Link to vehicle from form**
  - Form references vehicle in inventory
  - Lead linked to correct vehicle
  - Status:
  - Notes:

- [ ] **Auto-assign lead from form** ⚠️ KNOWN BUG
  - Lead should auto-assign to salesperson (round-robin)
  - Status: NOT WORKING
  - Notes: Needs investigation in email-receive.ts

---

## Phase 2.5: Media Module

### Media Folder Management

- [ ] **View media folders**
  - Navigate through folder structure
  - Breadcrumb navigation works
  - Status:
  - Notes:

- [ ] **Create new folder**
  - Add folder, verify in list
  - Status:
  - Notes:

- [ ] **Upload single file**
  - Drag-drop or browse to upload
  - File appears in current folder
  - Status:
  - Notes:

- [ ] **Upload entire folder** (NEW Dec 22)
  - Select folder upload option
  - Folder structure preserved
  - All files uploaded
  - Status:
  - Notes:

- [ ] **View modes (grid/list)**
  - Switch between grid and list view
  - Status:
  - Notes:

- [ ] **Image preview**
  - Click image to preview
  - Status:
  - Notes:

- [ ] **Rename file/folder**
  - Rename successfully
  - Status:
  - Notes:

- [ ] **Delete file/folder**
  - Delete with confirmation
  - Recursive deletion for folders with contents
  - Status:
  - Notes:

- [ ] **Search media**
  - Search by filename
  - Returns correct results
  - Status:
  - Notes:

- [ ] **Agency admin dealership selector**
  - Switch dealerships
  - Media filtered correctly
  - Status:
  - Notes:

### Image Viewer (NEW Dec 22)

- [ ] **Open image in full-screen viewer**
  - Click image to open modal
  - Status:
  - Notes:

- [ ] **Zoom in/out**
  - Use +/- buttons or keyboard
  - Zoom range: 0.25x to 5x
  - Status:
  - Notes:

- [ ] **Pan/drag when zoomed**
  - Zoom in, drag to pan
  - Status:
  - Notes:

- [ ] **Next/Previous navigation**
  - Arrow buttons or keyboard arrows
  - Cycles through images in folder
  - Status:
  - Notes:

- [ ] **Keyboard shortcuts**
  - Arrow keys: Next/Previous
  - +/-: Zoom in/out
  - Esc: Close viewer
  - Status:
  - Notes:

- [ ] **Download functionality**
  - Download button works
  - Status:
  - Notes:

- [ ] **Image dimensions display**
  - Shows width x height
  - Status:
  - Notes:

### Email Image Insertion (NEW Dec 22)

- [ ] **Insert images into email - Main email module**
  - Compose email
  - Click "Insert Images" button
  - Media picker modal opens
  - Status:
  - Notes:

- [ ] **Insert images into email - Lead detail page**
  - Open lead, compose email
  - Insert images from media library
  - Status:
  - Notes:

- [ ] **Media picker search**
  - Search for images in picker
  - Status:
  - Notes:

- [ ] **Multi-select images**
  - Select multiple images
  - All inserted into email
  - Status:
  - Notes:

- [ ] **Images render as thumbnails (Gmail-style)**
  - Visual thumbnails display in composer
  - Not just file names
  - Status:
  - Notes:

- [ ] **Send email with images**
  - Email sends successfully
  - Recipient sees images
  - Status:
  - Notes:

---

## Phase 2.75: Documents & Invoicing

### Buyer's Order

- [ ] **Create Buyer's Order - Wizard mode**
  - Follow wizard steps
  - Auto-populate salesperson
  - LLC/DBA formatting works
  - Status:
  - Notes:

- [ ] **Create Buyer's Order - Full form**
  - Fill all fields manually
  - Status:
  - Notes:

- [ ] **Print Buyer's Order**
  - Print preview
  - Professional A4 layout
  - Brand colors applied
  - Status:
  - Notes:

- [ ] **Edit draft Buyer's Order**
  - Modify and save
  - Status:
  - Notes:

- [ ] **Delete Buyer's Order**
  - Remove test document
  - Status:
  - Notes:

### Invoice

- [ ] **Create Invoice - Wizard mode**
  - Step 1: Link to Buyer's Order (optional)
  - Step 2: LLC info with DBA formatting
  - Step 3: Payment method (Wire/Cashier's Check)
  - Step 4: Amount
  - Step 5: Customer info
  - Step 6: Review
  - Status:
  - Notes:

- [ ] **Wire transfer details** (NEW Dec 19)
  - Enter account name, account number, routing number
  - Shows in PDF output
  - Status:
  - Notes:

- [ ] **Cashier's Check option**
  - Select cashier's check
  - Enter bank branch info
  - Status:
  - Notes:

- [ ] **Link to Buyer's Order**
  - Invoice references BO number
  - Description shows "Payment as per Buyer's Order Number XXX"
  - Status:
  - Notes:

- [ ] **Create Invoice - Full form**
  - Fill all fields manually
  - Status:
  - Notes:

- [ ] **Print Invoice**
  - Print preview
  - Professional layout
  - LLC address vs dealership address correct
  - Status:
  - Notes:

- [ ] **Edit draft Invoice**
  - Modify and save
  - Status:
  - Notes:

- [ ] **Delete Invoice**
  - Remove test document
  - Status:
  - Notes:

---

## Cross-Module Integration Tests

- [ ] **Lead → Email flow**
  - Open lead detail
  - Compose email to lead
  - Template and signature work
  - Send successfully
  - Status:
  - Notes:

- [ ] **Lead → Vehicle → Invoice flow**
  - Create lead
  - Link to vehicle
  - Create Buyer's Order
  - Create Invoice linked to BO
  - All data flows correctly
  - Status:
  - Notes:

- [ ] **Email → Lead → Task flow**
  - Receive email from unknown contact
  - Create lead from email
  - Follow-up task auto-created
  - Status:
  - Notes:

- [ ] **Media → Email flow**
  - Upload vehicle photos to media
  - Compose email to lead
  - Insert photos from media library
  - Send email with images
  - Status:
  - Notes:

---

## Known Issues (Do Not Test - Already Documented)

- [!] **Automatic lead assignment not working** - New leads should auto-assign round-robin to salespeople
  - Status: BUG CONFIRMED
  - Priority: HIGH

- [!] **Activity timeline missing timestamps** - Shows date but not time (should show "Dec 5, 2024 at 3:45 PM")
  - Status: BUG CONFIRMED
  - Priority: MEDIUM

---

## Testing Notes

**Date**: _____________

**Tester**: _____________

**Environment**:
- [ ] Local development (localhost:3100)
- [ ] Production

**Overall Status**:
- Total features: _____ / _____
- Working: _____ ✅
- Issues found: _____ ❌
- Not tested: _____

**Critical Issues Found**:
(List any blocking issues here)

---

## Instructions for Using This Document

1. **Test systematically** - Go section by section
2. **Mark checkboxes** - Use `[x]` for working, `[!]` for issues
3. **Add notes** - Write any problems or observations
4. **Update status** - Use "✅ Working" or "❌ Has issues: [description]"
5. **Report back** - Share findings in next Claude session
6. **Keep updated** - As new features are added, add them here

**Last Updated**: December 22, 2024
