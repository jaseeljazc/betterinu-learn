import { apiClient } from "../api-client"

export async function createEmployee(payload: any) {
  return apiClient<{ employeeId: string; employeeCode: string; tempPassword?: string }>(
    "/api/admin/employees",
    {
      method: "POST",
      body: payload,
    }
  )
}

export async function updateEmployee(id: string, payload: any) {
  return apiClient<{ ok: boolean }>(`/api/admin/employees/${id}`, {
    method: "PATCH",
    body: payload,
  })
}

export async function grantAdminAccess(employeeId: string, roleId: string) {
  return apiClient<{ ok: boolean; tempPassword?: string }>(
    `/api/admin/employees/${employeeId}/admin-account`,
    {
      method: "POST",
      body: { roleId },
    }
  )
}

export async function presignDocument(
  docType: string,
  fileName: string,
  fileType: string,
  fileSize: number
) {
  return apiClient<{ presignedUrl: string; s3Key: string }>(
    "/api/admin/employees/documents/presign",
    {
      method: "POST",
      body: { employeeId: null, docType, fileName, fileType, fileSize },
    }
  )
}

export async function confirmDocument(
  employeeId: string,
  docType: string,
  docName: string | undefined,
  s3Key: string,
  fileName: string,
  fileType: string,
  fileSize: number
) {
  return apiClient<{ ok: boolean }>("/api/admin/employees/documents/confirm", {
    method: "POST",
    body: { employeeId, docType, docName, s3Key, fileName, fileType, fileSize },
  })
}

export async function deleteDocument(s3Key: string) {
  return apiClient<{ ok: boolean }>("/api/admin/employees/documents/delete-pending", {
    method: "DELETE",
    body: { s3Key },
  })
}

export async function bulkDeleteDocuments(s3Keys: string[]) {
  return apiClient<{ ok: boolean }>("/api/admin/employees/documents/delete", {
    method: "POST",
    body: { s3Keys },
  })
}

export async function uploadToS3(presignedUrl: string, file: File): Promise<void> {
  const res = await fetch(presignedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  })
  if (!res.ok && res.status !== 0) {
    throw new Error(`S3 upload failed: HTTP ${res.status}`)
  }
}
