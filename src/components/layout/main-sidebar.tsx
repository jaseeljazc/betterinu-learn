"use client";

import Link from "next/link";
import { CheckCircle2, Lock, LayoutList } from "lucide-react";
import type { Course } from "@/types";
import { useProgress } from "@/lib/hooks/useProgress";
import { ScrollArea } from "@/components/ui/scroll-area";

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { ChevronDown } from "lucide-react";

export function Sidebar({ course, activeWeekId }: { course: Course; activeWeekId?: string }) {
  const { getCourseProgress, isDayComplete, isWeekUnlocked } = useProgress();
  const progress = getCourseProgress(course);

  return (
    <aside className="sticky top-20 hidden h-[calc(100vh-5rem)] w-[430px] shrink-0 border-r border-default lg:block">
      <ScrollArea className="h-full pr-8">
        {/* Course progress block */}
        <div className="mb-5 rounded-lg border border-default bg-white overflow-hidden">
          <div className="border-b border-primary bg-primary px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary-light">Course Progress</p>
            <p className="mt-0.5 text-sm font-bold text-white truncate">{course.title}</p>
          </div>
          {/* <div className="p-4">
            <div className="flex items-center justify-between mb-2 text-xs font-semibold">
              <span className="text-muted">Overall</span>
              <span className="text-primary font-bold">{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-subtle overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progress}%`, background: "var(--color-primary)" }}
              />
            </div>
          </div> */}
        </div>

        {/* Curriculum nav label */}
        <div className="mb-3 flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-widest text-muted">
          <LayoutList className="size-3.5" />
          Curriculum
        </div>

        <nav aria-label="Course weeks">
          <Accordion type="single" collapsible defaultValue={activeWeekId} className="grid gap-1.5">
            {course.weeks.map((week) => {
              const unlocked = isWeekUnlocked(course, week.id);
              const active = activeWeekId === week.id;
              return (
                <AccordionItem
                  value={week.id}
                  className={`rounded-lg border transition-all overflow-hidden border-b ${active ? "border-primary bg-white" : "border-default bg-white hover:border-strong"}`}
                  key={week.id}
                >
                  <AccordionTrigger disabled={!unlocked} className="hover:no-underline px-3 py-3 [&>svg]:!hidden [&[data-state=open]>div>svg.sidebar-chevron]:rotate-180">
                    <div className="flex w-full items-center justify-between gap-2">
                      <a
                        aria-disabled={!unlocked}
                        onClick={(e) => {
                          if (!unlocked) {
                            e.preventDefault();
                            return;
                          }
                          e.preventDefault();
                          // Open main week accordion if closed
                          const weekEl = document.getElementById(week.id);
                          if (weekEl) {
                            const trigger = weekEl.querySelector('button[data-state="closed"]');
                            if (trigger) {
                              (trigger as HTMLElement).click();
                            }
                            weekEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                          history.pushState(null, '', `#${week.id}`);
                        }}
                        className={`text-left flex-1 text-xs leading-snug cursor-pointer ${unlocked
                          ? active
                            ? "font-bold text-primary"
                            : "font-semibold text-foreground hover:text-primary"
                          : "pointer-events-none font-semibold text-muted"
                        } focus-ring`}
                        href={`#${week.id}`}
                      >
                        {week.title.replace(":", " —")}
                      </a>
                      {unlocked ? (
                        <ChevronDown className="size-4 shrink-0 text-muted transition-transform duration-200 sidebar-chevron" />
                      ) : (
                        <Lock className="size-3 shrink-0 text-muted" aria-hidden />
                      )}
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="pb-3 px-3 pt-0 border-t border-default">
                    <div className="mt-2.5 flex flex-col gap-0.5">
                      {week.days.map((day) => (
                        <a className="w-full group flex items-center gap-2 rounded-sm px-2 py-1.5 text-[11px] text-secondary transition-colors hover:bg-subtle hover:text-foreground focus-ring cursor-pointer"
                          href={`#${day.id}`}
                          onClick={(e) => {
                            e.preventDefault();

                            const openAndScroll = () => {
                              const dayEl = document.getElementById(day.id);
                              if (dayEl) {
                                // Open day accordion if it's closed
                                const dayTrigger = dayEl.querySelector('button[data-state="closed"]') as HTMLElement | null;
                                if (dayTrigger) {
                                  dayTrigger.click();
                                  // Wait for animation then scroll
                                  setTimeout(() => {
                                    dayEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  }, 200);
                                } else {
                                  dayEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }
                            };

                            // First ensure the week accordion is open
                            const weekEl = document.getElementById(week.id);
                            if (weekEl) {
                              const weekTrigger = weekEl.querySelector('button[data-state="closed"]') as HTMLElement | null;
                              if (weekTrigger) {
                                weekTrigger.click();
                                // Wait for week to open then handle day
                                setTimeout(openAndScroll, 300);
                              } else {
                                openAndScroll();
                              }
                            } else {
                              openAndScroll();
                            }

                            history.pushState(null, '', `#${day.id}`);
                          }}
                          key={day.id}
                        >
                          {isDayComplete(day.id) ? (
                            <CheckCircle2 className="size-3.5 text-green-500  shrink-0 text-success" aria-hidden />
                          ) : (
                            <span className="size-3.5 shrink-0 rounded-full border border-strong bg-white transition-colors group-hover:border-primary" />
                          )}
                          <span className="truncate font-medium min-w-0 flex-1">{day.label}</span>
                        </a>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </nav>
      </ScrollArea>
    </aside>
  );
}