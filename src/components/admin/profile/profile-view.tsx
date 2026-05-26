"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  CalendarDays, FileText, UserCircle, Wallet, MoreHorizontal, 
  KeyRound, LogOut, Mail, Phone, MapPin, Calendar, 
  Building2, User, Briefcase, UserCheck, DollarSign 
} from "lucide-react";
import type { Employee, PayrollRun } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PayslipModal } from "@/components/admin/employees/payslip-modal";
import { ChangePasswordModal } from "@/components/shared/change-password-modal";
import { AttendanceCalendarMini, type ProfileAttendanceRecord } from "./attendance-calendar-mini";
import { PayslipHistoryTable } from "./payslip-history-table";

function currentYearMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function fmtDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function fmtCurrency(n: number) {
  if (!n && n !== 0) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function Avatar({ url, name }: { url?: string; name: string }) {
  const initials = name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  if (url) {
    return (
      <img src={url} alt={name} className="size-24 rounded-md object-cover ring-4 ring-white shadow-md" />
    );
  }
  return (
    <div className="size-24 rounded-md bg-primary/10 text-primary font-bold text-3xl flex items-center justify-center ring-4 ring-white shadow-md">
      {initials}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | number | null }) {
  const displayValue = value !== undefined && value !== null && value !== "" ? value : "-";

  return (
    <div className="flex items-start gap-3 py-3 border-b border-default last:border-0">
      <div className="mt-0.5 size-8 rounded-md bg-subtle flex items-center justify-center shrink-0">
        <Icon className="size-4 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted font-medium mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-foreground">{displayValue}</p>
      </div>
    </div>
  );
}

function InfoCell({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | number | null }) {
  const displayValue = value !== undefined && value !== null && value !== "" ? value : "-";

  return (
    <div className="flex items-start gap-3 py-3 border-b border-default">
      <div className="mt-0.5 size-8 rounded-md bg-subtle flex items-center justify-center shrink-0">
        <Icon className="size-4 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted font-medium mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-foreground">{displayValue}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-md border border-default bg-white p-5 ${className ?? ""}`}>
      <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">{title}</p>
      {children}
    </div>
  );
}

export function ProfileView() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(currentYearMonth());
  const [attendance, setAttendance] = useState<ProfileAttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [payslipMonth, setPayslipMonth] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/admin/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const fetchProfile = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/profile", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setEmployee(data.employee ?? null);
        setMessage(data.message ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!employee) return;
    setAttendanceLoading(true);
    fetch(`/api/admin/profile/attendance?month=${month}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setAttendance(data.records ?? []))
      .finally(() => setAttendanceLoading(false));
  }, [employee, month]);

  useEffect(() => {
    if (!employee) return;
    fetch("/api/admin/profile/payroll", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setPayrollRuns(data.runs ?? []));
  }, [employee]);

  if (loading) {
    return <div className="text-sm text-muted p-10">Loading profile...</div>;
  }

  if (!employee) {
    return (
      <div className="w-full min-h-screen bg-subtle px-4 sm:px-6 lg:px-10 py-10">
        <Card className="max-w-2xl mx-auto shadow-sm border-default">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCircle className="size-5" />
              My Profile
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="size-4 text-muted" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
                  <KeyRound className="mr-2 size-4" />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 size-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-secondary">
              {message || "No employee record linked to your account."}
            </p>
          </CardContent>
        </Card>

        {showChangePassword && (
          <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-s py-10 space-y-6">
      {/* Page Header Layout */}
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div className="flex items-center gap-5">
          <Avatar url={employee.profilePhotoUrl} name={employee.fullName} />
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
                {employee.fullName}
              </h1>
              <Badge
                variant={employee.status === "active" ? "default" : "outline"}
                className="w-fit capitalize font-semibold"
              >
                {employee.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-sm text-secondary mt-1">{employee.designation ?? "Employee"}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[11px] font-mono bg-subtle border border-default text-muted px-2 py-0.5 rounded-md">
                {employee.employeeCode}
              </span>
              <span className="text-[11px] font-semibold border border-default text-secondary px-2 py-0.5 rounded-md">
                {employee.employmentType ? employee.employmentType.replace(/_/g, " ") : "-"}
              </span>
              {employee.department && (
                <span className="text-[11px] font-semibold border border-default text-secondary px-2 py-0.5 rounded-md">
                  {employee.department.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Dropdown Control Block */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-secondary border border-default hover:bg-subtle transition-colors shadow-sm">
              <MoreHorizontal className="size-4 text-muted" /> Account Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
              <KeyRound className="mr-2 size-4 text-muted" />
              Change Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 size-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Unified Flattened Responsive Grid System */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Row 1 Left: Contact Info */}
        <div className="lg:col-span-2">
          <SectionCard title="Contact Information" className="h-full">
            <InfoRow icon={Mail} label="Email Address" value={employee.email} />
            <InfoRow icon={Phone} label="Phone Number" value={employee.phone} />
            <InfoRow icon={MapPin} label="Address" value={employee.address} />
          </SectionCard>
        </div>

        {/* Row 1 Right: Personal Info */}
        <div className="lg:col-span-1">
          <SectionCard title="Personal Information" className="h-full">
            <InfoRow icon={User} label="Gender" value={employee.gender} />
            <InfoRow icon={Calendar} label="Date of Birth" value={fmtDate(employee.dateOfBirth)} />
            <InfoRow icon={Building2} label="Highest Qualification" value={employee.qualification} />
          </SectionCard>
        </div>

        {/* Row 2: Employment Details (Full Width of Grid) */}
        <div className="lg:col-span-3">
          <SectionCard title="Employment Details" className="h-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4">
              <InfoCell icon={Building2} label="Department" value={employee.department?.name} />
              <InfoCell icon={Briefcase} label="Designation" value={employee.designation} />
              <InfoCell icon={UserCheck} label="Employment Type" value={employee.employmentType ? employee.employmentType.replace(/_/g, " ") : "-"} />
              <InfoCell icon={DollarSign} label="Monthly Salary" value={fmtCurrency(employee.monthlySalary)} />
              <InfoCell icon={Calendar} label="Date of Joining" value={fmtDate(employee.dateOfJoining)} />
              <InfoCell icon={UserCheck} label="Status" value={employee.status ? employee.status.replace(/_/g, " ") : "-"} />
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Attendance Section — Kept Exactly Like Old */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-5" />
            Attendance
          </CardTitle>
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="h-9 w-fit rounded-lg border border-default bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </CardHeader>
        <CardContent className="w-full max-w-md mx-auto">
          <AttendanceCalendarMini month={month} records={attendance} loading={attendanceLoading} />
        </CardContent>
      </Card>

      {/* Salary & Payslips — Full Width Block */}
      <div className="mt-6">
        <SectionCard title="Salary & Payslips">
          <div className="pt-1">
            <PayslipHistoryTable runs={payrollRuns} onViewPayslip={setPayslipMonth} />
          </div>
        </SectionCard>
      </div>

      {/* Presentation Modals */}
      {payslipMonth && (
        <PayslipModal
          runId={payslipMonth}
          endpoint={`/api/admin/profile/payroll/${payslipMonth}`}
          onClose={() => setPayslipMonth(null)}
        />
      )}

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}