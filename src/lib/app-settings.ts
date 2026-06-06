import { sql } from "@/lib/db";

export interface StudentAttendanceSettings {
  work_start_time: string;
  work_end_time: string;
  grace_period_minutes: number;
  half_day_min_minutes: number;          // minimum minutes for Full Day (default 240 = 4h)
  half_day_threshold_minutes: number;    // minimum minutes to count as Half Day (default 120 = 2h)
  auto_absent_if_no_punchin: boolean;
  weekend_days: string[];
  overtime_message_enabled: boolean;
  overtime_message_text: string;
  early_punch_in_minutes: number;        // how early students can punch in (default 60 minutes)
}

export const DEFAULT_STUDENT_ATTENDANCE_SETTINGS: StudentAttendanceSettings = {
  work_start_time: "09:00",
  work_end_time: "18:00",
  grace_period_minutes: 15,
  half_day_min_minutes: 240,
  half_day_threshold_minutes: 120,
  auto_absent_if_no_punchin: true,
  weekend_days: ["sunday"],
  overtime_message_enabled: true,
  overtime_message_text: "You've been working past your scheduled hours. Great dedication — don't forget to rest!",
  early_punch_in_minutes: 60,
};

export async function getSettings<T>(key: string): Promise<T | null> {
  try {
    const rows = await sql`
      SELECT value FROM app_settings
      WHERE key = ${key}
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    return rows[0].value as T;
  } catch (error) {
    console.error(`Error fetching settings for key "${key}":`, error);
    return null;
  }
}

export async function getStudentAttendanceSettings(): Promise<StudentAttendanceSettings> {
  const settings = await getSettings<StudentAttendanceSettings>("student_attendance");
  return settings || DEFAULT_STUDENT_ATTENDANCE_SETTINGS;
}

export interface StudentLeaveFineSettings {
  enabled: boolean;
  free_leaves_per_period: number;
  fine_amount: number;
  fine_period: "monthly" | "yearly";
  fine_on: "approved" | "applied";
  absent_fine_enabled: boolean;
  absent_fine_rule: "direct_fine" | "use_balance";
  absent_fine_amount: number;
}

export const DEFAULT_LEAVE_FINE_SETTINGS: StudentLeaveFineSettings = {
  enabled: false,
  free_leaves_per_period: 2,
  fine_amount: 500,
  fine_period: "monthly",
  fine_on: "approved",
  absent_fine_enabled: false,
  absent_fine_rule: "use_balance",
  absent_fine_amount: 200,
};

export async function getStudentLeaveFineSettings(): Promise<StudentLeaveFineSettings> {
  const settings = await getSettings<StudentLeaveFineSettings>("student_leave_fines");
  return { ...DEFAULT_LEAVE_FINE_SETTINGS, ...(settings ?? {}) };
}

export async function upsertSettings(
  key: string,
  category: string,
  value: object,
  adminId: string,
  description?: string
): Promise<void> {
  await sql`
    INSERT INTO app_settings (category, key, value, description, updated_by, updated_at)
    VALUES (${category}, ${key}, ${JSON.stringify(value)}::jsonb, ${description || null}, ${adminId}, NOW())
    ON CONFLICT (key)
    DO UPDATE SET
      value = EXCLUDED.value,
      description = COALESCE(EXCLUDED.description, app_settings.description),
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
  `;
}
