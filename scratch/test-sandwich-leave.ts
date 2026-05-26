import { calculatePayrollFromAttendance } from "../src/lib/payroll-calculation";

function runTests() {
  console.log("=== RUNNING SANDWICH LEAVE CALCULATION TESTS ===\n");

  // Test Case 1: Mid-Month Sandwich
  // Friday (May 15): Leave
  // Saturday (May 16): Leave
  // Sunday (May 17): Weekly Off
  // Monday (May 18): Leave
  // Expected: Sunday is sandwiched between Saturday (Leave) and Monday (Leave). Total leaves should be 3 (Sat, Sun, Mon).
  const case1Records = [
    { date: "2026-05-15", status: "Leave" },
    { date: "2026-05-16", status: "Leave" },
    { date: "2026-05-18", status: "Leave" }
  ];
  const calc1 = calculatePayrollFromAttendance("2026-05", 30000, case1Records);
  console.log("Case 1 (Mid-Month Saturday/Sunday/Monday Leave):");
  console.log("  - Leave Count:", calc1.leaveCount);
  console.log("  - Expected: 4 (May 15, May 16, May 17 [Sandwiched Sunday], May 18)");
  console.log("  - Match:", calc1.leaveCount === 4 ? "PASS" : "FAIL");

  // Test Case 2: Consecutive Off-Days Sandwich
  // Friday (May 15): Leave
  // Saturday (May 16): Holiday
  // Sunday (May 17): Weekly Off
  // Monday (May 18): Leave
  // Expected: Saturday and Sunday are sandwiched between Friday (Leave) and Monday (Leave). Total leaves should be 4 (Fri, Sat, Sun, Mon).
  const case2Records = [
    { date: "2026-05-15", status: "Leave" },
    { date: "2026-05-16", status: "Holiday" },
    { date: "2026-05-18", status: "Leave" }
  ];
  const calc2 = calculatePayrollFromAttendance("2026-05", 30000, case2Records);
  console.log("\nCase 2 (Consecutive Off-Days Sandwich: Fri Leave, Sat Holiday, Sun Weekly Off, Mon Leave):");
  console.log("  - Leave Count:", calc2.leaveCount);
  console.log("  - Expected: 4 (May 15, May 16 [Sandwiched], May 17 [Sandwiched], May 18)");
  console.log("  - Match:", calc2.leaveCount === 4 ? "PASS" : "FAIL");

  // Test Case 3: Month Boundary Sandwich
  // Jan 31, 2026 (Saturday): Leave
  // Feb 1, 2026 (Sunday): Weekly Off
  // Feb 2, 2026 (Monday): Leave
  // Expected (calculating for Feb): Feb 1 is Sunday. Left active day is Jan 31 (Leave). Right active day is Feb 2 (Leave).
  // Total leaves for Feb should be 2 (Feb 1 [Sandwiched], Feb 2).
  const case3Records = [
    { date: "2026-01-31", status: "Leave" },
    { date: "2026-02-02", status: "Leave" }
  ];
  const calc3 = calculatePayrollFromAttendance("2026-02", 30000, case3Records);
  console.log("\nCase 3 (Month Boundary Sandwich: Jan 31 Leave, Feb 1 Sunday Weekly Off, Feb 2 Leave):");
  console.log("  - Leave Count:", calc3.leaveCount);
  console.log("  - Expected: 2 (Feb 1 [Sandwiched], Feb 2)");
  console.log("  - Match:", calc3.leaveCount === 2 ? "PASS" : "FAIL");

  // Test Case 4: Not Sandwiched
  // Friday (May 15): Leave
  // Saturday (May 16): Present
  // Sunday (May 17): Weekly Off
  // Monday (May 18): Leave
  // Expected: Sunday is not sandwiched since Saturday is Present. Total leaves should be 2 (Fri, Mon).
  const case4Records = [
    { date: "2026-05-15", status: "Leave" },
    { date: "2026-05-16", status: "Present" },
    { date: "2026-05-18", status: "Leave" }
  ];
  const calc4 = calculatePayrollFromAttendance("2026-05", 30000, case4Records);
  console.log("\nCase 4 (Not Sandwiched: Fri Leave, Sat Present, Sun Weekly Off, Mon Leave):");
  console.log("  - Leave Count:", calc4.leaveCount);
  console.log("  - Expected: 2 (Fri, Mon)");
  console.log("  - Match:", calc4.leaveCount === 2 ? "PASS" : "FAIL");

  console.log("\n=== TESTS COMPLETED ===");
}

runTests();
