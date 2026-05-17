"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Code2, Eye } from "lucide-react";
import "react-quill-new/dist/quill.snow.css";

// Dynamically import ReactQuill to prevent SSR issues
const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div className="h-40 w-full animate-pulse bg-subtle rounded-md border border-default" />
  ),
});

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: RichTextEditorProps) {
  const [mode, setMode] = useState<"visual" | "html">("visual");

  // Memoize modules to prevent Quill from re-rendering and losing focus
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        [{ size: ["small", false, "large", "huge"] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ align: [] }],
        ["link", "code-block"],
        ["clean"],
      ],
    }),
    [],
  );

  return (
    <div className="rich-text-editor w-full rounded-lg border border-default relative">
      {/* Toolbar toggle */}
      <div className="flex items-center justify-end gap-1 bg-subtle border-b border-default px-2 py-1 rounded-t-lg">
        <span className="text-xs text-muted mr-auto">Document Editor</span>
        <button
          type="button"
          onClick={() => setMode("visual")}
          className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold transition-colors ${
            mode === "visual"
              ? "bg-white text-primary shadow-sm border border-default"
              : "text-muted hover:text-primary"
          }`}
        >
          <Eye className="size-3" />
          Visual
        </button>
        <button
          type="button"
          onClick={() => setMode("html")}
          className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold transition-colors ${
            mode === "html"
              ? "bg-white text-primary shadow-sm border border-default"
              : "text-muted hover:text-primary"
          }`}
        >
          <Code2 className="size-3" />
          HTML
        </button>
      </div>

      {mode === "visual" ? (
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          placeholder={placeholder || "Start typing..."}
        />
      ) : (
        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste raw HTML here..."
            className="w-full min-h-[220px] font-mono text-sm p-4 bg-[#1e1e2e] text-[#cdd6f4] outline-none resize-y border-0"
            spellCheck={false}
          />
          <span className="absolute bottom-2 right-3 text-[10px] text-muted font-mono opacity-60">
            HTML source
          </span>
        </div>
      )}
    </div>
  );
}
