# Fine Transparency UI Plan

## Objective
Currently, students see a warning banner that says they have a certain amount of pending fines, but they cannot see *why* they were fined or *which dates* triggered the fine. We need to add a detailed breakdown so students can understand their penalties.

## Implementation Details

**File to modify:** `app/(student)/attendance/page.tsx`

### 1. Update the State Interface
The `/api/student/fines` API already returns detailed information like `fine_type`, `leave_date`, `absent_date`, and `created_at`. We just need to capture it in our state.
Update the `pendingFines` state type:
```typescript
type FineRecord = {
  id: string;
  fine_type: "absent" | "leave";
  period_label: string;
  fine_amount: number;
  status: string;
  leave_date?: string | null;
  absent_date?: string | null;
  created_at: string;
};
const [pendingFines, setPendingFines] = useState<FineRecord[]>([]);
const [finesModalOpen, setFinesModalOpen] = useState(false);
```

### 2. Add "View Details" to the Banner
Inside the existing yellow `<div className="... border-amber-300">` warning banner, add a button that opens the details modal.
```tsx
<Button 
  variant="outline" 
  size="sm" 
  className="ml-auto bg-white text-amber-800 border-amber-300 hover:bg-amber-50"
  onClick={() => setFinesModalOpen(true)}
>
  View Details
</Button>
```

### 3. Create the "My Fines" Modal
Import the `Dialog` components from `@/components/ui/dialog`.
At the bottom of the page (or right next to `LeaveApplyModal`), add:
```tsx
<Dialog open={finesModalOpen} onOpenChange={setFinesModalOpen}>
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle>Pending Fines Details</DialogTitle>
    </DialogHeader>
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      {pendingFines.map((fine) => {
        const isAbsent = fine.fine_type === "absent";
        const displayDate = isAbsent 
          ? fmtDate(fine.period_label) // e.g., "03 June 2026"
          : fine.period_label;         // e.g., "2026-06" (Month)

        return (
          <div key={fine.id} className="flex justify-between items-start border rounded-lg p-3 bg-slate-50">
            <div>
              <p className="font-bold text-sm text-slate-800">
                {isAbsent ? "Unexcused Absence Fine" : "Leave Quota Exceeded Fine"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-medium text-slate-700">Date/Period:</span> {displayDate}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Generated on: {fmtDate(fine.created_at)}
              </p>
            </div>
            <div className="text-right">
              <span className="font-bold text-red-600">₹{fine.fine_amount}</span>
              <p className="text-[10px] uppercase font-bold text-amber-600 mt-1 px-2 py-0.5 bg-amber-100 rounded-full inline-block">
                Pending
              </p>
            </div>
          </div>
        );
      })}
    </div>
  </DialogContent>
</Dialog>
```

## Benefits
- Students will immediately know exactly which absence or extra leave caused their fine.
- Reduces confusion and stops students from having to message admins to explain the fine amount.
