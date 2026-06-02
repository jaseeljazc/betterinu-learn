// Quick diagnostic script — run with: npx tsx scripts/delete-firebase-user.ts
import { config } from "dotenv"
import * as admin from "firebase-admin"

config({ path: ".env.local" })

async function main() {
  const email = "they66556@gmail.com"
  console.log(`\n=== Deleting Firebase User: ${email} ===`)

  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    if (!serviceAccountKey) {
      throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_KEY in .env.local")
    }

    const serviceAccount = JSON.parse(serviceAccountKey)
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      })
    }
    
    const auth = admin.auth()
    
    try {
      const user = await auth.getUserByEmail(email)
      console.log(`Found user: ${user.uid}`)
      
      await auth.deleteUser(user.uid)
      console.log(`✅ Successfully deleted user ${user.uid} (${email}) from Firebase Auth.`)
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        console.log(`⚠️ User with email ${email} was not found in Firebase Auth.`)
      } else {
        throw e
      }
    }

  } catch (error) {
    console.error("Error:", error)
  }
}

main().catch(console.error)
