"use client"

import { useState } from "react"
import {
  MoreVertical,
  Pencil,
  BookOpen,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import type { StudentDetail } from "./types"
import {
  getInitials,
  STUDENT_STATUS_CFG,
} from "./types"

type StudentHeaderProps = {
  student: StudentDetail
  canEditStudent: boolean
  canDeleteStudent: boolean
  onEditClick: () => void
  onRemoveCourseClick: () => void
  onDeleteClick: () => void
  deleting: boolean
}

export function StudentHeader({
  student,
  canEditStudent,
  canDeleteStudent,
  onEditClick,
  onRemoveCourseClick,
  onDeleteClick,
  deleting,
}: StudentHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const statusCfg =
    STUDENT_STATUS_CFG[
    student.status as keyof typeof STUDENT_STATUS_CFG
    ] ?? STUDENT_STATUS_CFG.active

  return (
    <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
      <div className="flex items-center gap-5">
        <div className="relative">
          <Avatar className="size-24 ring-4 ring-white shadow-md">
            {student.profile_image_url && (
              <AvatarImage
                src={student.profile_image_url}
                alt={student.name}
                className="object-cover"
              />
            )}
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-3xl">
              {getInitials(student.name)}
            </AvatarFallback>
          </Avatar>
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {student.name}
            </h1>
            <span
              className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${statusCfg.cls}`}
            >
              {statusCfg.label}
            </span>
          </div>
          <p className="text-sm text-secondary mt-1">
            Student Code:{" "}
            {student.student_code || student.id.slice(0, 8)}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[11px] font-mono bg-subtle border border-default text-muted px-2 py-0.5 rounded-md uppercase">
              {student.student_type
                ? `${student.student_type} student`
                : "No type specified"}
            </span>
          </div>
        </div>
      </div>

      {/* Dropdown Menu button */}
      {(canEditStudent || canDeleteStudent) && (
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="inline-flex items-center gap-2 rounded-md border border-default bg-white px-5 py-2.5 text-sm font-bold text-secondary hover:bg-subtle transition-colors "
          >
            <MoreVertical className="size-4" /> Actions
          </Button>

          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-52 rounded-md border border-default bg-white shadow-lg z-50 overflow-hidden">
                {canEditStudent && (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsMenuOpen(false)
                        onEditClick()
                      }}
                      className="flex w-full justify-start items-center gap-2 px-4 py-3 text-sm font-medium text-foreground hover:bg-subtle transition-colors rounded-none"
                    >
                      <Pencil className="size-4 text-primary" />
                      Edit Student Details
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsMenuOpen(false)
                        onRemoveCourseClick()
                      }}
                      className="flex w-full justify-start items-center gap-2 px-4 py-3 text-sm font-medium text-foreground hover:bg-subtle transition-colors rounded-none"
                    >
                      <BookOpen className="size-4 text-primary" />
                      Remove Course
                    </Button>
                  </>
                )}
                {canDeleteStudent && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsMenuOpen(false)
                      onDeleteClick()
                    }}
                    disabled={deleting}
                    className="flex w-full justify-start items-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors border-t border-default rounded-none"
                  >
                    <Trash2 className="size-4 text-red-600" />
                    Delete Student
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
