"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import type { Employee } from "@/types"
import {
  createEmployee,
  updateEmployee,
  grantAdminAccess,
  presignDocument,
  confirmDocument,
  deleteDocument,
  bulkDeleteDocuments,
  uploadToS3,
} from "@/lib/services/employee-service"
import {
  MANDATORY_DOCS,
  CERT_SLOTS,
  FileSlot,
  OtherDoc,
} from "@/components/admin/employees/employee-form/types"

export function useEmployeeForm() {
  const router = useRouter()

  const uploadSingleFile = useCallback(
    async (file: File, docType: string): Promise<{ s3Key: string; error?: string }> => {
      try {
        const { presignedUrl, s3Key } = await presignDocument(
          docType,
          file.name,
          file.type,
          file.size
        )
        await uploadToS3(presignedUrl, file)
        return { s3Key }
      } catch (err) {
        console.error(`[uploadSingleFile] ${docType}:`, err)
        return { s3Key: "", error: err instanceof Error ? err.message : "Upload failed" }
      }
    },
    []
  )

  const deleteSingleFile = useCallback(async (s3Key?: string) => {
    if (!s3Key) return
    try {
      await deleteDocument(s3Key)
    } catch (err) {
      console.error("[deleteSingleFile] Error:", err)
    }
  }, [])

  const handleCancel = useCallback(
    async (
      uploadedKeys: string[],
      profilePhotoKey: string,
      originalProfilePhotoKey?: string
    ) => {
      const s3KeysToDelete = [...uploadedKeys]
      if (profilePhotoKey && originalProfilePhotoKey !== profilePhotoKey) {
        s3KeysToDelete.push(profilePhotoKey)
      }

      if (s3KeysToDelete.length > 0) {
        toast.info("Cleaning up uploaded files...")
        await Promise.allSettled(s3KeysToDelete.map((key) => deleteSingleFile(key)))
      }
      router.back()
    },
    [router, deleteSingleFile]
  )

  return {
    uploadSingleFile,
    deleteSingleFile,
    handleCancel,
  }
}

async function confirmAllDocs(
  employeeId: string,
  mandatoryFiles: Record<string, FileSlot>,
  certFiles: Record<string, FileSlot>,
  otherDocs: OtherDoc[]
) {
  const queue: {
    key: string
    docType: string
    docName?: string
    file: File
    s3Key: string
  }[] = []
  for (const doc of MANDATORY_DOCS) {
    const slot = mandatoryFiles[doc.key]
    if (slot?.file && slot.s3Key && slot.status === "done") {
      queue.push({ key: doc.key, docType: doc.key, file: slot.file, s3Key: slot.s3Key })
    }
  }
  for (const slot of CERT_SLOTS) {
    const certSlot = certFiles[slot.key]
    if (certSlot?.file && certSlot.s3Key && certSlot.status === "done") {
      queue.push({ key: slot.key, docType: slot.key, file: certSlot.file, s3Key: certSlot.s3Key })
    }
  }
  for (const doc of otherDocs) {
    if (doc.file && doc.s3Key && doc.status === "done") {
      queue.push({
        key: doc.id,
        docType: "other",
        docName: doc.name || undefined,
        file: doc.file,
        s3Key: doc.s3Key,
      })
    }
  }
  if (queue.length === 0) return

  let failCount = 0
  for (const item of queue) {
    try {
      await confirmDocument(
        employeeId,
        item.docType,
        item.docName,
        item.s3Key,
        item.file.name,
        item.file.type,
        item.file.size
      )
    } catch (err) {
      console.error(`[employee-doc-confirm] ${item.docType}:`, err)
      failCount++
    }
  }
  if (failCount > 0) {
    toast.warning(`${failCount} document(s) failed to confirm in database.`)
  }
}

type SaveEmployeeParams = {
  employee?: Employee
  mandatoryFiles: Record<string, FileSlot>
  certFiles: Record<string, FileSlot>
  otherDocs: OtherDoc[]
  docsToDelete: string[]
}

export function useSaveEmployee({
  employee,
  mandatoryFiles,
  certFiles,
  otherDocs,
  docsToDelete,
}: SaveEmployeeParams) {
  const router = useRouter()
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const isEdit = !!employee

  const saveMutation = useMutation({
    mutationFn: async ({ payload, isEdit: editFlag }: { payload: any; isEdit: boolean }) => {
      if (editFlag && employee) {
        return updateEmployee(employee.id, payload)
      } else {
        return createEmployee(payload)
      }
    },
    onSuccess: async (data: any, variables) => {
      const resolvedEmployeeId = employee?.id || data.employeeId
      
      await confirmAllDocs(resolvedEmployeeId, mandatoryFiles, certFiles, otherDocs)

      if (docsToDelete.length > 0) {
        try {
          await bulkDeleteDocuments(docsToDelete)
        } catch (delErr) {
          console.error("[useSaveEmployee] Bulk delete error:", delErr)
        }
      }

      if (data.tempPassword) {
        setTempPassword(data.tempPassword)
      }

      if (variables.payload.status === "draft") {
        toast.success("Draft saved successfully.")
      } else {
        toast.success(
          isEdit ? "Employee updated." : `Employee created — code: ${data.employeeCode}`
        )
        setTimeout(() => router.push("/admin/employees"), 1500)
      }
    },
    onError: (err: any) => {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred")
    },
  })

  return {
    mutate: saveMutation.mutate,
    isPending: saveMutation.isPending,
    tempPassword,
  }
}

export function useGrantAdminAccess(employeeId?: string) {
  const router = useRouter()
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  const grantMutation = useMutation({
    mutationFn: async (roleId: string) => {
      if (!employeeId) throw new Error("Employee ID is required")
      return grantAdminAccess(employeeId, roleId)
    },
    onSuccess: (data) => {
      if (data.tempPassword) {
        setTempPassword(data.tempPassword)
      }
      toast.success("Admin access granted.")
      router.refresh()
    },
    onError: (err: any) => {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred")
    },
  })

  return {
    mutate: grantMutation.mutate,
    isPending: grantMutation.isPending,
    tempPassword,
  }
}
