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

  // Test Case 5: 1 Leave + 2 Public Holidays
  // May 15: Leave
  // May 16: Holiday
  // May 17: Holiday
  // Expected: 3 leaves (15, 16, 17)
  const case5Records = [
    { date: "2026-05-15", status: "Leave" },
    { date: "2026-05-16", status: "Holiday" },
    { date: "2026-05-17", status: "Holiday" }
  ];
  const calc5 = calculatePayrollFromAttendance("2026-05", 30000, case5Records);
  console.log("\nCase 5 (1 Leave + 2 Public Holidays):");
  console.log("  - Leave Count:", calc5.leaveCount);
  console.log("  - Expected: 3");
  console.log("  - Match:", calc5.leaveCount === 3 ? "PASS" : "FAIL");

  // Test Case 6: Public Holiday Between Leaves
  // May 15: Leave
  // May 16: Holiday
  // May 17: Leave
  // Expected: 3 leaves (15, 16, 17)
  const case6Records = [
    { date: "2026-05-15", status: "Leave" },
    { date: "2026-05-16", status: "Holiday" },
    { date: "2026-05-17", status: "Leave" }
  ];
  const calc6 = calculatePayrollFromAttendance("2026-05", 30000, case6Records);
  console.log("\nCase 6 (Public Holiday Between Leaves):");
  console.log("  - Leave Count:", calc6.leaveCount);
  console.log("  - Expected: 3");
  console.log("  - Match:", calc6.leaveCount === 3 ? "PASS" : "FAIL");

  // Test Case 7: 2 Public Holidays + 1 Leave
  // May 15: Holiday
  // May 16: Holiday
  // May 17: Leave
  // Expected: 3 leaves (15, 16, 17)
  const case7Records = [
    { date: "2026-05-15", status: "Holiday" },
    { date: "2026-05-16", status: "Holiday" },
    { date: "2026-05-17", status: "Leave" }
  ];
  const calc7 = calculatePayrollFromAttendance("2026-05", 30000, case7Records);
  console.log("\nCase 7 (2 Public Holidays + 1 Leave):");
  console.log("  - Leave Count:", calc7.leaveCount);
  console.log("  - Expected: 3");
  console.log("  - Match:", calc7.leaveCount === 3 ? "PASS" : "FAIL");

  // Test Case 8: 2 Leaves + 1 Public Holiday
  // May 15: Leave
  // May 16: Leave
  // May 17: Holiday
  // Expected: 3 leaves (15, 16, 17)
  const case8Records = [
    { date: "2026-05-15", status: "Leave" },
    { date: "2026-05-16", status: "Leave" },
    { date: "2026-05-17", status: "Holiday" }
  ];
  const calc8 = calculatePayrollFromAttendance("2026-05", 30000, case8Records);
  console.log("\nCase 8 (2 Leaves + 1 Public Holiday):");
  console.log("  - Leave Count:", calc8.leaveCount);
  console.log("  - Expected: 3");
  console.log("  - Match:", calc8.leaveCount === 3 ? "PASS" : "FAIL");

  // Test Case 9: 4 Consecutive Days Including Holidays
  // May 15: Leave
  // May 16: Holiday
  // May 17: Sunday Weekly Off
  // May 18: Leave
  // Expected: 4 leaves (15, 16, 17, 18)
  const case9Records = [
    { date: "2026-05-15", status: "Leave" },
    { date: "2026-05-16", status: "Holiday" },
    { date: "2026-05-18", status: "Leave" }
  ];
  const calc9 = calculatePayrollFromAttendance("2026-05", 30000, case9Records);
  console.log("\nCase 9 (4 Consecutive Days Including Holidays):");
  console.log("  - Leave Count:", calc9.leaveCount);
  console.log("  - Expected: 4");
  console.log("  - Match:", calc9.leaveCount === 4 ? "PASS" : "FAIL");

  // Test Case 10: 5 Consecutive Days Including Multiple Holidays
  // May 15: Leave
  // May 16: Holiday
  // May 17: Sunday Weekly Off
  // May 18: Holiday
  // May 19: Leave
  // Expected: 5 leaves (15, 16, 17, 18, 19)
  const case10Records = [
    { date: "2026-05-15", status: "Leave" },
    { date: "2026-05-16", status: "Holiday" },
    { date: "2026-05-18", status: "Holiday" },
    { date: "2026-05-19", status: "Leave" }
  ];
  const calc10 = calculatePayrollFromAttendance("2026-05", 30000, case10Records);
  console.log("\nCase 10 (5 Consecutive Days Including Multiple Holidays):");
  console.log("  - Leave Count:", calc10.leaveCount);
  console.log("  - Expected: 5");
  console.log("  - Match:", calc10.leaveCount === 5 ? "PASS" : "FAIL");

  // Test Case 11: 6-Day Continuous Sandwich Block
  // May 15: Leave
  // May 16: Leave
  // May 17: Sunday Weekly Off
  // May 18: Holiday
  // May 19: Sunday Weekly Off
  // May 20: Leave
  // Expected: 6 leaves (15, 16, 17, 18, 19, 20)
  const case11Records = [
    { date: "2026-05-15", status: "Leave" },
    { date: "2026-05-16", status: "Leave" },
    { date: "2026-05-18", status: "Holiday" },
    { date: "2026-05-19", status: "Holiday" },
    { date: "2026-05-20", status: "Leave" }
  ];
  const calc11 = calculatePayrollFromAttendance("2026-05", 30000, case11Records);
  console.log("\nCase 11 (6-Day Continuous Sandwich Block):");
  console.log("  - Leave Count:", calc11.leaveCount);
  console.log("  - Expected: 6");
  console.log("  - Match:", calc11.leaveCount === 6 ? "PASS" : "FAIL");

  // Test Case 12: Not Applicable Due to Present Day
  // May 15: Leave
  // May 16: Holiday
  // May 17: Present
  // May 18: Leave
  // Expected: 2 leaves (15, 18)
  const case12Records = [
    { date: "2026-05-15", status: "Leave" },
    { date: "2026-05-16", status: "Holiday" },
    { date: "2026-05-17", status: "Present" },
    { date: "2026-05-18", status: "Leave" }
  ];
  const calc12 = calculatePayrollFromAttendance("2026-05", 30000, case12Records);
  console.log("\nCase 12 (Not Applicable Due to Present Day):");
  console.log("  - Leave Count:", calc12.leaveCount);
  console.log("  - Expected: 2");
  console.log("  - Match:", calc12.leaveCount === 2 ? "PASS" : "FAIL");

  console.log("\n=== TESTS COMPLETED ===");
}

runTests();
