# Attendance & Fine System — How It Works

## Overview

The system automatically tracks student attendance through punch-in/out, classifies each day's status based on configurable thresholds, and generates fines for leave overuse and unexcused absences.

---

## Part 1: Attendance Settings

Configured at **Admin → Settings → Student Attendance**.

| Setting | Default | Description |
|---|---|---|
| `work_start_time` | `09:00` | Official start time |
| `work_end_time` | `18:00` | Official end time |
| `grace_period_minutes` | `15` | Minutes after start before marking Late |
| `half_day_min_minutes` | `240` (4h) | Minimum minutes to qualify as a full day |
| `weekend_days` | `["sunday"]` | Days treated as weekly off (no attendance expected) |
| `auto_absent_if_no_punchin` | `true` | Flag used by the catch-up engine (see Part 3) |

---

## Part 2: Punch-In Status Classification

**When a student punches in:**

```
Punch-in time > work_start_time + grace_period_minutes  →  Late
Otherwise                                               →  Present
```

**Example** (defaults): grace = 15 min, start = 09:00  
→ Punch-in after **09:15** = `Late`  
→ Punch-in before 09:15 = `Present`

---

## Part 3: Punch-Out Status Classification

**When a student punches out**, the status is recalculated based on **duration + time of day**:

```
durationMinutes = punch_out - punch_in

absentThreshold = half_day_min_minutes / 2     (e.g. 120 min)
halfDayMin      = half_day_min_minutes          (e.g. 240 min)

if duration < absentThreshold      →  Absent
if duration < halfDayMin           →  Half_Day
if checkout_time < work_end_time   →  Half_Day   (left early, even if duration was enough)
else                               →  Keep Present / Late
```

**Example** (defaults: halfDayMin=240, endTime=18:00):

| Punch-in | Punch-out | Duration | Result |
|---|---|---|---|
| 09:00 | 10:00 | 60 min | `Absent` (< 120 min) |
| 09:00 | 12:00 | 180 min | `Half_Day` (< 240 min) |
| 09:00 | 15:00 | 360 min | `Half_Day` (enough duration, but left before 18:00) |
| 09:00 | 18:00 | 540 min | `Present` (full day) |
| 09:30 | 18:00 | 510 min | `Late` (was late, but worked full day) |

> Admin overrides are never auto-changed — only rows where `marked_by IS NULL` are reclassified.

---

## Part 4: Missing Days — Catch-Up Engine

**No cron job needed.** The catch-up runs automatically when any of these are accessed:

- Student views their attendance calendar (`GET /api/student/attendance/history`)
- Student views their fines (`GET /api/student/fines`)
- Admin views a student's calendar (`GET /api/admin/student-attendance/calendar`)

**`runCatchUp` logic:**

1. Finds the last recorded attendance date for the student
2. Loops from the day after that date through **yesterday** (IST)
3. For each day:
   - Skip if it's a configured weekend
   - Skip if an approved leave already exists for that date
   - Insert `Absent` row (`ON CONFLICT DO NOTHING` — safe to call multiple times)
   - Call `processAbsentDay` on the new row

If `runCatchUp` fails for any reason, it fails silently — the main data response is never blocked.

---

## Part 5: Fine System

### 5A. Leave Fine Settings

Configured at **Admin → Settings → Leave Fine Rules**.

| Setting | Default | Description |
|---|---|---|
| `enabled` | `false` | Master toggle for leave fines |
| `free_leaves_per_period` | `2` | How many leaves are free before a fine |
| `fine_amount` | `₹500` | Fine charged per excess leave |
| `fine_period` | `monthly` | Period for counting leaves (`monthly` or `yearly`) |
| `fine_on` | `approved` | Trigger on leave `approved` or `applied` |

### 5B. When a Leave Fine Is Generated

Triggered when an admin **approves** a leave request (or on apply, depending on `fine_on`).

```
Count approved leaves in the period for this student
If count > free_leaves_per_period:
    Insert pending fine of fine_amount
    (ON CONFLICT DO NOTHING — one fine per leave request)
```

The admin sees a **warning banner** inside the approval modal **before** approving if the student has already used their quota.

If a leave is **rejected**, any pending fine linked to that leave request is **auto-waived**.

---

### 5C. Absent Fine Settings

| Setting | Default | Description |
|---|---|---|
| `absent_fine_enabled` | `false` | Master toggle for absent fines |
| `absent_fine_rule` | `use_balance` | How to handle absences |
| `absent_fine_amount` | `₹200` | Fine per absent day |

### 5D. Absent Fine Rules

**`use_balance`** (default):
```
Count approved leaves already used in the period
If used < free_leaves_per_period:
    Auto-create an approved leave for this absent day (consume balance)
    Change attendance status to Leave
    No fine generated
Else (balance exhausted):
    Generate absent fine
```

**`direct_fine`**:
```
Always generate a fine for every absent day
(Ignores leave balance entirely)
```

### 5E. When Absent Fines Are Generated

`processAbsentDay` is called in three places:

1. **Catch-up engine** — when a blank day is auto-filled as Absent
2. **Admin manually marks Absent** — called after the insert
3. **Punch-out results in Absent** — called after status is set (via catch-up on next view)

If an admin changes a day's status **away from Absent**, any pending absent fine for that attendance row is **auto-waived**.

---

## Part 6: Fine Lifecycle

```
pending  →  paid    (admin marks as paid)
pending  →  waived  (admin waives, or system auto-waives on rejection/status change)
```

Both leave fines and absent fines are stored in `student_leave_fines`:

| Column | Description |
|---|---|
| `fine_type` | `leave` or `absent` |
| `leave_request_id` | Set for leave fines |
| `attendance_id` | Set for absent fines |
| `period_label` | `YYYY-MM` (monthly) or `YYYY` (yearly) |
| `fine_amount` | Locked at time of generation |
| `status` | `pending` / `paid` / `waived` |

---

## Part 7: Student Visibility

Students see pending fines as an **amber warning banner** at the top of their `/attendance` page:

> **Leave Fines Pending — June 2026** — You have 3 pending fines totalling ₹1,500. Please contact admin.

When applying for leave, the modal shows a **pre-warning** if approving the leave would generate a fine.

---

## Part 8: Admin Visibility

- **Student Detail → Fines tab** — full list of fines with Mark as Paid / Waive actions
- **Student Detail → Sidebar** — amber card showing total pending fines at a glance
- **Leave approval modal** — shows fine warning before the admin clicks Approve

---

## Flow Summary

```
Student punches in
    → Present or Late (based on grace period)

Student punches out
    → Absent / Half_Day / Present / Late
       (based on duration + work_end_time config)

Day passes with no punch-in
    → On next calendar/fines view: catch-up marks Absent
    → processAbsentDay: use balance or generate fine

Admin approves leave
    → Check quota: if exceeded → generate leave fine
    → Admin warned in modal before approval

Admin marks day Absent manually
    → processAbsentDay fires

Admin changes day away from Absent
    → Pending absent fine auto-waived

Leave rejected
    → Pending leave fine auto-waived
```
