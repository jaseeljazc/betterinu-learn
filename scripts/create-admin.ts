import { neon } from "@neondatabase/serverless";
import { adminAuth } from "../src/lib/firebase-admin";

const sql = neon(process.env.NEON_DATABASE_URL!);

async function createAdmin() {
  const email = "admin@betterinu.app";
  const password = "BetterinuAdmin123!"; // You can change this
  const name = "Betterinu Admin";

  console.log(`Creating admin user: ${email}...`);

  try {
    // 1. Create user in Firebase
    let firebaseUid;
    try {
      const userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: name,
      });
      firebaseUid = userRecord.uid;
      console.log(`✓ Firebase user created (UID: ${firebaseUid})`);
    } catch (err: any) {
      if (err.code === "auth/email-already-exists") {
        console.log("! Firebase user already exists, fetching UID...");
        const userRecord = await adminAuth.getUserByEmail(email);
        firebaseUid = userRecord.uid;
        // Optionally update the password to ensure we know it
        await adminAuth.updateUser(firebaseUid, { password });
      } else {
        throw err;
      }
    }

    // 2. Insert into NeonDB admins table
    await sql`
      INSERT INTO admins (email, firebase_uid)
      VALUES (${email}, ${firebaseUid})
      ON CONFLICT (email) DO NOTHING
    `;
    console.log(`✓ Admin inserted into NeonDB`);

    console.log("\n=================================");
    console.log("🎉 Admin credentials ready!");
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log("=================================\n");
  } catch (error) {
    console.error("Failed to create admin:", error);
  }
}

createAdmin();
