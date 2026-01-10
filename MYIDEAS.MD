# Ideas Inbox

> **Workflow**: User adds ideas here freely. Claude decides what to implement and when based on dependencies and priorities. Remove ideas once implemented. Add notes on timing if needed.

---

## Bugs / Issues (Fix First)

- [ ] **Automatic Lead assignment not working** - New leads from forms should auto-assign via round-robin
- [ ] **Activity Timeline missing timestamps** - Shows date but not time (should show "Dec 5, 2024 at 3:45 PM")
- [x] **Email reply detection** - Emails now properly thread with In-Reply-To headers ✅ Dec 19, 2024

## Quick Wins (< 1 hour)

- [x] **Email composer size** - Make larger, long emails require endless scrolling ✅ Dec 19, 2024
- [x] **Salesman permissions** - Give access to media folders ✅ Dec 19, 2024
- [x] **Folder recursive deletion** - Allow deleting folders with contents ✅ Dec 19, 2024
- [x] **Email undo feature** - 10-second send delay with undo button like Gmail/Titan ✅ Dec 19, 2024
- [x] **Email template/signature creation** - Salespeople can create personal templates and signatures ✅ Dec 22, 2024

## Medium Features (1-3 hours)

- [x] **Invoice wire details** - Add bank account number, routing number, account name fields ✅ Dec 19, 2024
- [ ] **Email template in lead composer** - Add template dropdown when composing from lead detail page
- [ ] **Same IP flagging** - Flag leads from same IP with different contact info for investigation
- [ ] **Global search bar** - Search vehicles/media quickly during calls

## Phase 2.5 - Communications (Remaining)

- [x] **Media folder management** - Create/organize folders for 100+ car photos per vehicle ✅ Dec 19, 2024
- [ ] **Vehicle detail page redesign** - Combine Details + Sales Info into single page (no tabs)
- [ ] **Vehicle info popup widget** - Floating panel for quick access during calls (tech specs or bulletpoints)
- [ ] **Future**: Show lead count per vehicle (how many interested people)
- [ ] **Future**: Link media folders to invoice/buyer's order generation
- [ ] VoIP integration with Yate PBX (click-to-call, call logging)

## Phase 2.75 - Documents & Invoicing

- [x] **Buyer's Order builder** - Wizard mode, LLC/DBA formatting, professional print layout ✅
- [x] **Invoice builder** - Wizard mode, payment method selection, Buyer's Order linking ✅

## Phase 3 - Automation & Analytics

- [ ] **Salesman commission tracker**:
  - Current earnings at top, auto-calculates % based on weekly sales
  - 5% for 1 sale/week, 6% for 2, 7% for 3, 8% for 4+ (% of invoice total)
  - Past earnings history
  - Payment status: paid 2 weeks after client pays
  - Admin can mark as "Paid" or "Not Paid"
- [ ] **WordPress car import** - Auto-import vehicles from WordPress

## Phase 3+ - Cross-Dealership Intelligence (Complex)

- [ ] **Blacklist system** - Dealership flags contact, after admin review other dealerships see warning
- [ ] **"Never answers" list** - Contacts multiple dealerships couldn't reach (admin-only data)
- [ ] **More lead analytics** for admin portal



## Phase 3 - Contractor System & Requests (Next Priority)

### Media Module Quick Wins - COMPLETED (Dec 22, 2024)
- [x] **Image viewer with zoom** - Open images in modal, zoom/pan, next/prev navigation with keyboard shortcuts ✅ Dec 22, 2024
- [x] **Folder upload** - Upload entire folders preserving structure with recursive folder creation ✅ Dec 22, 2024
- [x] **Insert images into email** - Select from media library to insert into email composer with visual thumbnails ✅ Dec 22, 2024

### Contractor Access System
- [ ] **Contractor role** - New user type with department (IT, Marketing, Content)
- [ ] **Multi-dealership access** - Contractors can work with multiple dealerships
- [ ] **Department-based permissions**:
  - IT: Full access (settings, users, media, email, inventory)
  - Content: Media + Inventory access (upload photos, write descriptions)
  - Marketing: Leads, email templates, media access
- [ ] **Contractor management UI** - Agency admins assign contractors to dealerships

### Request/Ticket System
- [ ] **Request creation** - Dealerships create requests with department, description, files
- [ ] **Contractor inbox** - Contractors see requests assigned to their department
- [ ] **Conversation threads** - Full chat per request with messages and file attachments
- [ ] **Request status** - Open, In Progress, Resolved, Closed
- [ ] **File attachments** - Support images, PDFs, and other documents in conversations

### Future Media Features
- [ ] **Vehicle-based folders** - Auto-create folder per vehicle (VIN/stock number)
- [ ] **Auto subfolders** - Exterior, Interior, Engine, Damage, Documents per vehicle
- [ ] **Link to inventory** - Vehicle photos auto-appear in inventory listings and emails 



A new module ( complex ) that allows the user themselves to create the logic of the to do, when a lead didn't not answer an email ( 1'st interaction), they need to call, if called and no answer, the lead automatically disapears from TO DO for a day, then appears again, and so on, we've had simmilar ideas at the beggining, I bet somewhere in the readme's we have this idea, but we wanted to hard code it, but I think for a SaaS , would be great, to allow the dealership themselves to create the logic , also with the option to download the settings and upload settings 

ALSO, FOR MANAGERS and ADMIN only, either not show the To DO MODEL at all, or we need to make it like ( supervising of whoever is under, what t do's they have, but has to look nice, choose the worker, and see his to do's and maybe add some to do ( internal to do ) that has a more flexible format )

When creating new emails, if no email settings were done, it should state so