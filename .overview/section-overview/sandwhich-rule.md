=== RUNNING SANDWICH LEAVE CALCULATION TESTS ===

Case 1 (Mid-Month Saturday/Sunday/Monday Leave):
  - Leave Count: 4
  - Expected: 4 (May 15, May 16, May 17 [Sandwiched Sunday], May 18)
  - Match: PASS

Case 2 (Consecutive Off-Days Sandwich: Fri Leave, Sat Holiday, Sun Weekly Off, Mon Leave):
  - Leave Count: 4
  - Expected: 4 (May 15, May 16 [Sandwiched], May 17 [Sandwiched], May 18)
  - Match: PASS

Case 3 (Month Boundary Sandwich: Jan 31 Leave, Feb 1 Sunday Weekly Off, Feb 2 Leave):
  - Leave Count: 2
  - Expected: 2 (Feb 1 [Sandwiched], Feb 2)
  - Match: PASS

Case 4 (Not Sandwiched: Fri Leave, Sat Present, Sun Weekly Off, Mon Leave):
  - Leave Count: 2
  - Expected: 2 (Fri, Mon)
  - Match: PASS

Case 5 (1 Leave + 2 Public Holidays):
  - Leave Count: 3
  - Expected: 3
  - Match: PASS

Case 6 (Public Holiday Between Leaves):
  - Leave Count: 3
  - Expected: 3
  - Match: PASS

Case 7 (2 Public Holidays + 1 Leave):
  - Leave Count: 3
  - Expected: 3
  - Match: PASS

Case 8 (2 Leaves + 1 Public Holiday):
  - Leave Count: 3
  - Expected: 3
  - Match: PASS

Case 9 (4 Consecutive Days Including Holidays):
  - Leave Count: 4
  - Expected: 4
  - Match: PASS

Case 10 (5 Consecutive Days Including Multiple Holidays):
  - Leave Count: 5
  - Expected: 5
  - Match: PASS

Case 11 (6-Day Continuous Sandwich Block):
  - Leave Count: 6
  - Expected: 6
  - Match: PASS

Case 12 (Not Applicable Due to Present Day):
  - Leave Count: 2
  - Expected: 2
  - Match: PASS

=== TESTS COMPLETED ===
