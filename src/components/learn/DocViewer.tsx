"use client";

import { Check, Clipboard } from "lucide-react";
import { useState } from "react";
import type { DocContent } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Quill outputs <p><br></p> for blank lines — browsers collapse these.
 *  Replace the lone <br> with a non-breaking space so the paragraph
 *  retains its line-height and appears as a visible gap. */
function preprocessHtml(html: string): string {
  return html
    .replace(/<p><br\s*\/?><\/p>/gi, '<p class="ql-blank">&nbsp;</p>')
    .replace(/<br\s*\/?>/gi, "<br />");
}

export function DocViewer({ content }: { content: any }) {
  const [copied, setCopied] = useState("");

  if (typeof content === "string") {
    return (
      <div className="w-full">
        <article className="doc-content space-y-8">
          <section className="rounded-xl border border-default bg-surface p-5">
            <div
              className="rich-content text-secondary"
              dangerouslySetInnerHTML={{ __html: preprocessHtml(content) }}
            />
          </section>
        </article>
      </div>
    );
  }

  const sections = content?.sections || [];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <article className="doc-content space-y-8">
        {sections.map((section: any) => {
          const id = slugify(section.heading);
          return (
            <section
              className="scroll-mt-24 rounded-xl border border-default bg-surface p-5"
              id={id}
              key={section.heading}
            >
              <h2 className="font-display text-2xl font-bold">
                {section.heading}
              </h2>
              <div
                className="rich-content mt-4 text-secondary"
                dangerouslySetInnerHTML={{
                  __html: preprocessHtml(section.body),
                }}
              />
              {section.callout ? (
                <div
                  className={cn(
                    "mt-4 rounded-lg border p-4 text-sm",
                    `callout-${section.callout.tone}`,
                  )}
                >
                  {section.callout.text}
                </div>
              ) : null}
              {section.codeExample ? (
                <div className="mt-5 overflow-hidden rounded-xl border border-muted bg-subtle">
                  <div className="flex items-center justify-between border-b border-muted px-4 py-2">
                    <Badge variant="secondary" className="bg-gray-100 text-gray-500">{section.language ?? "text"}</Badge>
                    <Button
                      aria-label={`Copy ${section.heading} code example`}
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          section.codeExample ?? "",
                        );
                        setCopied(section.heading);
                      }}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      {copied === section.heading ? (
                        <Check className="size-4" aria-hidden />
                      ) : (
                        <Clipboard className="size-4" aria-hidden />
                      )}
                      {copied === section.heading ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <pre className="overflow-x-auto p-4 text-sm leading-6 text-foreground">
                    <code>{section.codeExample}</code>
                  </pre>
                </div>
              ) : null}
              {section.links?.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {section.links.map((link: any) => (
                    <a
                      className="rounded-full border border-default bg-elevated px-3 py-2 text-xs font-bold text-secondary transition-smooth hover:text-foreground focus-ring"
                      href={link.url}
                      key={`${section.heading}-${link.url}`}
                      rel="noopener"
                      target="_blank"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </article>
      <aside className="sticky top-24 hidden h-fit rounded-xl border border-default bg-surface p-5 lg:block">
        <p className="text-xs font-bold uppercase text-muted">
          Table of contents
        </p>
        <nav
          className="mt-4 grid gap-2"
          aria-label="Documentation table of contents"
        >
          {content.sections.map((section: any) => (
            <a
              className="rounded-md px-2 py-1 text-sm text-secondary hover:bg-subtle hover:text-foreground focus-ring"
              href={`#${slugify(section.heading)}`}
              key={section.heading}
            >
              {section.heading}
            </a>
          ))}
        </nav>
      </aside>
    </div>
  );
}
