"use client";

import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Code2,
  FileText,
  Film,
  HelpCircle,
  Info,
  Layers,
  Lock,
  Plus,
  Save,
  Video,
} from "lucide-react";
import { useState } from "react";

function Section({ icon: Icon, title, color = "text-primary", children }: {
  icon: React.ElementType;
  title: string;
  color?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-default bg-white overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-subtle transition-colors"
      >
        <span className="flex items-center gap-3">
          <Icon className={`size-4 shrink-0 ${color}`} />
          <span className="font-display text-sm font-bold text-foreground">{title}</span>
        </span>
        {open ? <ChevronDown className="size-4 text-muted" /> : <ChevronRight className="size-4 text-muted" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1 space-y-3 text-xs text-secondary leading-relaxed border-t border-default/50">{children}</div>}
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3">
      <Info className="size-3.5 shrink-0 text-primary mt-0.5" />
      <p className="text-xs text-primary leading-relaxed">{children}</p>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-[#1a1a2e] text-green-300 text-[11px] p-3 leading-relaxed">
      {children}
    </pre>
  );
}

function Badge({ children, color = "bg-blue-100 text-blue-800" }: { children: React.ReactNode; color?: string }) {
  return (
    <span className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${color}`}>
      {children}
    </span>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-white text-[10px] font-extrabold mt-0.5">
        {n}
      </span>
      <p className="text-xs text-secondary leading-relaxed">{children}</p>
    </div>
  );
}

const moduleTypes = [
  {
    kind: "video",
    Icon: Film,
    color: "bg-blue-100 text-blue-800",
    label: "Video",
    desc: "Embeds a YouTube video with an optional summary paragraph displayed beneath the player.",
    fields: ["videoUrl — YouTube Video ID or full URL", "description — Summary text shown below the video (optional)"],
  },
  {
    kind: "doc",
    Icon: FileText,
    color: "bg-purple-100 text-purple-800",
    label: "Document",
    desc: "Renders a rich-text reading block built with the inline editor. Supports headings, bold, lists, and more.",
    fields: ["content — HTML-formatted body text (edited via the Rich Text Editor toolbar)"],
  },
  {
    kind: "mixed",
    Icon: Layers,
    color: "bg-amber-100 text-amber-800",
    label: "Mixed",
    desc: "A sequential collection of any number of Video and Doc blocks arranged as one lesson unit.",
    fields: ["blocks — Array of { kind, title, videoUrl?, description?, content? }"],
  },
  {
    kind: "quiz",
    Icon: HelpCircle,
    color: "bg-green-100 text-green-700",
    label: "Quiz",
    desc: "An interactive multiple-choice quiz. Students must submit answers before the module is marked complete.",
    fields: ["quizData.title — Quiz heading", "quizData.questions — Array of question objects with options and correctAnswer index"],
  },
];

export function CurriculumGuide() {
  return (
    <div className="space-y-2 bg-surface p-4 rounded-xl border border-default">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Code2 className="size-4 text-primary" /> JSON Upload Guide
        </h3>
        <p className="text-xs text-muted mt-1">Expand sections below to see all possible ways to format lesson data in your JSON uploads.</p>
      </div>

      <Section icon={Video} title="1. JSON Formats by Lesson Type" color="text-blue-600">
        <p>Each lesson has a <strong>type</strong> that controls what content fields are available.</p>
        <div className="space-y-3 mt-2">
          {moduleTypes.map((t) => (
            <div key={t.kind} className="rounded-lg border border-default bg-subtle p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge color={t.color}>{t.label}</Badge>
              </div>
              <p className="text-xs text-secondary mb-2">{t.desc}</p>
              <div className="space-y-1">
                {t.fields.map((f) => (
                  <div key={f} className="flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span>
                    <code className="text-[10px] text-foreground bg-white border border-default rounded px-1 py-0.5">{f}</code>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Code2} title="2. Full Week JSON Schema" color="text-indigo-600">
        <p className="mb-2">Use this schema when pasting a single week into the "Import Week JSON" tool.</p>
        <CodeBlock>{`{
  "id": "week-1",
  "title": "Week 1: Foundations",
  "isLocked": false,
  "isShared": false,
  "days": [
    {
      "id": "course-w1-d1",
      "label": "Day 1",
      "title": "Core Concepts",
      "subModules": [

        // 1. VIDEO LESSON
        {
          "id": "mod-unique-id",
          "title": "Introduction Video",
          "type": "video",
          "duration": "5 min",
          "videoUrl": "dQw4w9WgXcQ",  // YouTube ID or full URL
          "description": "Summary shown below the video."
        },

        // 2. DOCUMENT LESSON
        {
          "id": "mod-unique-id",
          "title": "Reading Material",
          "type": "doc",
          "duration": "10 min",
          "content": "<h2>Heading</h2><p>Body text here.</p>"
        },

        // 3. MIXED LESSON
        {
          "id": "mod-unique-id",
          "title": "Combined Study",
          "type": "mixed",
          "duration": "20 min",
          "blocks": [
            {
              "kind": "video",
              "title": "Part 1 — Overview",
              "videoUrl": "dQw4w9WgXcQ",
              "description": "Optional caption."
            },
            {
              "kind": "doc",
              "title": "Part 2 — Notes",
              "content": "<p>Supporting notes HTML.</p>"
            }
          ]
        },

        // 4. QUIZ LESSON
        {
          "id": "mod-unique-id",
          "title": "Knowledge Check",
          "type": "quiz",
          "duration": "10 min",
          "quizData": {
            "title": "Day 1 Quiz",
            "questions": [
              {
                "id": "q1",
                "type": "multiple-choice",
                "text": "What is 2 + 2?",
                "options": ["2", "3", "4", "5"],
                "correctAnswer": 2
              }
            ]
          }
        }

      ]
    }
  ]
}`}</CodeBlock>
        <Tip>Always ensure every <code>id</code> field is unique across the entire course. Duplicate IDs will cause progress tracking to break silently.</Tip>
      </Section>

    </div>
  );
}
