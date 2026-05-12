"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { adminAuth } from "@/lib/firebase-admin";
import { generatePassword } from "@/lib/password";
import { sendWelcomeEmail } from "@/lib/email";
import { verifyAdminToken } from "@/lib/auth";

export async function createStudentAction(prevState: any, formData: FormData) {
  // 1. Security Check
  const cookieStore = await cookies();
  const token = cookieStore.get("__session")?.value;
  if (!token) return { error: "Unauthorised." };
  
  const admin = await verifyAdminToken(token);
  if (!admin) return { error: "Unauthorised. Admin only." };

  // 2. Validate input
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const phone_number = formData.get("phone_number")?.toString().trim();
  const gender = formData.get("gender")?.toString().trim();
  const dob = formData.get("dob")?.toString().trim() || null;
  const address = formData.get("address")?.toString().trim();
  const student_code = formData.get("student_code")?.toString().trim().toUpperCase();
  const enrollment_date = formData.get("enrollment_date")?.toString().trim() || null;
  
  // Can get multiple course IDs if it's a multi-select or multiple checkboxes
  const courseIds = formData.getAll("courseIds").map(id => id.toString()).filter(Boolean);

  if (!name || !email) return { error: "Name and email are required." };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { error: "Invalid email format." };

  try {
    // 3. Check for duplicates in DB FIRST (before Firebase)
    const existingEmail = await sql`SELECT id FROM students WHERE email = ${email}`;
    if (existingEmail.length > 0) return { error: "A student with this email already exists." };
    
    // 3. Handle Student Code (Auto-generate if missing)
    let finalStudentCode = student_code;
    if (!finalStudentCode) {
      const year = new Date().getFullYear();
      let unique = false;
      while (!unique) {
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        finalStudentCode = `STU-${year}-${random}`;
        const check = await sql`SELECT id FROM students WHERE student_code = ${finalStudentCode}`;
        if (check.length === 0) unique = true;
      }
    } else {
      const existingCode = await sql`SELECT id FROM students WHERE student_code = ${finalStudentCode}`;
      if (existingCode.length > 0) return { error: "A student with this Student Code already exists." };
    }

    // 4. Generate temporary password
    const password = generatePassword();
    
    // 5. Create Firebase User
    let firebaseUid;
    try {
      const userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: name,
        emailVerified: false,
      });
      firebaseUid = userRecord.uid;
    } catch (fbError: any) {
      return { error: fbError.message || "Failed to create identity in Firebase." };
    }

    // 6. Database Transaction (Profile & Enrollment)
    let studentId;
    try {
      const insertStudent = await sql`
        INSERT INTO students (
          name, email, firebase_uid, phone_number, gender, dob, address, student_code, enrollment_date
        )
        VALUES (
          ${name}, ${email}, ${firebaseUid}, ${phone_number}, ${gender}, ${dob}, ${address}, ${finalStudentCode}, ${enrollment_date}
        )
        RETURNING id
      `;
      studentId = insertStudent[0].id;

      // Create enrollments if requested
      for (const courseId of courseIds) {
        await sql`
          INSERT INTO student_courses (student_id, course_id)
          VALUES (${studentId}, ${courseId})
          ON CONFLICT DO NOTHING
        `;
      }
    } catch (dbError: any) {
      // CRITICAL ROLLBACK: Delete Firebase user if DB fails
      console.error("DB Error:", dbError);
      await adminAuth.deleteUser(firebaseUid).catch(console.error);
      return { error: "Database transaction failed. User creation rolled back." };
    }

    // 7. Send Welcome Email
    let emailSent = false;
    try {
      await sendWelcomeEmail({ name, email, password });
      emailSent = true;
    } catch (emailError) {
      console.error("Welcome email failed to send:", emailError);
      // We don't fail the whole action, we just flag it
    }

    // 8. Revalidate paths
    revalidatePath("/admin/students");

    // 9. Return success state (including manual fallback data if email failed)
    return {
      success: true,
      studentId,
      emailSent,
      manualData: emailSent ? null : { email, password },
    };

  } catch (err: any) {
    return { error: "An unexpected error occurred." };
  }
}
