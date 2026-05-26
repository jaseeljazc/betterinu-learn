import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/admin-rbac";
import { verifyObjectExists, validateEmployeeDocS3Key, ALLOWED_TYPES } from "@/lib/s3-private";

const VALID_DOC_TYPES = [
  "aadhaar", "pan", "passbook",
  "sslc", "plusTwo", "degree", "pg",
  "other",
] as const;

/**
 * POST /api/admin/employees/documents/confirm
 * Called after a successful S3 PUT to register the document in the DB.
 *
 * Body: {
 *   employeeId: string,
 *   docType: string,
 *   docName?: string,       // required when docType === 'other'
 *   s3Key: string,
 *   fileName: string,
 *   fileType: string,
 *   fileSize: number,
 * }
 * Response: { ok: true, documentId: string }
 */
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "employees", "create");
  const authEdit = auth instanceof NextResponse
    ? await requirePermission(req, "employees", "edit")
    : auth;
  if (auth instanceof NextResponse && authEdit instanceof NextResponse) return auth;

  const resolvedAuth = auth instanceof NextResponse ? authEdit : auth;
  if (resolvedAuth instanceof NextResponse) return resolvedAuth;

  const body = await req.json();
  const { employeeId, docType, docName, s3Key, fileName, fileType, fileSize } = body;

  // Validate required fields
  if (!employeeId) return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
  if (!docType) return NextResponse.json({ error: "docType is required" }, { status: 400 });
  if (!s3Key || !fileName || !fileType || !fileSize) {
    return NextResponse.json({ error: "s3Key, fileName, fileType, and fileSize are required" }, { status: 400 });
  }

  // Validate doc type
  if (!(VALID_DOC_TYPES as readonly string[]).includes(docType)) {
    return NextResponse.json({ error: `Invalid docType: ${docType}` }, { status: 400 });
  }

  // Validate S3 key pattern (prevents path traversal)
  if (!validateEmployeeDocS3Key(s3Key)) {
    return NextResponse.json({ error: "Invalid S3 key format" }, { status: 400 });
  }

  // Validate MIME type
  if (!ALLOWED_TYPES.includes(fileType)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }

  // Verify the upload actually landed in S3
  const exists = await verifyObjectExists(s3Key);
  if (!exists) {
    return NextResponse.json(
      { error: "File not found in S3. Upload may have failed." },
      { status: 400 }
    );
  }

  // Check employee exists
  const empRows = await sql`SELECT id FROM employees WHERE id = ${employeeId} LIMIT 1`;
  if (!empRows.length) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const adminId = resolvedAuth.adminId === "super_admin_bootstrap" ? null : resolvedAuth.adminId;

  const rows = await sql`
    INSERT INTO employee_documents
      (employee_id, doc_type, doc_name, s3_key, file_name, file_type, file_size, uploaded_by)
    VALUES
      (${employeeId}, ${docType}, ${docName ?? null}, ${s3Key}, ${fileName}, ${fileType}, ${fileSize}, ${adminId})
    RETURNING id
  `;

  return NextResponse.json({ ok: true, documentId: rows[0].id }, { status: 201 });
}
