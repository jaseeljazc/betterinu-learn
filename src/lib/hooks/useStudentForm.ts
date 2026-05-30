"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { createStudent, updateStudent, presignUpload, uploadToS3 } from "@/lib/services/student-service"

export function useStudentForm() {
  const queryClient = useQueryClient()

  const uploadFile = async (file: File): Promise<string> => {
    const { presignedUrl, publicUrl } = await presignUpload(
      file.name,
      file.type,
      file.size
    )
    await uploadToS3(presignedUrl, file)
    return publicUrl
  }

  const saveMutation = useMutation({
    mutationFn: async ({ payload, isEdit, id }: { payload: any; isEdit: boolean; id?: string }) => {
      if (isEdit && id) {
        return updateStudent(id, payload)
      } else {
        return createStudent(payload)
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate queries so listing/details are refreshed
      queryClient.invalidateQueries({ queryKey: ["students"] })
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: ["student", variables.id] })
      }
    },
    onError: (err: any) => {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred")
    },
  })

  return {
    uploadFile,
    saveStudent: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  }
}
