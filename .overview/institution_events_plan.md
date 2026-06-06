# Institution Events Feature Plan

## Objective
Implement an **Institution Events** system where administrators can manage (Add, Update, Delete, Read) institute programs (e.g., seminars, cultural fests, workshops), and students can view these upcoming events via a read-only widget on their dashboard.

---

## 1. Database Schema
Create a new table `institution_events` to store the event details.

**Migration File**: `scripts/run-migration-035.ts`
```sql
CREATE TABLE IF NOT EXISTS institution_events (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT         NOT NULL,
  description TEXT,
  date        DATE         NOT NULL,
  time        TEXT,        -- e.g., "10:00 AM - 1:00 PM"
  location    TEXT,        -- e.g., "Main Auditorium"
  created_by  UUID         REFERENCES admin_accounts(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inst_events_date ON institution_events (date);
```

---

## 2. Admin Backend (CRUD API)
We need an API route for Admins to manage events.

**File**: `app/api/admin/events/route.ts`
- `GET`: Fetch all events, ordered by date.
- `POST`: Create a new event. (Body: `title`, `description`, `date`, `time`, `location`)
- `PUT`: Update an existing event by `id`.
- `DELETE`: Delete an event by `id`.

---

## 3. Admin Frontend (Management UI)
Create a dedicated page for Admins to manage events.

**File**: `app/(admin)/admin/events/page.tsx`
- **Header**: "Institution Events" with an "Add Event" button.
- **List/Grid**: Display existing events with their details (Date, Title, Time, Location).
- **Actions**: Each event card/row will have an "Edit" and "Delete" button.
- **Modal**: A reusable modal for creating and updating events.

---

## 4. Student Backend (Read-only API)
Students only need to fetch *upcoming* events to display in their widget.

**File**: `app/api/student/events/route.ts`
- `GET`: Fetch events where `date >= CURRENT_DATE`.
- Order by `date ASC` and `LIMIT 5` to only show the most relevant upcoming events.

---

## 5. Student Frontend (Dashboard Widget)
A beautiful, modern widget to be placed on the Student Dashboard.

**File**: `src/components/student/dashboard/events-widget.tsx`
- **UI Design**: A sleek card containing a list of upcoming events.
- **Visuals**: Use icons (Calendar, Clock, MapPin) to make the data scannable and premium.
- **Empty State**: "No upcoming events scheduled at the moment."
- **Integration**: Import and render `<EventsWidget />` directly inside the student's main `app/(student)/dashboard/page.tsx` layout.

---

## Implementation Steps
1. Execute the Database Migration to create the table.
2. Build the Admin API routes.
3. Build the Admin UI to ensure data can be populated.
4. Build the Student API route to fetch upcoming events.
5. Build and integrate the Student Dashboard Widget.
