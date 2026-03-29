# PGA AgriTask — Master Implementation Plan
> PrabhuGopal Agri Product Pvt. Ltd. · Indore, M.P. · Version 1.0 · March 2026

---

# 1. PROJECT_SUMMARY

## Core Idea
PGA AgriTask is a **dual-platform field operations management system** (web dashboard + mobile app) purpose-built for Prabhu Seeds — an ISO 9001:2015 certified, multi-state Indian seed company. It replaces fragmented WhatsApp/Excel workflows with a single, role-aware platform.

## Problem Being Solved
| Pain Point | Impact | Solution |
|---|---|---|
| WhatsApp task communication | No audit trail, no accountability | Structured task lifecycle with status history |
| Excel dealer lists | No real-time visibility, version conflicts | Centralized role-scoped dealer database |
| Manual mileage claims | Disputes, delayed reimbursements | GPS auto-calculation at ₹3.5–₹4.5/km |
| No activity reporting | Managers blind until weekly calls | Real-time task progress with record-level data |
| Physical expense approvals | 7–14 day delays | Mobile submit → 1-tap manager approval |
| No dealer assignment system | Multiple staff confusing same dealer | District-scoped dealer ownership model |

## Target Users
| Role | Count | Platform | Primary Use |
|---|---|---|---|
| Owner (MD) | 1 | Web + Mobile | Full oversight, strategic visibility |
| Manager (RM/ASM/TSM) | 5–8 | Web + Mobile | District assignment, task creation, approvals |
| Field (FO/FA) | 10–15 | Mobile (primary) | Task execution, dealer visits, expense claims |
| Accounts | 1–2 | Web | Billing, collections, expense reporting |

## Key Features (from PRD + JSX analysis)
1. **Role-Based Visibility Engine** — 3-tier hierarchy (Owner > Manager > Field); recursive subordinate tree; all data scoped per role
2. **GPS Attendance & Travel Pay** — Check-in/out, waypoints every 60s, 21km daily limit, auto PPK calculation
3. **Task Management (54 activity types)** — Assigned → Running → Hold → Completed; record-level data entry with photo proof
4. **Dealer Management** — District-scoped, multi-user assignment, full purchase history
5. **Order & Billing** — Pending → Dispatched → Delivered; partial payments; real-time outstanding dues
6. **Expense & Leave Approvals** — 4 expense types; travel auto-calculated from GPS; bill photo upload; 1-tap approval
7. **Product Catalogue** — 100+ SKUs, colour-coded stock levels, season tagging
8. **Mobile App (3-tab)** — Home (GPS/dealers), Tasks (data entry), More (expenses/leave/payments)
9. **CSV Export** — Task reports filterable by status/district/user, Excel-compatible

## Assumptions (Labelled)
- **[A1]** Authentication will use OTP-based login (Indian mobile numbers) via MSG91 (DLT-registered)
- **[A2]** Supabase will serve as the unified backend (Auth + PostgreSQL + Storage + Realtime)
- **[A3]** React Native + Expo for mobile, React + Vite for web (confirmed in PRD section 7.1)
- **[A4]** Offline queue is Phase 5 — MVP requires internet connectivity
- **[A5]** Hindi language support is deferred to v2.0
- **[A6]** The 12 users and 18 dealers in the JSX prototype represent real production data for testing/migration
- **[A7]** Google Maps API will replace the prototype's SVG map; ₹0 at small scale (under $200/mo free credit)

---

# 2. SYSTEM_BREAKDOWN

## Core Modules

### Module 1: Auth & IAM (Identity & Access Management)
- OTP login via Indian mobile number
- JWT token management (Supabase Auth)
- Role assignment (OWNER / MANAGER / FIELD)
- Manager hierarchy (managerId foreign key, recursive)
- Row-Level Security policies per table

### Module 2: Visibility Engine
- `getSubordinateIds(userId)` — recursive tree traversal
- `canSeeDealer(dealer, userId, role)` — logic from JSX confirmed
- `canSeeOrder(order, userId, role, dealers)` — dealer-scoped
- `canSeeTask(task, userId, role)` — assignment + creator + subordinate
- RLS policies enforce same rules at DB layer

### Module 3: People & District Management
- User directory with role, HQ, state, manager, PPK rate
- District CRUD with state mapping
- District assignments (many-to-many: users ↔ districts)
- Manager can assign only their subordinates; Owner can assign anyone

### Module 4: Dealer Management
- Dealer CRUD (add, view, assign, unassign)
- District-scoped visibility
- Multi-user assignment per dealer
- Purchase history per dealer

### Module 5: Product Catalogue
- Read-only (from master data, admin-managed)
- 100+ SKUs, categories, crop types, seasons, MRP, stock
- Stock threshold alerts (< 250 units)

### Module 6: Order Management
- Order creation (web + mobile)
- Line items: product × qty × rate (auto-fill from catalogue)
- Status lifecycle: Pending → Dispatched → Delivered
- Partial payment tracking

### Module 7: Billing & Collections
- Outstanding dues aggregation
- Payment recording (mode + UTR reference)
- Auto-status update on full payment

### Module 8: Task Management
- 54 activity types across 4 departments
- Task creation, assignment, lifecycle transitions
- Record-level data entry (village, farmer info, GPS, photo)
- Progress tracking (records / target)
- CSV export with filters

### Module 9: GPS & Attendance
- Check-in / check-out (GPS capture)
- Waypoint logging (60s interval in background)
- Route map visualization (Google Maps / Leaflet)
- 21km daily limit with warning
- Travel pay auto-calculation (km × PPK rate)

### Module 10: Expense & Leave Management
- 4 expense types; travel auto-calculates from attendance
- Bill photo upload (Supabase Storage)
- Approval workflow (submit → pending → approved/rejected)
- Leave application + approval
- Manager pending queue with badge count

### Module 11: Dashboard
- Role-scoped KPI cards (6 tiles)
- Recent orders feed
- Active tasks list
- Live staff presence (checked-in users)
- Outstanding dues alert

### Module 12: Mobile App (React Native)
- 3-tab navigation (Home / Tasks / More)
- Bottom-sheet modals for dealer/order add
- Offline queue (Phase 5)
- Camera integration (task photo proof, bill upload)
- Push notifications (Phase 5)

## Frontend / Backend / Database / Integrations

### Frontend (Web)
- React 18 + Vite
- Tailwind CSS + shadcn/ui (or custom CSS as in prototype)
- React Router for SPA navigation
- Supabase JS client (realtime subscriptions)

### Frontend (Mobile)
- React Native 0.73+ + Expo SDK 50
- Expo Location (GPS)
- Expo Camera (photo proof)
- Expo Notifications (push)
- React Navigation (tab + stack)

### Backend (Supabase)
- PostgreSQL 15 (managed)
- Row-Level Security per table/role
- Edge Functions (serverless) for complex visibility queries
- Realtime subscriptions (attendance live updates)
- Storage Buckets (bill photos, task photos)

### Integrations
- **MSG91** — OTP SMS (DLT-registered sender)
- **Google Maps API** — GPS map rendering
- **Expo EAS Build** — Cloud Android/iOS builds
- **Vercel** — Web hosting + CI/CD from GitHub

## MVP vs Advanced Features

### MVP (Phase 1–2, Weeks 1–4)
- Login (OTP) + Role-based routing
- Dashboard with KPI cards
- Dealer management (add, view, assign)
- Product catalogue (read-only)
- Order creation + status transitions
- Billing & payment recording
- Basic task management (create, assign, lifecycle)
- Expense submission + approval

### Core Features (Phase 3, Weeks 5–7)
- Mobile app (3-tab, React Native + Expo)
- GPS check-in/check-out + waypoint tracking
- Travel pay auto-calculation
- Task data entry form (village, farmer, photo)
- Leave management
- GPS route map (Google Maps)

### Advanced Features (Phase 4–5, Month 3+)
- Push notifications (task assignments, approvals)
- WhatsApp Business alerts
- Offline sync with conflict resolution
- Hindi UI
- Analytics dashboard (state heat maps, seasonal trends)
- Farmer CRM
- Scheme management

---

# 3. IMPLEMENTATION_PLAN.md

## 🧱 Project Architecture

### Tech Stack (Justified)

| Layer | Technology | Justification |
|---|---|---|
| Web Frontend | React 18 + Vite | Component reuse with mobile, fast HMR, Vercel-native |
| Mobile | React Native 0.73 + Expo SDK 50 | Code sharing with web logic, native GPS/camera, EAS cloud builds |
| Backend/DB | Supabase (PostgreSQL 15) | Auth + DB + Storage + Realtime in one platform; free tier covers MVP; RLS enforces all visibility rules natively |
| Web Hosting | Vercel | Auto-deploy from GitHub, global CDN, free custom domain |
| GPS Maps | Google Maps API + react-native-maps | Satellite accuracy, ₹0 at small scale |
| File Storage | Supabase Storage | Bill photos + task proof; 1 GB free |
| Mobile Build | Expo EAS Build | Cloud builds — no Mac needed for Android APK |
| SMS OTP | MSG91 (DLT) | TRAI-compliant for Indian numbers; DLT-registered sender |
| State Management | Zustand | Lightweight, no boilerplate vs Redux |
| Forms | React Hook Form + Zod | Type-safe form validation |
| API Layer | Supabase JS SDK | Type-safe queries, auto-generated types from schema |

### High-Level System Design

```
┌──────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│  ┌─────────────────┐        ┌──────────────────────┐    │
│  │  Web Dashboard   │        │    Mobile App (RN)    │    │
│  │  React + Vite    │        │   Expo + RN 0.73     │    │
│  │  Vercel CDN      │        │   EAS Build APK/IPA  │    │
│  └────────┬────────┘        └──────────┬───────────┘    │
└───────────┼──────────────────────────────┼──────────────┘
            │  HTTPS / WSS (Realtime)       │
┌───────────┼──────────────────────────────┼──────────────┐
│           ▼        SUPABASE              ▼              │
│  ┌────────────────────────────────────────────────┐     │
│  │         Auth (JWT + OTP via MSG91)              │     │
│  ├────────────────────────────────────────────────┤     │
│  │         PostgreSQL + RLS Policies               │     │
│  ├────────────────────────────────────────────────┤     │
│  │         Storage (bill_photos, task_photos)      │     │
│  ├────────────────────────────────────────────────┤     │
│  │         Realtime (attendance, tasks)            │     │
│  ├────────────────────────────────────────────────┤     │
│  │         Edge Functions (complex queries)        │     │
│  └────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
            │
┌───────────▼──────────────────────────────────────────────┐
│              EXTERNAL INTEGRATIONS                        │
│   MSG91 (OTP SMS)  ·  Google Maps API  ·  Expo EAS       │
└──────────────────────────────────────────────────────────┘
```

### Data Flow (Key Scenarios)

**Field staff submits travel expense:**
1. Mobile App reads GPS attendance (km from today's record)
2. Auto-fills km × PPK rate → amount
3. POST to `expenses` table (status: pending, bill_url: null for travel)
4. Supabase Realtime triggers manager's pending count badge
5. Manager taps ✓ → UPDATE expenses SET status='approved', approved_by=uid
6. Field staff sees status change in My Claims list

**Role-based data fetch:**
1. User logs in → JWT contains user_id
2. All Supabase queries include auth.uid() automatically
3. RLS policies evaluate role + manager chain → filter rows
4. Client receives only visible data — no client-side filtering needed

---

## 🗂 Folder Structure

```
pga-agritask/
├── apps/
│   ├── web/                        # React + Vite web dashboard
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/             # Shared: Button, Badge, Modal, Table, Avatar
│   │   │   │   ├── layout/         # Sidebar, Topbar, PageWrapper
│   │   │   │   ├── maps/           # GPSMap, RouteTimeline
│   │   │   │   └── charts/         # StatCard, ProgressBar
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── People.tsx
│   │   │   │   ├── Dealers.tsx
│   │   │   │   ├── Products.tsx
│   │   │   │   ├── Orders.tsx
│   │   │   │   ├── Billing.tsx
│   │   │   │   ├── Tasks.tsx
│   │   │   │   ├── Attendance.tsx
│   │   │   │   └── Expenses.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useVisibility.ts  # canSeeDealer, canSeeOrder, etc.
│   │   │   │   ├── useDealers.ts
│   │   │   │   ├── useOrders.ts
│   │   │   │   ├── useTasks.ts
│   │   │   │   └── useExpenses.ts
│   │   │   ├── stores/
│   │   │   │   └── authStore.ts     # Zustand: currentUser, role, subIds
│   │   │   ├── lib/
│   │   │   │   ├── supabase.ts      # Supabase client + typed tables
│   │   │   │   ├── visibility.ts    # getSubordinateIds, canSee* functions
│   │   │   │   ├── currency.ts      # fINR formatter
│   │   │   │   └── csvExport.ts
│   │   │   ├── types/
│   │   │   │   └── database.types.ts  # Auto-generated from Supabase
│   │   │   └── App.tsx
│   │   ├── index.html
│   │   └── vite.config.ts
│   │
│   └── mobile/                     # React Native + Expo
│       ├── src/
│       │   ├── screens/
│       │   │   ├── auth/
│       │   │   │   ├── LoginScreen.tsx
│       │   │   │   └── OTPScreen.tsx
│       │   │   ├── home/
│       │   │   │   ├── HomeScreen.tsx
│       │   │   │   ├── AddDealerSheet.tsx
│       │   │   │   └── NewOrderSheet.tsx
│       │   │   ├── tasks/
│       │   │   │   ├── TaskListScreen.tsx
│       │   │   │   ├── TaskDetailScreen.tsx
│       │   │   │   └── DataEntryScreen.tsx
│       │   │   └── more/
│       │   │       ├── MoreScreen.tsx
│       │   │       ├── ExpenseForm.tsx
│       │   │       ├── LeaveForm.tsx
│       │   │       └── PaymentsTab.tsx
│       │   ├── navigation/
│       │   │   ├── TabNavigator.tsx
│       │   │   └── RootNavigator.tsx
│       │   ├── hooks/              # Shared hooks (symlinked or copied)
│       │   ├── components/         # Mobile-specific: MCard, MButton, etc.
│       │   ├── services/
│       │   │   ├── gps.ts          # Expo Location wrapper
│       │   │   └── camera.ts       # Expo Camera wrapper
│       │   └── lib/               # Shared with web (supabase, visibility)
│       ├── app.json
│       └── eas.json
│
├── packages/
│   └── shared/                     # Shared logic (visibility engine, types, formatters)
│       ├── src/
│       │   ├── visibility.ts
│       │   ├── types.ts
│       │   └── formatters.ts
│       └── package.json
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_seed_data.sql       # 12 users, 15 districts, 15 products
│   │   └── 004_indexes.sql
│   ├── functions/
│   │   ├── get-subordinates/       # Edge Function: recursive subordinate tree
│   │   └── export-tasks/           # Edge Function: task CSV generation
│   └── config.toml
│
├── docs/
│   ├── IMPLEMENTATION_PLAN.md      # This document
│   ├── CLIENT_REQUIREMENTS.md
│   └── API_REFERENCE.md
│
├── .github/
│   └── workflows/
│       ├── web-deploy.yml          # Vercel auto-deploy on main push
│       └── test.yml                # Jest + Vitest on PR
│
├── package.json                    # Turborepo workspace root
├── turbo.json
└── README.md
```

---

## ⚙️ Feature-wise Implementation

### Feature 1: Authentication (OTP Login)

**Description:** Indian mobile number → MSG91 OTP → Supabase Auth JWT

**Inputs:** Mobile number (10-digit Indian)
**Outputs:** JWT access token, user profile with role

**API Endpoints:**
```
POST /auth/otp/send    → MSG91 sends OTP
POST /auth/otp/verify  → Supabase verifyOtp() → JWT
GET  /auth/me          → Returns user + role from users table
```

**Database Schema:**
```sql
-- Supabase Auth handles auth.users
-- Custom profile table:
CREATE TABLE users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id),
  name         TEXT NOT NULL,
  role         TEXT CHECK (role IN ('OWNER','MANAGER','FIELD')) NOT NULL,
  manager_id   UUID REFERENCES users(id),
  state        TEXT,
  hq           TEXT,
  mobile       TEXT UNIQUE NOT NULL,
  ppk_rate     NUMERIC(4,1),  -- pay per km: 3.5, 4.0, 4.5
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

**Edge Cases:**
- OTP expired (2-min window) → resend prompt
- Unregistered number → "Contact your manager to get access"
- Multiple devices → latest JWT supersedes previous

**Dependencies:** MSG91 API key, DLT-registered sender ID

---

### Feature 2: Visibility Engine

**Description:** Determines what data each user can read. Core of the entire platform.

**Inputs:** userId, role, managerId chain
**Outputs:** Array of visible user IDs (subIds), boolean `canSee*` functions

**Logic (from JSX prototype — confirmed):**
```typescript
// Recursive subordinate traversal
function getSubordinateIds(userId: string, users: User[]): string[] {
  const direct = users.filter(u => u.managerId === userId).map(u => u.id);
  const indirect = direct.flatMap(id => getSubordinateIds(id, users));
  return [...direct, ...indirect];
}

// Dealer visibility
canSeeDealer = role==='OWNER' || addedBy===userId || assignedTo.includes(userId)
             || subIds.some(sid => assignedTo.includes(sid) || addedBy===sid)

// Task visibility
canSeeTask = role==='OWNER' || assignedTo===userId || createdBy===userId
           || subIds.includes(assignedTo) || subIds.includes(createdBy)
```

**Database RLS Policies:**
```sql
-- Example: tasks table
CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'OWNER'
    UNION
    SELECT assigned_to FROM tasks WHERE created_by = auth.uid()
    UNION
    SELECT user_id FROM get_subordinates(auth.uid())
  )
);
```

**Edge Cases:**
- User promoted from FIELD to MANAGER → role change must invalidate cached subIds
- User deleted → reassign their dealers/tasks before deletion
- Circular manager chain (prevented by DB constraint: manager_id ≠ id)

---

### Feature 3: Dealer Management

**Description:** Create, view, and assign agricultural dealers by district.

**Inputs:** Dealer name, district, contact person, mobile
**Outputs:** Dealer record visible to adding user + management chain

**API Endpoints (Supabase auto-generated):**
```
GET    /rest/v1/dealers              → list (RLS-filtered)
POST   /rest/v1/dealers              → create
POST   /rest/v1/dealer_assignments   → assign user to dealer
DELETE /rest/v1/dealer_assignments   → unassign
GET    /rest/v1/dealers?id=X&select=*,orders(*) → dealer detail with orders
```

**Database Schema:**
```sql
CREATE TABLE dealers (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  district_id  TEXT REFERENCES districts(id),
  contact      TEXT,
  mobile       TEXT,
  added_by     UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dealer_assignments (
  id           SERIAL PRIMARY KEY,
  dealer_id    INTEGER REFERENCES dealers(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(dealer_id, user_id)
);
```

**Edge Cases:**
- Duplicate dealer in same district → warn but allow (different contact person)
- Dealer with pending orders → prevent deletion, show error
- District unassigned from user → dealer still visible if they added it or are directly assigned

---

### Feature 4: Order Management

**Description:** Create multi-product seed orders for dealers; track fulfilment and payment.

**Inputs:** Dealer, product list (product × qty), optional rate override
**Outputs:** Order record; outstanding dues updated in real-time

**API Endpoints:**
```
GET    /rest/v1/orders?select=*,order_items(*),dealers(*) → list
POST   /rest/v1/orders                                    → create order
POST   /rest/v1/order_items                               → add items
PATCH  /rest/v1/orders?id=X  body:{status:'dispatched'}   → status update
PATCH  /rest/v1/orders?id=X  body:{paid: <amount>}         → record payment
```

**Database Schema:**
```sql
CREATE TABLE orders (
  id           TEXT PRIMARY KEY,  -- ORD-001 format
  dealer_id    INTEGER REFERENCES dealers(id),
  created_by   UUID REFERENCES users(id),
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  status       TEXT CHECK (status IN ('pending','dispatched','delivered')) DEFAULT 'pending',
  paid         NUMERIC(10,2) DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id           SERIAL PRIMARY KEY,
  order_id     TEXT REFERENCES orders(id) ON DELETE CASCADE,
  product_id   TEXT REFERENCES products(id),
  qty          INTEGER NOT NULL CHECK (qty > 0),
  rate         NUMERIC(8,2) NOT NULL
);
```

**Edge Cases:**
- Payment > order total → cap at total, show warning
- Product out of stock → warn (show stock count), allow override
- Order status regression (delivered → dispatched) → prevent, show error

---

### Feature 5: Task Management (54 Activity Types)

**Description:** Assign field tasks with target, track progress via submitted records.

**Inputs:** Title, assignee, district, department, crop, product, target, unit, deadline
**Outputs:** Task with progress tracking; record-level data for proof

**API Endpoints:**
```
GET    /rest/v1/tasks?select=*,task_records(count)  → list with record count
POST   /rest/v1/tasks                               → create task
PATCH  /rest/v1/tasks?id=X  body:{status:'running'} → lifecycle update
POST   /rest/v1/task_records                        → submit data record
GET    /functions/v1/export-tasks                   → CSV download (Edge Function)
```

**Database Schema:**
```sql
CREATE TABLE tasks (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  created_by   UUID REFERENCES users(id),
  assigned_to  UUID REFERENCES users(id),
  district_id  TEXT REFERENCES districts(id),
  dept         TEXT CHECK (dept IN ('Marketing','Production','R&D','Processing')),
  activity_type TEXT,  -- one of 54 pre-defined types
  crop         TEXT,
  product      TEXT,
  target       INTEGER DEFAULT 1,
  unit         TEXT CHECK (unit IN ('NOS','DAYS','KG')) DEFAULT 'NOS',
  status       TEXT CHECK (status IN ('assigned','running','hold','completed')) DEFAULT 'assigned',
  deadline     DATE,
  started_at   DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_records (
  id           SERIAL PRIMARY KEY,
  task_id      INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES users(id),
  village      TEXT,
  tehsil       TEXT,
  district     TEXT,
  farmer_name  TEXT,
  farmer_contact TEXT,
  land_acres   NUMERIC(6,2),
  photo_url    TEXT,  -- Supabase Storage path
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
```

**54 Activity Types (4 Departments):**
- Marketing Pre-season (8): Farmer Meeting, Individual Contact, Postering, Jeep Campaign, Mega Farmer Meeting, New Product Demo, Dealer Visit, Dealer Meeting
- Marketing Post-season (10+): Crop Show, Plot Visit, Testimonial Collection, Retailer Sale Data, Shop/Wall Painting, etc.
- Marketing Always (2): Field Staff Meeting, Complaint Handling
- Production (5): Foundation Seed Distribution, Field Inspection, Roughing, Harvesting, Transport/Storage
- R&D (5): Nursery Bed Prep, Sowing, Transplanting, Yield Data, GOT
- Processing (3): Licencing Validity, Seed Processing Intake, Seed Processing Register

**Edge Cases:**
- Task assigned to user outside manager's team → prevented by UI + DB trigger
- Records > target → allow, show "Over Target" badge
- Completed task: records still viewable but no new records allowed
- Hold with multiple concurrent tasks → separate hold/resume per task

---

### Feature 6: GPS Attendance & Travel Pay

**Description:** Daily check-in/out with GPS; automatic travel pay calculation.

**Inputs:** GPS coordinates (lat/lng) from device
**Outputs:** Attendance record, waypoints, total km, travel pay amount

**Mobile GPS Logic:**
```typescript
// Check-in: capture GPS, create attendance record
const { coords } = await Location.getCurrentPositionAsync({});
await supabase.from('attendance').insert({
  user_id: uid, date: today(), check_in: timestamp,
  status: 'active'
});
await supabase.from('gps_waypoints').insert({
  attendance_id, lat: coords.latitude, lng: coords.longitude,
  timestamp, type: 'checkin', stop_label: 'Check In'
});

// Background task every 60s:
await Location.startLocationUpdatesAsync('GPS_TASK', {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 60000,
  foregroundService: { notificationTitle: 'PGA AgriTask', notificationBody: 'Tracking...' }
});
```

**Database Schema:**
```sql
CREATE TABLE attendance (
  id           SERIAL PRIMARY KEY,
  user_id      UUID REFERENCES users(id),
  date         DATE NOT NULL,
  check_in     TIMESTAMPTZ,
  check_out    TIMESTAMPTZ,
  km           NUMERIC(6,1) DEFAULT 0,
  status       TEXT CHECK (status IN ('active','done')) DEFAULT 'active',
  UNIQUE(user_id, date)
);

CREATE TABLE gps_waypoints (
  id           SERIAL PRIMARY KEY,
  attendance_id INTEGER REFERENCES attendance(id) ON DELETE CASCADE,
  lat          NUMERIC(10,7) NOT NULL,
  lng          NUMERIC(10,7) NOT NULL,
  timestamp    TIMESTAMPTZ NOT NULL,
  stop_label   TEXT,
  type         TEXT CHECK (type IN ('checkin','checkout','stop','break'))
);
```

**Travel Pay Calculation:**
```sql
-- Computed column on attendance
km * (SELECT ppk_rate FROM users WHERE id = attendance.user_id) AS travel_pay
```

**Edge Cases:**
- GPS unavailable (poor signal) → use last known location, flag as estimated
- Over 21km daily limit → show red progress bar + manager alert
- Forgot to check out → next-day check-in prompts "Did you check out yesterday?"
- Multiple check-ins same day → prevent (UNIQUE constraint), show "Already checked in"

---

### Feature 7: Expense Management

**Description:** Submit and approve 4 types of field expenses; travel auto-calculated.

**Database Schema:**
```sql
CREATE TABLE expenses (
  id           SERIAL PRIMARY KEY,
  user_id      UUID REFERENCES users(id),
  date         DATE NOT NULL,
  type         TEXT CHECK (type IN ('travel','hotel','food','other')),
  description  TEXT,
  amount       NUMERIC(8,2) NOT NULL,
  km           NUMERIC(6,1),      -- for travel type only
  rate         NUMERIC(4,2),      -- ppk rate snapshot
  status       TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  approved_by  UUID REFERENCES users(id),
  bill_url     TEXT,              -- Supabase Storage path
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

**Edge Cases:**
- Travel claim submitted without attending → cross-check with attendance record
- Bill photo > 10MB → compress before upload, show error if still too large
- Duplicate submission same day/type → warn but allow (legitimate scenario: multiple hotel nights)
- Manager rejecting own expense → only superiors can approve

---

## 🔄 Development Phases

### Phase 1: MVP Web App (Weeks 1–2)
**Goal:** Deployable web app with real database

Tasks:
1. Supabase project setup + initial schema (001_initial_schema.sql)
2. RLS policies (002_rls_policies.sql)
3. Seed data migration (12 users, 15 districts, 18 dealers, 15 products)
4. React + Vite project scaffold with Supabase client
5. Auth: OTP login flow (MSG91 + Supabase)
6. Dashboard page (6 KPI cards, scoped by role)
7. Dealers page (list, add, assign)
8. Orders page (create, status transitions)
9. Billing page (outstanding dues, payment recording)
10. Deploy to Vercel with preview URLs per branch

**Deliverable:** Working web app at `agritask.prabhuseeds.com`

---

### Phase 2: Core Features Web (Weeks 3–4)
**Goal:** Full feature set on web dashboard

Tasks:
1. People & District Management page
2. Product Catalogue page (read-only, search/filter)
3. Task Management page (full CRUD, lifecycle, progress)
4. Task CSV export (Edge Function)
5. Expense & Leave management (submit + approve)
6. GPS Attendance page (table view, mock GPS data)
7. Realtime subscriptions (badge counts, live staff)
8. Role switcher (demo mode, matching JSX prototype)

**Deliverable:** Complete web dashboard, all 10 pages functional

---

### Phase 3: Mobile App (Weeks 5–7)
**Goal:** React Native Expo app with real GPS

Tasks:
1. Expo project setup + navigation scaffold
2. Auth screens (OTP login, same backend)
3. Home tab: Check-in/out, GPS tracking, dealers, products
4. Tasks tab: list, detail, data entry form, camera
5. More tab: expense form, leave form, payments
6. Google Maps integration (route visualization)
7. Background GPS task (60s interval)
8. Bill photo upload (Expo Camera → Supabase Storage)
9. EAS Build configuration (Android APK)
10. Internal testing with field staff (5 users)

**Deliverable:** Android APK for field testing

---

### Phase 4: Go Live (Week 8)
**Goal:** Production-ready deployment

Tasks:
1. Data migration (real dealer/user data from Excel)
2. User acceptance testing (manager + field staff)
3. Performance testing (< 2s dashboard load)
4. Security audit (RLS policies, JWT expiry)
5. Google Play Store submission (Android)
6. User onboarding guide + video walkthrough
7. Production Supabase plan upgrade (if needed)
8. Custom domain SSL (agritask.prabhuseeds.com)

**Deliverable:** Live production app

---

### Phase 5: Advanced (Month 3+)
- iOS App Store submission (requires Apple Developer ₹8,300)
- Offline sync (Expo SQLite + background sync queue)
- Push notifications (Expo Notifications)
- WhatsApp Business task alerts
- Hindi UI (i18n with react-i18next)
- Analytics dashboard (Recharts + Supabase aggregates)
- Farmer CRM module

---

## 🧪 Testing Strategy

### Unit Tests (Vitest + Jest)
```
packages/shared/src/__tests__/
  ├── visibility.test.ts         # getSubordinateIds, canSeeDealer, canSeeTask
  ├── formatters.test.ts         # fINR, today(), ini()
  └── csvExport.test.ts          # Row generation for all filter combinations
```

**Key Test Cases:**
- Owner sees all 18 dealers → `canSeeDealer` returns true for all
- Manager (id:2, CG region) sees only CG dealers
- Field (id:6, Mahasamund) sees only assigned dealers
- Travel pay: 24.8km × ₹3.5 = ₹86.80

### Integration Tests (Supabase local + Playwright)
```
e2e/
  ├── auth.spec.ts               # OTP login flow
  ├── dealer-crud.spec.ts        # Add, assign, view dealer
  ├── order-lifecycle.spec.ts    # Create → dispatch → deliver → pay
  ├── task-progress.spec.ts      # Create → run → submit record → complete
  └── expense-approval.spec.ts   # Submit → manager approve → status update
```

### RLS Policy Tests
```sql
-- Run as field user (id:6), attempt to read manager's data
SET LOCAL role TO 'authenticated';
SET LOCAL request.jwt.claims TO '{"sub": "<field-user-uuid>"}';
SELECT count(*) FROM dealers; -- Should return only assigned dealers
```

### Edge Case Validation
- [ ] User with no district assignments sees 0 dealers
- [ ] Order total = ₹0 (prevented by qty/rate validation)
- [ ] Task records > target (allowed, no crash)
- [ ] GPS coordinates outside India (warn, allow)
- [ ] Expense amount = 0 (prevented by form validation)
- [ ] Simultaneous payment recording (optimistic lock via Supabase)

---

## 🚀 Deployment Plan

### Environments

| Environment | Web URL | Database | Purpose |
|---|---|---|---|
| Development | localhost:5173 | Supabase local (Docker) | Active development |
| Staging | staging.agritask.prabhuseeds.com | Supabase staging project | QA + UAT |
| Production | agritask.prabhuseeds.com | Supabase production project | Live traffic |

### CI/CD Pipeline (GitHub Actions)
```yaml
# .github/workflows/web-deploy.yml
on:
  push:
    branches: [main]        # → Production Vercel deploy
  pull_request:             # → Preview Vercel URL per PR

jobs:
  test:
    - npm run type-check     # TypeScript
    - npm run lint           # ESLint
    - npm run test           # Vitest unit tests
  deploy:
    - vercel deploy --prod   # Auto-deploy to Vercel
```

### Mobile Release Process
```bash
# Android build
eas build --platform android --profile production
# Outputs: .apk for direct install OR .aab for Play Store

# iOS build (Phase 5)
eas build --platform ios --profile production
eas submit --platform ios  # Submit to App Store
```

### Database Migration Strategy
```bash
# Local development
supabase db push          # Apply migrations to local
supabase db diff          # Generate new migration from schema changes

# Production
supabase db push --linked  # Apply to linked production project
```

---

# 4. CLIENT_REQUIREMENTS.md

## 🧾 Product Requirements

### Final Feature List (Confirm with Client)
- [ ] **Auth**: OTP login only (no email/password)? Confirm if admin panel needed for user management.
- [ ] **54 Activity Types**: Full list in PRD section 5.7. Confirm if any need to be added/removed before build.
- [ ] **PPK Rates**: Confirmed rates from JSX: ₹3.5 (Field), ₹4.0–₹4.5 (Manager). Any exceptions per user?
- [ ] **21km Daily Limit**: Confirm if this is a hard block or just a warning/flag.
- [ ] **Order ID Format**: Currently `ORD-001`. Confirm preferred format (e.g., `PGA/2026/001`).
- [ ] **Product Catalogue**: Confirm if the 15 products in JSX are representative; full 100+ SKU list needed.
- [ ] **District List**: Confirm if 15 districts in JSX are all districts, or if more need to be added.
- [ ] **User List**: Provide complete employee list with roles, mobile numbers, HQ, manager mapping, PPK rates.

### User Flows (Need Sign-Off)
- [ ] OTP login → role-based routing (Owner → Dashboard, Field → Mobile)
- [ ] Field staff check-in → GPS auto-tracking → check-out → expense auto-fill
- [ ] Manager creates task → assigns to field → field submits records → manager reviews
- [ ] Field adds dealer → manager assigns additional field staff to dealer
- [ ] Order created on mobile → manager dispatches on web → payment recorded → billing cleared

### Acceptance Criteria
- [ ] Owner logs in → sees all 12 users, all 18 dealers, all orders (no filtering)
- [ ] Manager (Gajendra, CG) → sees only CG districts/dealers/tasks
- [ ] Field (Pramesh, Mahasamund) → sees only his assigned dealers and tasks
- [ ] Travel expense for 24.8km @ ₹3.5 = ₹86.80 (auto-calculated, no manual entry)
- [ ] Task report CSV contains all columns specified in PRD 5.7
- [ ] Dashboard loads in < 2 seconds on 4G network

---

## 🎨 Design

### UI/UX Designs
- **Status**: The JSX prototype (AgriTask_0.jsx) provides complete UI reference. Dark theme with Sora font.
- **[NEEDED FROM CLIENT]**: Confirm if dark theme is final or if a light theme option is required for web.
- **[NEEDED FROM CLIENT]**: Company logo (SVG/PNG) for sidebar and mobile splash screen.
- **[NEEDED FROM CLIENT]**: Brand colors confirmation (current: `#4a9eed` blue, `#34d399` green accent).

### Branding Assets Required
- [ ] Company logo (SVG preferred, minimum 512×512 PNG)
- [ ] App icon (1024×1024 PNG for mobile stores)
- [ ] Splash screen image (mobile)
- [ ] Favicon (32×32 and 192×192)
- [ ] Any letterhead template for PDF reports (if needed)

### Design System
- Current prototype uses: Sora (headings/body) + JetBrains Mono (numbers/code)
- Color palette: documented in CSS variables in JSX prototype
- Component library: custom CSS (can migrate to Tailwind + shadcn/ui for faster development)
- **[DECISION NEEDED]**: Custom CSS vs Tailwind — custom CSS matches prototype exactly; Tailwind is faster to iterate.

---

## 🔐 Access & Credentials Required

| Service | What's Needed | Priority |
|---|---|---|
| Supabase | Project URL + anon key + service role key | Critical (Week 1) |
| MSG91 | API key + DLT-registered sender ID + OTP template ID | Critical (Week 1) |
| Google Maps | Maps JavaScript API key + Maps SDK for Android key | Phase 3 (Week 5) |
| Vercel | Team account or personal account with custom domain access | Week 1 |
| Google Play Console | Developer account ($25 one-time) | Phase 4 (Week 8) |
| Apple Developer | Account ($99/year, ~₹8,300) | Phase 5 (Month 3) |
| GitHub | Repository access (create or invite to org) | Day 1 |
| Domain Registrar | Access to add DNS records for `agritask.prabhuseeds.com` | Week 2 |
| Company Email | No-reply email for system notifications (optional) | Phase 4 |

---

## 📊 Data

### Seed Data (Required Before Launch)
- [ ] **Complete user list** (name, mobile, role, manager, state, HQ, PPK rate) — current JSX has 12 users
- [ ] **All districts** with state mapping — current JSX has 15 districts across 5 states
- [ ] **Complete product catalogue** — 100+ SKUs with code, category, crop, season, MRP, stock
- [ ] **Existing dealer list** from Excel — name, district, contact, mobile
- [ ] **Historical orders** (optional, for opening balances / outstanding dues)

### Schema Expectations
- All mobile numbers: 10-digit Indian format (no +91 prefix in DB)
- Prices in INR (no decimal for seed prices per kg/packet)
- Dates: ISO 8601 (YYYY-MM-DD)
- GPS coordinates: decimal degrees (7 decimal places)

### Sample Datasets (for Testing)
- The 12 users, 18 dealers, 7 orders, 6 tasks in `AgriTask_0.jsx` will serve as test fixtures
- Need 3–5 real GPS tracks for testing route map visualization

---

## ⚖️ Legal / Compliance

### Privacy Policy
- **[ACTION REQUIRED]**: Draft privacy policy covering farmer personal data (name, contact, land area)
- DPDP Bill 2023 compliance: consent mechanism for farmer data collection in task records
- Data retention: GPS waypoints 90 days, financial records 7 years, expense bills 3 years

### Terms of Use
- **[ACTION REQUIRED]**: Internal app — Terms of Service for field staff (acceptable use policy)
- Confirm data ownership: all data belongs to PrabhuGopal Agri Product Pvt. Ltd.

### Data Regulations
- **DPDP Bill 2023**: Farmer contact data in task records requires consent
- **TRAI DLT**: MSG91 sender ID must be DLT-registered before OTP can be sent
- **IT Act 2000**: HTTPS mandatory (Vercel provides SSL automatically)
- **GST**: If generating invoices/billing statements, GST registration number needed

---

# 5. CLAUDE_CODE_STRATEGY

## How to Build Step-by-Step Using Claude Code

### Prerequisites
```bash
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Open project
cd pga-agritask
claude
```

### Module 1: Database Setup (Day 1)

**Prompt for Claude Code:**
```
Create a complete Supabase migration file at supabase/migrations/001_initial_schema.sql 
that includes all tables from the PGA AgriTask schema:
- users (id UUID, name, role ENUM, manager_id, state, hq, mobile, ppk_rate)
- districts, district_assignments
- dealers, dealer_assignments
- products (id TEXT like P001, name, code, category, crop, season, price, stock)
- orders (TEXT id like ORD-001), order_items
- tasks, task_records
- attendance, gps_waypoints
- expenses (type ENUM: travel/hotel/food/other), leaves

Include: foreign keys, check constraints, indexes on (user_id, district_id, date), 
and created_at TIMESTAMPTZ on all tables.
```

**Validation:**
```bash
supabase db reset  # Apply migration to local
supabase db lint   # Check for issues
```

---

### Module 2: RLS Policies (Day 1)

**Prompt:**
```
Create supabase/migrations/002_rls_policies.sql with Row-Level Security policies for PGA AgriTask.

Rules:
- OWNER role: SELECT all on all tables
- MANAGER role: SELECT own rows + rows of all subordinates (recursive via manager_id)
  Use a helper function get_subordinates(user_id UUID) RETURNS TABLE(id UUID)
- FIELD role: SELECT only rows where user_id = auth.uid() OR assigned_to = auth.uid()

Apply policies to: dealers (via dealer_assignments), orders (via dealer visibility), 
tasks (assigned_to OR created_by OR subordinate), expenses/leaves (user_id OR subordinate),
attendance/gps_waypoints (user_id OR subordinate)
```

**Validation:**
```bash
# Test as each role using Supabase SQL editor with SET LOCAL jwt claims
```

---

### Module 3: Supabase Client + Types (Day 2)

**Prompt:**
```
Generate TypeScript types from the Supabase schema and create apps/web/src/lib/supabase.ts.
Include:
- Typed Supabase client using the generated Database type
- Helper function formatINR(n: number): string  (₹ + Indian number formatting)
- Helper function getSubordinateIds(userId: string, users: User[]): string[]
  (recursive traversal matching the JSX prototype logic)
- canSeeDealer, canSeeOrder, canSeeTask functions
All exported from a shared package at packages/shared/src/visibility.ts
```

---

### Module 4: Auth Flow (Day 2)

**Prompt:**
```
Build the OTP authentication flow for PGA AgriTask web app (React + Vite):
1. Login page: phone number input (Indian 10-digit), "Send OTP" button
2. OTP page: 6-digit input, 2-minute countdown, "Resend" link
3. On verify: call Supabase verifyOtp(), fetch user profile from users table
4. Store in Zustand: { currentUser, role, subIds }
5. Route guard: OWNER/MANAGER → /dashboard, FIELD → /mobile-preview
6. Use MSG91 for actual OTP (in production); use Supabase email OTP for development

File: apps/web/src/pages/auth/LoginPage.tsx, OTPPage.tsx
Store: apps/web/src/stores/authStore.ts
```

---

### Module 5: Dashboard (Day 3)

**Prompt:**
```
Build the Dashboard page for PGA AgriTask (apps/web/src/pages/Dashboard.tsx).

Based on this exact component from AgriTask_0.jsx [paste Dashboard component].

Replace mock data with real Supabase queries:
- myDealers: count from dealers + dealer_assignments filtered by role
- totalOrderValue: SUM of (qty * rate) from order_items joined to orders
- totalDue: SUM of (total - paid) for scoped orders
- activeTasks: COUNT of tasks WHERE status='running'
- pendingExpenses: COUNT of expenses WHERE status='pending' AND subordinate
- teamSize: COUNT of subordinate user IDs

Use React Query (@tanstack/react-query) for caching. Show skeleton loaders while loading.
Maintain the exact dark theme CSS from the prototype.
```

---

### Module Order of Development

```
Week 1:  DB schema → RLS → Auth → Dashboard → Dealers → Orders → Billing → Deploy
Week 2:  People → Products → Tasks → Expenses → Leaves → Attendance (mock GPS)
Week 3:  Expo scaffold → Home tab → Tasks tab → More tab
Week 4:  Real GPS → Camera → Supabase Storage → Google Maps
Week 5:  Data migration → UAT → Bug fixes → Go live
```

### How to Validate Outputs
1. **After each page**: Switch between 5 demo users (Owner, 2 Managers, 2 Field) — verify data scoping
2. **After RLS**: Run SQL queries with mocked JWT claims — verify row counts match expected visibility
3. **After mobile**: Manually test check-in/out with real GPS device
4. **After full build**: Run Playwright E2E tests for the 5 critical user flows

### How to Iterate Safely
- All migrations are version-controlled; never edit existing migration files
- Use feature branches; Vercel creates preview URL per branch
- Test on staging with production-like data before merging to main
- Supabase Dashboard → Auth → Users: manually verify test user roles after seed

---

# 6. RISKS_AND_GAPS

## Missing Information (Must Resolve Before Build)

| # | Gap | Impact | Resolution |
|---|---|---|---|
| G1 | Complete product catalogue (100+ SKUs) | Product page incomplete | Client to provide Excel export |
| G2 | Complete district list (PRD mentions 5 states but only 15 districts in JSX) | District assignment broken | Confirm final district list per state |
| G3 | MSG91 DLT sender ID (3–7 day TRAI registration) | Auth blocked in production | Start registration immediately |
| G4 | Company logo + branding assets | App looks unprofessional | Client to provide SVG/PNG |
| G5 | Historical order data for opening balances | Billing shows incorrect dues | Client to provide Excel with existing outstanding |
| G6 | Full employee list with PPK rates | User management incomplete | Get HR-approved list before migration |
| G7 | Farmer data DPDP consent mechanism | Legal risk | Legal review before go-live |

## Technical Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| T1 | GPS battery drain on Android (background tracking 60s) | High | High | Use Expo TaskManager with `foregroundService`; warn users to keep app active |
| T2 | Poor mobile network in rural districts | High | Medium | Implement request queue in AsyncStorage; retry on reconnect |
| T3 | Supabase RLS performance with recursive subordinate queries | Medium | High | Cache `get_subordinates()` result in Redis/Edge Function; index manager_id |
| T4 | React Native Expo managed workflow limitations for background GPS | Medium | High | Switch to bare workflow if Expo Location background task is insufficient |
| T5 | Google Maps API cost spike if users leave map open all day | Low | Medium | Set session tokens; render map only on demand; budget alerts on GCP |
| T6 | EAS Build failure for Android without keystore | Low | High | Generate and store keystore in GitHub Secrets on Day 1 |

## Scalability Concerns

| Area | Current | At Scale (500 users) | Action |
|---|---|---|---|
| GPS waypoints | ~7 points/day × 15 users = 105/day | 500 users × 7 = 3,500/day | Partition `gps_waypoints` by month; purge after 90 days |
| Task records | Low volume in MVP | 15 records/task × 100 tasks/day | Index `(task_id, submitted_at)`; paginate records |
| Realtime subscriptions | 12 users → 12 WS connections | 500 → Supabase Pro needed | Upgrade to Supabase Pro at >200 concurrent users |
| Supabase free tier | 500MB DB, 2GB bandwidth | Exceeded by Month 2 | Budget for Pro: ~₹2,100/mo |
| Photo storage | 18 dealers × 0 = 0 MB now | 100 tasks × 1MB/photo = 100MB/month | Compress photos to <500KB on mobile before upload |

## Security Concerns

| # | Concern | Risk Level | Mitigation |
|---|---|---|---|
| S1 | JWT tokens in AsyncStorage (mobile) → accessible if device rooted | Medium | Use Expo SecureStore instead of AsyncStorage for tokens |
| S2 | GPS data → competitor intelligence if breached | Medium | RLS ensures GPS only visible to user + superiors; no public endpoints |
| S3 | Expense bill photos in Supabase Storage → default public URLs | High | Set bucket to private; serve via signed URLs (1-hour expiry) |
| S4 | Farmer personal data (name, contact) in task_records | Medium | Encrypt PII fields at application layer; DPDP consent flow |
| S5 | Manager can see all subordinate GPS (surveillance concern) | Medium | Communicate to field staff in onboarding; limit to 90-day retention |
| S6 | Supabase service role key in environment variables | High | Never commit to git; use Vercel environment variable vault |

## Open Questions (from PRD Section 11.1)

1. **Offline-first**: Should task records and expense claims queue locally when offline and sync on reconnect? → **Recommend: Yes for Phase 5; MVP requires connectivity**
2. **Farmer DPDP consent**: Does collecting farmer name/contact require explicit consent? → **Legal review required before go-live**
3. **WhatsApp Business API**: DLT template registration takes 3–7 days → **Start in parallel with development if Phase 5 is firm**
4. **Hindi UI**: Adds ~2 weeks; field staff education level varies → **Survey 5 field staff before committing**
5. **Photo retention policy**: 1MB × 100 tasks/month = growing storage cost → **Define 90-day or 1-year policy before Phase 3**

---

## Summary Checklist Before First Line of Code

- [ ] Supabase project created (staging + production)
- [ ] MSG91 DLT registration initiated
- [ ] GitHub repository created with branch protection on main
- [ ] Vercel project linked to GitHub (web + staging)
- [ ] Complete employee list received (for seed data)
- [ ] Complete district list confirmed
- [ ] Complete product catalogue received (100+ SKUs)
- [ ] Company logo/branding assets received
- [ ] Google Maps API key obtained (with billing alert set at $10)
- [ ] Google Play Developer account ($25) created
- [ ] Legal review for DPDP farmer data initiated

---

*Document prepared for: PrabhuGopal Agri Product Pvt. Ltd.*
*Prepared by: Senior Architect (Claude)*
*Based on: PGA_AgriTask_PRD_v1.0 (March 2026) + AgriTask_0.jsx prototype*
*Next review: Upon Phase 1 completion*
