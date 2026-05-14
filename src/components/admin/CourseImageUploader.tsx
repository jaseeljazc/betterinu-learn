"use client";

import { useRef, useState } from "react";
import { ImageIcon, Upload, X, Loader2 } from "lucide-react";

interface CourseImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
}

export function CourseImageUploader({ value, onChange }: CourseImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }

    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "courses/thumbnails");

      const res = await fetch("/api/upload?role=admin", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      onChange(data.url);
    } catch (err: any) {
      setError(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {value ? (
        <div className="relative group w-full max-w-sm rounded-xl overflow-hidden border border-default shadow-sm">
          <img src={value} alt="Course thumbnail" className="w-full h-44 object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 bg-white text-sm font-semibold px-3 py-1.5 rounded-lg text-primary hover:bg-gray-50"
            >
              <Upload className="size-4" /> Replace
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="flex items-center gap-1.5 bg-red-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-red-600"
            >
              <X className="size-4" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-2 w-full max-w-sm h-44 rounded-xl border-2 border-dashed border-default bg-surface hover:border-primary hover:bg-primary/5 transition-colors text-muted disabled:opacity-60"
        >
          {uploading ? (
            <><Loader2 className="size-6 animate-spin" /><span className="text-sm">Uploading...</span></>
          ) : (
            <><ImageIcon className="size-8" /><span className="text-sm font-medium">Click to upload thumbnail</span><span className="text-xs">PNG, JPG, WEBP — max 5 MB</span></>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}