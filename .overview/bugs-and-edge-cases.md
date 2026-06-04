# Bugs & Edge Cases — Student Attendance System

> Extracted from code analysis of all backend API routes and cross-referenced against `student-attendance-system.md`.  
> Last updated: June 2026

---

## 🔴 Critical

### 1. Student history route crashes silently on DB failure

**File:** `app/api/student/attendance/history/route.ts`  
**Issue:** No `try/catch` around the database calls. If the DB fails mid-request, the error propagates unhandled and Next.js returns an empty or malformed 500 response. The student portal shows a blank screen with no explanation.  
**Contrast:** The admin calendar route (`api/admin/student-attendance/calendar/route.ts`) already has try/catch and returns `{ error: err.message }`.  
**Fix:** Wrap all DB queries in try/catch and return `NextResponse.json({ error: "..." }, { status: 500 })`.

---


## 🟡 Medium

### 3. Being Late AND leaving early loses the "Late" status

**File:** `app/api/student/attendance/punch-out/route.ts`  
**Issue:** At punch-out, status is recalculated from scratch. If a student was marked "Late" at punch-in but also leaves before end time, the status is overwritten to "Early_Checkout". The "Late" fact is permanently lost from the record.  
**Fix:** Either add a combined status (e.g. `Late_Early_Checkout`) or add a separate `was_late` boolean column so both facts are preserved.


---

### 5. Admin mark route uses hardcoded Sunday instead of configurable weekend days

**File:** `app/api/admin/student-attendance/mark/route.ts`  
**Issue:**
```ts
if (new Date(yr, mo - 1, dy).getDay() === 0) { // hardcoded Sunday only
  return error("Cannot manually mark Sundays...")
}
```
If the admin has configured Saturday+Sunday as weekly off days, admins can still manually mark Saturdays. The other routes (punch-in, leave apply, calendar) all use `getStudentAttendanceSettings()` and the `weekend_days` array correctly.  
**Fix:** Replace the hardcoded check with `getStudentAttendanceSettings()` + `weekendSet`, matching every other route.

---

### 6. Leave apply uses UTC date parsing (timezone edge case)

**File:** `app/api/student/attendance/leave/apply/route.ts`  
**Issue:**
```ts
const d = new Date(date); // "2026-06-04" → parsed as UTC midnight
if (weekendSet.has(d.getDay())) { ... }
```
`new Date("2026-06-04")` is midnight UTC. Calling `.getDay()` on it gives the UTC day, not the IST day. For India (UTC+5:30) this is currently safe, but it is inconsistent with every other route that uses IST-aware construction.  
**Fix:**
```ts
const d = new Date(new Date(date).toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
```

---

### 7. Admin can't override a Holiday in the student detail tab

**File:** `src/components/admin/students/student-detail/student-attendance-tab.tsx`  
**Issue:** The "Mark / Edit" button is hidden on days rendered as "Holiday" in the admin's student detail tab. This blocks an admin from marking a student as Present on a day they actually worked (e.g. came in on a Sunday).  
**Note:** The backend mark route has no such restriction and would accept the request fine.  
**Fix:** Show the "Mark / Edit" button on holiday days too. Let the admin decide.

---

### 8. Confusing error message when admin pre-marks a day student tries to punch into

**File:** `app/api/student/attendance/punch-in/route.ts`  
**Issue:** If a student tries to punch in on a day where an admin created a record (e.g. pre-marked Holiday) but `punch_in` is still NULL, the UPSERT proceeds and overwrites the admin's mark. The error described in the spec ("Already punched in today") does not actually surface in this scenario — instead the admin mark silently disappears.  
**Note:** See Bug #2 above — the root cause is the missing `marked_by IS NULL` guard. Fixing #2 will also surface a proper error (409) to the student with a meaningful message.

---

## 🟢 Minor

### 9. Date display may show wrong day in some locales (frontend)

**Location:** Frontend components that render date strings from the API  
**Issue:** Date strings from the API (e.g. `"2026-06-04"`) passed directly to `new Date("2026-06-04")` are parsed as UTC midnight. In the Day Details panel or other display components, converting to a local date object may shift the date backward by one day in UTC-offset environments.  
**Backend status:** All backend calendar routes build dates from numeric parts (`new Date(year, month - 1, d)`) — they are safe. The risk is only in frontend display code.  
**Fix:** Parse date strings by splitting on `"-"` and using `new Date(year, month-1, day)` instead of `new Date(dateString)`.

---

### 10. Stale calendar briefly shows after admin marks attendance in student detail tab

**Location:** `src/components/admin/students/student-detail/student-attendance-tab.tsx`  
**Issue:** After saving a mark, the calendar auto-refreshes but shows old data momentarily with no loading indicator.  
**Fix:** Set the calendar back to a loading/skeleton state while the refetch is in progress.

---

## ✅ Already Fixed (Spec Listed as Open — Code Disagrees)

### Leave requests on weekly off days are blocked

**Spec says:** Students can submit leave for a Sunday (Problem 5 in spec).  
**Code reality:** `app/api/student/attendance/leave/apply/route.ts` explicitly validates the date against `weekendSet` and returns a 400 error if the date falls on a configured day off. **This is already fixed.**

---

## Duplicate Code / Tech Debt

| Issue | Files | Fix |
|---|---|---|
| `duration()` helper defined twice | `history/route.ts`, `calendar/route.ts` | Move to `src/lib/attendance.ts` |
| `verifyAdminToken` used in leave-requests `[id]` route instead of `resolveSession` | `app/api/admin/student-attendance/leave-requests/[id]/route.ts` | Migrate to `resolveSession` for RBAC consistency |
