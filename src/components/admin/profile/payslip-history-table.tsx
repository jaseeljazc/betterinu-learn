"use client";

import { Eye } from "lucide-react";
import type { PayrollRun } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function monthLabel(month: string) {
  const [year, monthNum] = month.split("-");
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(Number.parseInt(year, 10), Number.parseInt(monthNum, 10) - 1, 1));
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function PayslipHistoryTable({
  runs,
  onViewPayslip,
}: {
  runs: PayrollRun[];
  onViewPayslip: (month: string) => void;
}) {
  if (!runs.length) {
    return <p className="text-sm text-muted">No disbursed payslips found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Month</TableHead>
          <TableHead>Working days</TableHead>
          <TableHead>Present</TableHead>
          <TableHead>Leaves</TableHead>
          <TableHead>Absences</TableHead>
          <TableHead>LOP days</TableHead>
          <TableHead>Gross</TableHead>
          <TableHead>Deduction</TableHead>
          <TableHead>Net</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id}>
            <TableCell className="font-semibold">{monthLabel(run.month)}</TableCell>
            <TableCell>{run.workingDays}</TableCell>
            <TableCell>{run.daysPresent}</TableCell>
            <TableCell>{run.leaveCount}</TableCell>
            <TableCell>{run.absentCount}</TableCell>
            <TableCell>{run.lopFullDays + run.lopHalfDays}</TableCell>
            <TableCell>{fmtCurrency(run.grossSalary)}</TableCell>
            <TableCell className="text-red-600">{fmtCurrency(run.lopDeduction)}</TableCell>
            <TableCell className="font-bold">{fmtCurrency(run.netSalary)}</TableCell>
            <TableCell>
              <Badge className="capitalize">{run.status}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="secondary" onClick={() => onViewPayslip(run.month)}>
                <Eye className="size-3.5" />
                View payslip
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
