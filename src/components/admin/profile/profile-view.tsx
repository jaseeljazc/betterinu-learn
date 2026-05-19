  "use client";

  import { useCallback, useEffect, useState } from "react";
  import { useRouter } from "next/navigation";
  import { CalendarDays, FileText, UserCircle, Wallet, MoreHorizontal, KeyRound, LogOut } from "lucide-react";
  import type { Employee, PayrollRun } from "@/types";
  import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  }

  function initials(name: string) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }

  function Field({ label, value }: { label: string; value?: string | number | null }) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase text-muted">{label}</p>
        <p className="mt-1 text-sm font-medium text-foreground">{value || "-"}</p>
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
        router.push("/admin/login");
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
      return <div className="text-sm text-muted">Loading profile...</div>;
    }

    if (!employee) {
      return (
        <div>
          <Card className="max-w-2xl">
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
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border border-default">
              <AvatarImage src={employee.profilePhotoUrl} alt={employee.fullName} />
              <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                {initials(employee.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{employee.fullName}</h1>
              <p className="text-sm text-secondary">
                {employee.employeeCode} {employee.designation ? `- ${employee.designation}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={employee.status === "active" ? "default" : "outline"}
              className="w-fit capitalize"
            >
              {employee.status.replace(/_/g, " ")}
            </Badge>
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
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCircle className="size-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Full name" value={employee.fullName} />
            <Field label="Employee code" value={employee.employeeCode} />
            <Field label="Email" value={employee.email} />
            <Field label="Phone" value={employee.phone} />
            <Field label="Gender" value={employee.gender} />
            <Field label="Date of birth" value={fmtDate(employee.dateOfBirth)} />
            <div className="sm:col-span-2">
              <Field label="Address" value={employee.address} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-5" />
              Employment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Department" value={employee.department?.name} />
            <Field label="Designation" value={employee.designation} />
            <Field label="Employment type" value={employee.employmentType.replace(/_/g, " ")} />
            <Field label="Date of joining" value={fmtDate(employee.dateOfJoining)} />
            <Field label="Status" value={employee.status.replace(/_/g, " ")} />
            <Field label="Monthly salary" value={fmtCurrency(employee.monthlySalary)} />
          </CardContent>
        </Card>

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="size-5" />
              Salary & Payslips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PayslipHistoryTable runs={payrollRuns} onViewPayslip={setPayslipMonth} />
          </CardContent>
        </Card>

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
