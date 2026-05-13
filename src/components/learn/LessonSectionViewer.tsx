"use client";

import { ExternalLink, FileText, Link2, Layers, CheckSquare } from "lucide-react";
import type { LessonSection } from "@/types";

function preprocessHtml(html: string): string {
  return html;
}

function getYouTubeId(url: string): string | null {
  const regexes = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ];
  for (const re of regexes) {
    const match = url.match(re);
    if (match) return match[1];
  }
  return null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

function VideoRenderer({ url, title }: { url: string; title?: string }) {
  const ytId = getYouTubeId(url);
  const vimeoId = getVimeoId(url);

  if (ytId) {
    return (
      <div className="space-y-2 w-full">
        {title && <h3 className="font-semibold text-foreground text-sm">{title}</h3>}
        <div className="relative overflow-hidden rounded-xl border border-default shadow-sm" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 size-full"
            title={title ?? "Video"}
          />
        </div>
      </div>
    );
  }

  if (vimeoId) {
    return (
      <div className="space-y-2 w-full">
        {title && <h3 className="font-semibold text-foreground text-sm">{title}</h3>}
        <div className="relative overflow-hidden rounded-xl border border-default shadow-sm" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}`}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 size-full"
            title={title ?? "Video"}
          />
        </div>
      </div>
    );
  }

  // Direct video file
  return (
    <div className="space-y-2 w-full">
      {title && <h3 className="font-semibold text-foreground text-sm">{title}</h3>}
      <video controls className="w-full rounded-xl border border-default shadow-sm" src={url}>
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

export function SectionBlock({ section }: { section: LessonSection }) {
  // Helpers to get align classes
  const getAlignClass = (align: "left" | "center" | "right" | undefined, isText = false) => {
    if (align === "left") return isText ? "text-left" : "mr-auto ml-0";
    if (align === "right") return isText ? "text-right" : "ml-auto mr-0";
    if (align === "center") return isText ? "text-center" : "mx-auto";
    return isText ? "text-left" : "mx-auto"; // Defaults
  };

  const getFlexAlign = (align: "left" | "center" | "right" | undefined) => {
    if (align === "left") return "justify-start";
    if (align === "right") return "justify-end";
    if (align === "center") return "justify-center";
    return "justify-start";
  };

  const getFlexItemAlign = (align: "left" | "center" | "right" | undefined) => {
    if (align === "left") return "items-start";
    if (align === "right") return "items-end";
    if (align === "center") return "items-center";
    return "items-center";
  };

  switch (section.type) {
    case "rich_text":
      return (
        <div className={`px-5 py-4 ${getAlignClass(section.align, true)}`}>
          <div
            className="rich-content text-secondary leading-snug block w-full text-left"
            dangerouslySetInnerHTML={{ __html: preprocessHtml(section.content) }}
          />
        </div>
      );

    case "image": {
      const sizeMap = {
        sm: "w-[30%] min-w-[240px]",
        md: "w-[50%] min-w-[320px]",
        lg: "w-[75%] min-w-[480px]",
        full: "w-full",
      };
      const currentSizeCls = sizeMap[section.size || "full"] || "w-full";
      
      return (
        <figure className={`px-5 py-4 flex flex-col ${getFlexItemAlign(section.align)}`}>
          {section.url ? (
            <img
              src={section.url}
              alt={section.caption ?? "Lesson image"}
              crossOrigin="anonymous"
              className={`${currentSizeCls} ${getAlignClass(section.align)} max-h-[75vh] object-contain rounded-xl border border-default bg-checkerboard`}
              loading="lazy"
            />
          ) : (
            <div className={`h-32 bg-subtle border border-dashed border-default flex items-center justify-center text-muted text-xs rounded-xl ${currentSizeCls}`}>
              Image section
            </div>
          )}
          {section.caption && (
            <figcaption className={`mt-2 text-xs text-muted italic w-full ${currentSizeCls} ${getAlignClass(section.captionAlign || section.align, true)}`}>
              {section.caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case "video": {
      const sizeMap = {
        sm: "w-[40%] min-w-[280px]",
        md: "w-[60%] min-w-[400px]",
        lg: "w-[80%] min-w-[600px]",
        full: "w-full",
      };
      const currentSizeCls = sizeMap[((section as any).size as keyof typeof sizeMap) || "lg"] || "w-[80%] min-w-[600px]"; // lg is default
      return (
        <div className={`px-5 py-4 flex ${getFlexAlign(section.align)}`}>
          <div className={`${currentSizeCls} ${getAlignClass(section.align)}`}>
            <VideoRenderer url={section.url} title={section.title} />
          </div>
        </div>
      );
    }

    case "pdf":
      return (
        <div className={`px-3 py-2 flex ${getFlexAlign(section.align)}`}>
  <div className="flex items-center gap-2 rounded-lg border border-default bg-surface px-3 py-2 max-w-[260px] w-full shadow-sm">
    
    <div className="flex size-8 items-center justify-center rounded-md bg-red-50 border border-red-100 shrink-0">
      <FileText className="size-4 text-red-500" />
    </div>

    <div className="flex-1 min-w-0">
      <p className="font-medium text-foreground text-sm truncate">
        {section.filename || "Document"}
      </p>

      <p className="text-[9px] uppercase font-semibold tracking-wide text-muted">
        PDF
      </p>
    </div>

    <a
      href={section.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-100 transition-colors shrink-0"
    >
      <ExternalLink className="size-3" />
      View
    </a>
  </div>
</div>
      );

    case "link":
      return (
        <div className={`px-5 py-4 flex ${getFlexAlign(section.align)}`}>
          <a
            href={section.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-4 rounded-xl border border-default bg-surface px-5 py-4 hover:border-primary hover:shadow-sm transition-all max-w-2xl w-full"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-50 border border-teal-100 shrink-0 mt-0.5">
              <Link2 className="size-5 text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                {section.title}
              </p>
              {section.description && (
                <p className="text-xs text-muted mt-1 leading-relaxed">{section.description}</p>
              )}
              <p className="text-[10px] text-muted/70 mt-1.5 truncate">{section.url}</p>
            </div>
            <ExternalLink className="size-4 text-muted group-hover:text-primary shrink-0 mt-1 transition-colors" />
          </a>
        </div>
      );

    case "task":
      return (
        <div className="px-5 py-6 bg-indigo-50/30">
          <div className={`max-w-2xl space-y-4 border border-indigo-100 bg-white rounded-xl p-5 shadow-sm ${getAlignClass(section.align)}`}>
            <div className="flex items-center gap-3 border-b border-indigo-50 pb-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-100 shrink-0">
                <CheckSquare className="size-4 text-indigo-700" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">{section.title}</h3>
                {section.deadline && (
                  <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 mt-1">Due: {new Date(section.deadline).toLocaleString()}</p>
                )}
              </div>
            </div>
            {section.description && (
              <div className="text-sm text-muted leading-relaxed" dangerouslySetInnerHTML={{ __html: preprocessHtml(section.description) }} />
            )}
            <div className="pt-2">
              <button type="button" className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors">
                {section.submissionType === 'file' ? 'Upload Submission' : section.submissionType === 'url' ? 'Submit Link' : 'Write Response'}
              </button>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}

interface LessonSectionViewerProps {
  sections: LessonSection[];
  pagePadding?: "none" | "sm" | "md" | "lg" | "xl";
}

export function LessonSectionViewer({ sections, pagePadding }: LessonSectionViewerProps) {
  if (!sections || sections.length === 0) return null;

  const paddingCls = pagePadding === "sm" ? "px-4 sm:px-8" :
                     pagePadding === "md" ? "px-6 sm:px-12" :
                     pagePadding === "lg" ? "px-8 sm:px-16 lg:px-24" :
                     pagePadding === "xl" ? "px-10 sm:px-20 lg:px-32" : "";

  return (
    <div className={`rounded-xl border border-default bg-surface overflow-hidden flex flex-col divide-y divide-default/30 ${paddingCls}`}>
      {sections.map((section) => (
        <SectionBlock key={section.id} section={section} />
      ))}
    </div>
  );
}
