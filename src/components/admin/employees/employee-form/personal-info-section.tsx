"use client"

import React from "react"
import { User, Mail, Phone, MapPin, ChevronUp, ChevronDown, Search, X, Loader2 } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DatePickerField } from "./date-picker-field"
import { inputCls, textareaCls, labelCls, EmergencyContact } from "./types"

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-2 border-b border-default">
      <Icon className="size-4 text-primary" />
      <h3 className="font-bold text-base text-foreground">{title}</h3>
    </div>
  )
}

function OptionalTag() {
  return <span className="text-xs font-normal text-muted ml-1">(optional)</span>
}

type PersonalInfoSectionProps = {
  fullName: string
  setFullName: (val: string) => void
  email: string
  setEmail: (val: string) => void
  phone: string
  setPhone: (val: string) => void
  gender: string
  setGender: (val: string) => void
  dob: string
  setDob: (val: string) => void
  address: string
  setAddress: (val: string) => void
  isEdit: boolean
  isDraft: boolean
  
  // Profile Photo state & handlers
  profilePhotoUrl: string
  profilePhotoKey: string
  photoUploading: boolean
  photoInputRef: React.RefObject<HTMLInputElement | null>
  handlePhotoChange: (file: File | null) => void
  handleRemovePhoto: () => void

  // Reporting Manager state & handlers
  reportingManagerId: string
  setReportingManagerId: (val: string) => void
  managerSearch: string
  setManagerSearch: (val: string) => void
  managerOpen: boolean
  setManagerOpen: (val: boolean) => void
  managerInputRef: React.RefObject<HTMLInputElement | null>
  filteredManagers: { id: string; fullName: string }[]
  managersLoading: boolean
  selectManager: (id: string, name: string) => void
  clearManager: () => void

  // Emergency Contact state & handlers
  emergencyOpen: boolean
  setEmergencyOpen: React.Dispatch<React.SetStateAction<boolean>>
  emergency: EmergencyContact
  setEmergency: React.Dispatch<React.SetStateAction<EmergencyContact>>
}

export function PersonalInfoSection({
  fullName,
  setFullName,
  email,
  setEmail,
  phone,
  setPhone,
  gender,
  setGender,
  dob,
  setDob,
  address,
  setAddress,
  isEdit,
  isDraft,

  // Profile Photo props
  profilePhotoUrl,
  profilePhotoKey,
  photoUploading,
  photoInputRef,
  handlePhotoChange,
  handleRemovePhoto,

  // Reporting Manager props
  reportingManagerId,
  setReportingManagerId,
  managerSearch,
  setManagerSearch,
  managerOpen,
  setManagerOpen,
  managerInputRef,
  filteredManagers,
  managersLoading,
  selectManager,
  clearManager,

  // Emergency Contact props
  emergencyOpen,
  setEmergencyOpen,
  emergency,
  setEmergency,
}: PersonalInfoSectionProps) {
  return (
    <section className="rounded-md border border-default bg-white p-6 space-y-5">
      <SectionHeader icon={User} title="Personal Information" />

      {/* Profile Photo Upload */}
      <div className="flex flex-col sm:flex-row items-center gap-5 pb-4 border-b border-default border-dashed">
        <div className="relative group">
          {profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profilePhotoUrl}
              alt="Profile Photo"
              className="size-24 rounded-md object-cover ring-4 ring-white shadow-md"
            />
          ) : (
            <div className="size-24 rounded-md bg-primary/10 text-primary font-bold text-2xl flex items-center justify-center ring-4 ring-white shadow-md">
              {fullName ? (
                fullName
                  .split(" ")
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
              ) : (
                <User className="size-8" />
              )}
            </div>
          )}
          {photoUploading && (
            <div className="absolute inset-0 rounded-md bg-black/40 flex items-center justify-center text-white">
              <Loader2 className="size-6 animate-spin" />
            </div>
          )}
        </div>
        <div className="space-y-1.5 text-center sm:text-left">
          <h4 className="font-bold text-sm text-foreground">Profile Photo</h4>
          <p className="text-xs text-muted">JPEG, PNG or WEBP · max 5 MB</p>
          <div className="flex items-center justify-center sm:justify-start gap-2.5 mt-2">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              className="rounded-md border border-default bg-white px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-subtle transition-colors disabled:opacity-50 cursor-pointer"
            >
              Upload Photo
            </button>
            {profilePhotoKey && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={photoUploading}
                className="rounded-md border border-default bg-white px-3 py-1.5 text-xs font-semibold text-danger-500 hover:bg-danger-50 hover:border-danger-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Remove
              </button>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-6 gap-5">
        <div className="sm:col-span-3">
          <label className={labelCls}>Full Name *</label>
          <input
            required={!isDraft}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputCls}
            placeholder="Enter your full name"
          />
        </div>
        <div className="sm:col-span-3">
          <div className="flex flex-wrap items-center justify-between mb-1.5 gap-x-2 gap-y-1">
            <label className="block text-sm font-semibold text-foreground">Email *</label>
            {isEdit && (
              <span className="text-[11px] text-muted font-medium">
                Email cannot be modified after employee creation.
              </span>
            )}
          </div>
          <div className="relative">
            <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted pointer-events-none" />
            <input
              required={!isDraft}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${inputCls} pl-8`}
              placeholder="name@company.com"
              disabled={isEdit}
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>
            Phone<OptionalTag />
          </label>
          <div className="relative">
            <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted pointer-events-none" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`${inputCls} pl-8`}
              placeholder="+91 98765 43210"
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>
            Gender<OptionalTag />
          </label>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
              <SelectValue placeholder="— Select —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
              <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>
            Date of Birth<OptionalTag />
          </label>
          <DatePickerField value={dob} onChange={setDob} placeholder="Pick date of birth" />
        </div>
        <div className="sm:col-span-6">
          <label className={labelCls}>
            Address<OptionalTag />
          </label>
          <div className="relative">
            <MapPin className="absolute left-2.5 top-3 size-3.5 text-muted pointer-events-none" />
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className={`${textareaCls} pl-8 resize-none`}
              placeholder="Street, City, State, PIN"
            />
          </div>
        </div>
        
        {/* Reporting Manager */}
        <div className="sm:col-span-6">
          <label className={labelCls}>
            Reporting Manager<OptionalTag />
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted pointer-events-none" />
            <input
              ref={managerInputRef}
              type="text"
              value={managerSearch}
              onChange={(e) => {
                setManagerSearch(e.target.value)
                setManagerOpen(true)
                if (!e.target.value) setReportingManagerId("")
              }}
              onFocus={() => setManagerOpen(true)}
              onBlur={() => setTimeout(() => setManagerOpen(false), 150)}
              className={`${inputCls} pl-8 pr-8`}
              placeholder={managersLoading ? "Loading employees…" : "Search by name…"}
            />
            {reportingManagerId && (
              <button
                type="button"
                onClick={clearManager}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
              >
                <X className="size-3.5" />
              </button>
            )}
            {managerOpen && filteredManagers.length > 0 && (
              <ul className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border border-default bg-white shadow-md max-h-48 overflow-y-auto">
                {filteredManagers.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onMouseDown={() => selectManager(m.id, m.fullName)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-elevated transition-colors"
                    >
                      {m.fullName}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="sm:col-span-6">
          <button
            type="button"
            onClick={() => setEmergencyOpen((p) => !p)}
            className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2 hover:text-primary transition-colors"
          >
            {emergencyOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            Emergency Contact<OptionalTag />
          </button>
          {emergencyOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-md border border-default bg-elevated p-4">
              <div>
                <label className={labelCls}>
                  Contact Name<OptionalTag />
                </label>
                <input
                  value={emergency.name}
                  onChange={(e) => setEmergency((p) => ({ ...p, name: e.target.value }))}
                  className={inputCls}
                  placeholder="Enter the name "
                />
              </div>
              <div>
                <label className={labelCls}>
                  Relationship<OptionalTag />
                </label>
                <Select
                  value={emergency.relationship}
                  onValueChange={(v) => setEmergency((p) => ({ ...p, relationship: v }))}
                >
                  <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
                    <SelectValue placeholder="— Select —" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Father", "Mother", "Spouse", "Sibling", "Friend", "Other"].map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={labelCls}>
                  Contact Phone<OptionalTag />
                </label>
                <input
                  type="tel"
                  value={emergency.phone}
                  onChange={(e) => setEmergency((p) => ({ ...p, phone: e.target.value }))}
                  className={inputCls}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
