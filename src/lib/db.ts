/**
 * lib/db.ts — NeonDB serverless client.
 * Import `sql` wherever you need to query the database (server-side only).
 */
import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.NEON_DATABASE_URL!);
