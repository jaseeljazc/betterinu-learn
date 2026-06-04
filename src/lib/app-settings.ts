import { sql } from "@/lib/db";

export interface StudentAttendanceSettings {
  work_start_time: string;           // "HH:MM" e.g., "09:00"
  work_end_time: string;             // "HH:MM" e.g., "18:00"
  grace_period_minutes: number;
  late_after_minutes: number;
  half_day_min_hours: number;        // must stay ≥ this to count as Full Day (else Half Day)
  min_hours_for_half_day: number;   // must stay ≥ this to count as Half Day (else Absent)
  auto_absent_if_no_punchin: boolean;
  weekend_days: string[];            // e.g. ["sunday"]
  overtime_message_enabled: boolean; // show banner when student is punched in past work_end_time
  overtime_message_text: string;     // the configurable banner text shown to the student
}

export const DEFAULT_STUDENT_ATTENDANCE_SETTINGS: StudentAttendanceSettings = {
  work_start_time: "09:00",
  work_end_time: "18:00",
  grace_period_minutes: 15,
  late_after_minutes: 15,
  half_day_min_hours: 4,
  min_hours_for_half_day: 2,
  auto_absent_if_no_punchin: true,
  weekend_days: ["sunday"],
  overtime_message_enabled: true,
  overtime_message_text: "You've been working past your scheduled hours. Great dedication — don't forget to rest!",
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
