# Student Attendance System — How It Works

> A plain-English guide for anyone trying to understand what's been built,
> how each piece works, and what problems exist.
> Last updated: June 2026

---

## The Big Picture

Think of this system like a **digital sign-in sheet** for a classroom or office.

Students sign in (punch in) when they arrive and sign out (punch out) when they leave.
The system automatically figures out if they were on time, late, left early, or didn't show up at all.

Admins can view all of this, override anything they want, and approve leave requests.

There are **two separate portals**:
- **Student Portal** — what the student sees (their own attendance only)
- **Admin Portal** — what the admin sees (all students, with edit access)

Both portals talk to the same database, but they use completely different login systems so students can never access admin data.

---

## Part 1 — Settings (The Rules of the System)

Before anything else, an admin sets up the **rules** that decide how attendance is classified.
These settings live in the admin panel under **Settings → Student Attendance**.

Think of these settings like the rules written on the office notice board:

---

### Working Hours

**Work Start Time** (default: 9:00 AM)
This is the official start of the workday. If a student punches in before this time (plus the grace period), they're marked **Present**. If they punch in after it, they're marked **Late**.

**Work End Time** (default: 6:00 PM)
This is when the workday officially ends. If a student punches out before this time AND they've worked enough hours, they're marked **Early Checkout**.

---

### Grace Period (default: 15 minutes)

This is a buffer around the start time. So if work starts at 9:00 AM and the grace period is 15 minutes, punching in up to 9:15 AM still counts as **on time (Present)**. Punching in at 9:16 AM marks them as **Late**.

Think of it as: *"We don't penalise you if you're a little late."*

---

### Half Day Rules

There are two hour thresholds that decide if someone gets credit for being there at all:

- **Min Hours for Half Day** (default: 2 hours) — If a student works less than 2 hours, they get marked **Absent** even if they punched in. They were there too briefly to count.
- **Half Day Min Hours** (default: 4 hours) — If a student works between 2 and 4 hours, they get a **Half Day**. If they work 4+ hours, they get a **Full Day** (or Early Checkout if they left before 6 PM).

---

### Weekly Off Days (default: Sunday)

The admin can configure which days of the week are **days off** (like Sunday, or Saturday+Sunday for a 5-day week). On these days:

- Students **cannot punch in** — the system blocks it and shows an error.
- In the calendar, all past and future days that fall on these days appear as **Holiday** automatically.

> ⚠️ **Important:** If you add Saturday as a day off today, all past Saturdays will also show as "Holiday" in the calendar — even if students were working back then. This is a known issue (see Part 5).

---

### Overtime Message

If a student is still punched in (active) after the work end time, a configurable banner message appears on their screen. The admin can turn this on/off and change the message text. It's just a reminder — it doesn't affect their attendance status.

---

## Part 2 — How a Student's Day Gets Classified

Here's the step-by-step logic that runs every time the system builds the calendar for a month.
The system goes through each day one by one and asks a series of questions:

```
For each day in the month:

1. Is it a configured day off (e.g. Sunday)?
   └─ YES + no record in the database → mark as HOLIDAY. Done.
   └─ NO → continue...

2. Did an admin manually set a status for this day?
   └─ YES → use whatever the admin set. Admin always wins. Done.
   └─ NO → continue...

3. Is this day in the future (hasn't happened yet)?
   └─ YES → check if there's a leave request for this date:
             - Leave request approved → LEAVE
             - Leave request pending  → PENDING LEAVE
             - No leave request       → FUTURE (greyed out)
   └─ NO → continue...

4. Did the student punch in today?
   └─ YES + still punched in (no punch out yet, today only) → OPEN (pulsing)
   └─ YES + punched out → look at how long they worked (see punch-out logic below)
   └─ NO → it's a past day with no record → ABSENT
```

---

### What Happens When a Student Punches In

The moment a student hits the "Punch In" button:

1. The system checks what time it is.
2. It compares the current time to the **Work Start Time + Grace Period**.
3. If they're within the grace period → status is set to **Present**.
4. If they're past the grace period → status is set to **Late**.
5. The punch-in time and the student's IP address are saved.
6. If the IP address is not on the trusted list, an alert is sent to admins automatically.

---

### What Happens When a Student Punches Out

The moment a student hits the "Punch Out" button:

1. The system calculates how many hours they worked (punch-out time minus punch-in time).
2. It also checks what time they're punching out.
3. The final status is decided like this:

```
Worked less than 2 hours?          → ABSENT      (too short, doesn't count)
Worked 2–4 hours?                  → HALF DAY
Worked 4+ hours but left before    → EARLY CHECKOUT
  the official end time?
Worked 4+ hours and left at or     → Keep the punch-in status
  after the end time?                (PRESENT or LATE, whichever was set at punch-in)
```

---

## Part 3 — What the Student Sees

### The Attendance Calendar

When a student visits their Attendance page, they see a monthly calendar — like a wall calendar but colour-coded.

Each day box (tile) shows:
- The day number
- A tiny note (if the admin left one) — trimmed short to fit the box
- A small coloured dot at the bottom showing the status

**Colours:**

| Colour | Status | What it means |
|---|---|---|
| 🟢 Green | Present | Full day, on time |
| 🟡 Amber | Late | Punched in after grace period |
| 🟠 Orange | Early Checkout | Left before work end time |
| 🔵 Blue | Half Day | Worked half the day |
| 🔴 Red | Absent | No punch-in recorded |
| 🟣 Purple | Holiday | Weekly off or admin-declared holiday |
| 🫐 Indigo | Leave | Admin-approved leave |
| 🩵 Sky (dashed) | Pending Leave | Leave requested, waiting for approval |
| ⬜ Grey | Future | Day hasn't arrived yet |
| 🟡 Amber (pulsing) | Open / Active | Punched in today, hasn't punched out yet |

**Hovering over a tile** with an admin note shows the **full note text** in a popup (tooltip). This is useful because long notes get cut off on the small tile.

**Clicking any tile** opens the **Day Details** panel on the right side of the screen.

---

### Day Details Panel

When you click a day, a details panel appears showing:

- The full date
- The status badge (e.g. "PRESENT", "LATE")
- **Check In and Check Out times** — these always show if the student punched in, even if the admin later changed the status to Leave or Holiday
- The total duration worked
- Any admin note (shown in an amber/yellow card)

---

### Monthly Summary

Below the calendar is a stats card showing:

- **Attendance Score %** — a single number that represents the student's attendance for the month
- Breakdown of days: how many Present, Late, Early Checkout, Half Day, Absent, Leave, Holiday

**How the percentage is calculated:**

The system counts "working days" — any day that wasn't a holiday. Then it counts how much of those working days the student was effectively present:
- Present, Late, Early Checkout → count as 1 full day each
- Half Day → counts as 0.5
- Absent, Leave → count as 0

So if a student had 20 working days, was present 15 days, had 2 half days, and was absent 3 days:
Score = (15 + 1) ÷ 20 = 80%

---

### Leave Request Flow (Student Side)

**Applying for Leave:**
1. Student clicks "Apply for Leave" button at the top of the Attendance page.
2. A form pops up asking for the date and a reason.
3. After submitting, the leave request is saved with status **Pending**.
4. In the calendar, that future date now shows as **Pending Leave** (sky blue, dashed border).

**Checking Status:**
- Below the stats card, students can see all their leave requests for the current month.
- Each one shows the date, their reason, the admin's note (if any), and the current status: Pending / Approved / Rejected.

---

## Part 4 — What the Admin Sees

### All-Students Attendance Table

The admin has a dedicated Attendance page (`/admin/students/attendance`) that shows a table of all students' attendance records for a selected date or month.

Each row shows: student name, email, date, status, punch-in time, punch-out time, duration, IP address, and whether the punch came from a trusted location.

**Clicking a student's name or email** takes the admin directly to that student's detail page.

---

### Manually Marking / Overriding Attendance

Admins can override any student's attendance for any day. This is called "marking."

1. Click the student in the table.
2. Choose a status: Present, Late, Early Checkout, Half Day, Absent, Leave, or Holiday.
3. Optionally add a note (e.g. "Attended parent meeting", "Medical leave documented").
4. Click Save.

**The admin's mark always wins.** Even if the student punched in, the admin can override it. Even if the day is a future date, the admin can pre-mark it as a holiday.

**Unmarking:** If an admin-marked record needs to be removed, the admin can click "Unmark" in the modal. This deletes the admin's override and returns the day to its automatic status (the system recalculates from scratch).

---

### Leave Request Management

Admins can see all pending leave requests under `/admin/students/attendance/leave-requests`.

For each request they can:
- **Approve** — the day shows as Leave (indigo) in the student's calendar
- **Reject** — the request is marked rejected; the day returns to its normal status
- Add an **admin note** that the student can see

---

## Part 5 — Admin Student Detail Page — Attendance Tab

This is the newest addition to the system (not yet pushed to the server).

When an admin opens any student's detail page (e.g. after clicking their name), there are tabs: Courses, Submissions, Tasks, Fee Plan — and now **Attendance**.

### What the Attendance Tab Shows

- The same calendar grid as the student portal, but the admin sees it for that specific student.
- All the same colour coding, day details, admin notes.
- An **attendance summary** for the month.
- A **"Mark / Edit" button** on any past day — clicking it opens the same marking modal used elsewhere, pre-filled with whatever's already recorded for that day.

### Why a Separate API?

The admin calendar uses a completely separate backend route from what students use. This was a deliberate decision:
- Students log in with a "student token" — they can only see their own data.
- Admins log in with an "admin session" — they have broader access.
- Using the student's API from the admin panel would be a security shortcut that could cause problems. So the admin gets its own route that uses admin authentication and can look up any student by ID.

---

## Part 6 — Known Problems & Logical Issues

These are issues that currently exist in the code and should be fixed before going to production.

---

### 🔴 Problem 1: The attendance history page can crash silently

**What happens:** If the database has a hiccup, the student attendance history page may return a blank/broken response instead of a proper error message. The student just sees nothing or gets a "Failed to load" screen with no explanation.

**Why it happens:** The API doesn't have error handling around the database calls — if the database fails, the code crashes mid-way without sending any response.

**What should happen:** The API should catch the error and respond with a clear message like "Something went wrong, please try again."

---

### 🔴 Problem 2: Confusing error when admin pre-marks a day the student hasn't punched in yet

**What happens:** If an admin marks a student's future day as "Holiday", and then the student tries to punch in on that day — they get an error message saying "Already punched in today." But they haven't punched in at all! The admin created the record, not the student.

**Why it happens:** The system checks "is there already a database record for today?" — and there is (the admin made it) — so it assumes the student already punched in.

**What should happen:** The error message should say "This day has already been marked by an admin" instead of implying the student did something.

---

### 🟡 Problem 3: Being Late AND leaving early loses the "Late" information

**What happens:** If a student punches in late (marked **Late**) and then also leaves before the work end time, the system marks them as **Early Checkout** — completely replacing the "Late" information. The monthly summary will show +1 Early Checkout but +0 Late, which is misleading.

**Why it happens:** At punch-out, the system recalculates the status from scratch based on hours worked and checkout time. The original punch-in status is overwritten.

**What should happen:** The system should combine both facts — something like "Late + Early Checkout" — or at least preserve the Late classification and only add Early Checkout on top.

---

### 🟡 Problem 4: Changing weekly off days changes history

**What happens:** If your company used to work 6 days a week (Mon–Sat) and you now change the system to a 5-day week (Mon–Fri, so Saturday is now a day off), every past Saturday in the calendar will **retroactively** show as "Holiday" — even for months when Saturday was a working day and students might have been absent.

**Why it happens:** Every time the calendar loads, it reads the current day-off setting and applies it to every day it renders, including past months.

**What should happen:** The calendar should use the day-off setting that was active at the time each month occurred, not the current setting.

---

### 🟡 Problem 5: Students can request leave on a day-off day

**What happens:** A student can submit a leave request for a Sunday (or any configured day off). If the admin approves it, that Sunday will show as **Leave** (indigo) in the calendar instead of **Holiday** (purple) — because admin-approved data takes priority over the automatic weekend logic.

**What should happen:** The system should reject leave requests for days that are already configured as weekly off days, with a message like "This day is already a day off."

---

### 🟡 Problem 6: Admins can't override a Holiday in the student detail tab

**What happens:** In the new Attendance Tab on the student detail page, the "Mark / Edit" button is hidden on days that are marked as Holiday (e.g. Sundays). So an admin can't override a weekend day — for example, to mark a student as Present who actually came in and worked on a Sunday.

**Why it happens:** The code intentionally hides the edit button on holidays and future dates to prevent accidental changes. But it's too restrictive — holidays should still be overridable.

**What should happen:** Show the "Mark / Edit" button on Holiday days too. Let the admin decide.

---

### 🟢 Minor Problem 7: Dates can appear one day off in some time zones

**What happens:** In rare cases, a date like "June 4" might render as "June 3" in the Day Details panel on the right sidebar.

**Why it happens:** The code converts a date string like `"2026-06-04"` into a JavaScript Date object. JavaScript assumes that string is midnight in UTC (universal time), which is 5:30 AM in India — so the date displays correctly. But in some system locales it could shift backward.

**What should happen:** The date should be built from the individual parts (year, month, day) directly, not from a string that JavaScript might interpret in UTC.

---

### 🟢 Minor Problem 8: Stale data briefly shows after marking attendance in the student detail tab

**What happens:** After an admin saves a mark in the Attendance Tab, the calendar refreshes automatically — but for a brief moment, the old data still shows (no loading spinner appears during the refresh).

**What should happen:** The calendar should go back into its loading state (showing a grey skeleton placeholder) while the new data is being fetched, so it's clear something is happening.

---

## Part 7 — What's Not Built Yet

These features are related to the attendance system but haven't been implemented:

| Feature | Why it matters |
|---|---|
| **CSV Import / Export** | Admins can't download attendance data or upload it in bulk. Everything must be done one-by-one. |
| **Multi-day Leave Requests** | Students can only request leave for one day at a time. A 3-day sick leave requires 3 separate requests. |
| **Leave Balance / Quota** | There's no limit on how many leave days a student can request. The system doesn't track "you have 12 leave days per year." |
| **Student Missed Punch Correction** | If a student forgot to punch in, they can't self-correct it. An admin must manually mark it. |
| **Notifications for Leave Decisions** | When an admin approves or rejects a leave request, the student gets no email or in-app notification. They have to check manually. |
| **Attendance by Batch/Course** | Admins can't filter attendance by "who is in Course X" — it's just a flat list of all students. |
| **Attendance Charts / Trends** | No graphs showing attendance over time, top absentees, or month-over-month comparisons. |
| **Shift Scheduling** | The system only supports one fixed schedule (e.g. 9 AM – 6 PM for everyone). Different shifts aren't possible. |

---

*This document is meant to be read by anyone on the team — developer, admin, or product owner — to understand how the system works and what needs attention.*
