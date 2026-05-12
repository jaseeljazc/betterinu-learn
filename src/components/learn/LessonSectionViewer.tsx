"use client";

import { ExternalLink, FileText, Link2, Layers } from "lucide-react";
import type { LessonSection } from "@/types";

function preprocessHtml(html: string): string {
  return html
    .replace(/<p><br\s*\/?><\/p>/gi, '<p class="ql-blank">&nbsp;</p>')
    .replace(/<br\s*\/?>/gi, "<br />");
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
      <div className="space-y-2 max-w-3xl mx-auto">
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
      <div className="space-y-2 max-w-3xl mx-auto">
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
    <div className="space-y-2 max-w-3xl mx-auto">
      {title && <h3 className="font-semibold text-foreground text-sm">{title}</h3>}
      <video controls className="w-full rounded-xl border border-default shadow-sm" src={url}>
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

function SectionBlock({ section }: { section: LessonSection }) {
  switch (section.type) {
    case "rich_text":
      return (
        <div className="px-5 py-4">
          <div
            className="rich-content text-secondary leading-relaxed"
            dangerouslySetInnerHTML={{ __html: preprocessHtml(section.content) }}
          />
        </div>
      );

    case "image": {
      const sizeMap = {
        sm: "max-w-[240px] mx-auto",
        md: "max-w-md mx-auto",
        lg: "max-w-2xl mx-auto",
        full: "w-full",
      };
      const currentSizeCls = sizeMap[section.size || "full"] || "w-full";
      
      return (
        <figure className="px-5 py-4 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={section.url}
            alt={section.caption ?? "Lesson image"}
            crossOrigin="anonymous"
            className={`${currentSizeCls} max-h-[560px] object-contain rounded-xl border border-default bg-checkerboard`}
            loading="lazy"
          />
          {section.caption && (
            <figcaption className="mt-2 text-xs text-muted text-center italic">
              {section.caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case "video":
      return (
        <div className="px-5 py-4">
          <VideoRenderer url={section.url} title={section.title} />
        </div>
      );

    case "pdf":
      return (
        <div className="px-5 py-4">
          <div className="flex items-center gap-4 rounded-xl border border-default bg-surface px-5 py-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-red-50 border border-red-100 shrink-0">
              <FileText className="size-6 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">
                {section.filename || "Document"}
              </p>
              <p className="text-xs text-muted mt-0.5">PDF Document</p>
            </div>
            <a
              href={section.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors shrink-0"
            >
              <ExternalLink className="size-3.5" />
              View PDF
            </a>
          </div>
        </div>
      );

    case "link":
      return (
        <div className="px-5 py-4">
          <a
            href={section.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-4 rounded-xl border border-default bg-surface px-5 py-4 hover:border-primary hover:shadow-sm transition-all"
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

    default:
      return null;
  }
}

interface LessonSectionViewerProps {
  sections: LessonSection[];
}

export function LessonSectionViewer({ sections }: LessonSectionViewerProps) {
  if (!sections || sections.length === 0) return null;

  return (
    <div className="rounded-xl border border-default bg-surface overflow-hidden flex flex-col divide-y divide-default/30">
      {sections.map((section) => (
        <SectionBlock key={section.id} section={section} />
      ))}
    </div>
  );
}
