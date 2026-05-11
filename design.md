# LearnForge Design System — v2 Transformation Guide

> **Scope:** Complete replacement of the dark-first violet system with a light-first, forest-green editorial system. This document is the single source of truth for every visual decision — tokens, components, typography, motion, layout, and accessibility. Every value here supersedes the previous `globals.css` and any component-level overrides.

---

## 1. Design Direction

### Concept: Botanical Editorial

The new LearnForge interface draws from **premium editorial publishing** crossed with **natural, organic materials** — warm parchment backgrounds, deep forest greens, and a terracotta accent that feels handcrafted. The goal is a platform that feels calm and focused, like reading a well-designed textbook in a good coffee shop, rather than a gamified neon dashboard.

### Key Principles

| Principle | Old System | New System |
|---|---|---|
| **Theme** | Dark-first, obsidian | Light-first, warm parchment |
| **Primary** | Electric violet `#7c5cfc` | Forest green `#1a4031` |
| **Accent** | Amber (XP only) | Terracotta + Amber (distinct roles) |
| **Typography** | Syne + DM Sans | Fraunces + Figtree |
| **Surfaces** | Cold, near-black | Warm off-whites and creams |
| **Mood** | Developer tool, gamified | Editorial, focused, intelligent |

### What Makes It Unmistakably "Designed"

1. **Fraunces italic for display headings** — the optical-size serif has personality that kills the AI-generated look instantly
2. **Terracotta as a second accent** — breaks the monotony of a monochromatic green system and signals energy (challenges, streaks, CTAs)
3. **Parchment base, not pure white** — `#f7f5f0` reads premium editorial rather than clinical
4. **5-stop green ramp** — from near-black `#0f2a1e` down to ghost tint `#edf8f2`, providing real depth across components
5. **Warm border tones** — borders pull warm not cool, making the whole system feel cohesive with the parchment base

---

## 2. Font Loading

Replace the existing `next/font` imports in `app/layout.tsx`:

```tsx
// app/layout.tsx
import { Fraunces, Figtree } from 'next/font/google'

const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz', 'wght'],
  weight: ['300', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--ff-display',
  display: 'swap',
})

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--ff-body',
  display: 'swap',
})

// Apply both variables to <html>
// className={`${fraunces.variable} ${figtree.variable}`}
```

**Remove:** `Syne`, `DM Sans`

---

## 3. Core Color Tokens

Replace all `:root` / `.dark` definitions in `app/globals.css` with the following. The system is **light-only** — remove all dark-mode overrides.

```css
:root {
  /* ── Surfaces ──────────────────────────────── */
  --bg-base:       #f7f5f0;   /* warm parchment — page background */
  --bg-surface:    #ffffff;   /* card / panel surfaces */
  --bg-elevated:   #efece5;   /* hovered states, secondary panels */
  --bg-subtle:     #e5e0d6;   /* input tracks, dividers, tags */
  --bg-overlay:    rgba(26, 44, 34, 0.06); /* modal scrims */

  /* ── Borders ───────────────────────────────── */
  --border-muted:   #ede8df;  /* lowest contrast — section separators */
  --border-default: #ddd8ce;  /* standard card/input borders */
  --border-strong:  #c4bdb1;  /* hover states, emphasis */
  --border-focus:   #2d6a4f;  /* keyboard focus ring */

  /* ── Green ramp (primary) ──────────────────── */
  --green-900: #0f2a1e;
  --green-800: #1a4031;   /* ← primary brand color */
  --green-700: #1e5238;
  --green-600: #2d6a4f;   /* ← interactive mid-tone */
  --green-500: #3d8b68;
  --green-400: #52a882;
  --green-300: #7dc4a4;
  --green-200: #aed9c3;
  --green-100: #d1eedf;
  --green-50:  #edf8f2;   /* ghost tint — hover backgrounds */

  /* ── Terracotta ramp (accent — energy / urgency) */
  --terra-700: #8f3f18;
  --terra-600: #b85c2a;
  --terra-500: #c8703b;   /* ← primary accent */
  --terra-400: #d98457;
  --terra-200: #f0c9b0;
  --terra-100: #f8e4d4;
  --terra-50:  #fdf1e9;

  /* ── Amber ramp (XP, rewards, levels) ──────── */
  --amber-700: #8f5c0a;
  --amber-600: #b87a14;
  --amber-500: #d4920e;
  --amber-400: #e8a520;   /* ← XP highlight */
  --amber-200: #f5d58a;
  --amber-100: #faecc4;
  --amber-50:  #fef8e7;

  /* ── Semantic ───────────────────────────────── */
  --success-700: #145c38;
  --success-600: #1e7a4a;
  --success-500: #27a060;  /* checkmarks, completion */
  --success-100: #c8edd9;
  --success-50:  #edf8f2;

  --danger-600:  #9e2020;
  --danger-500:  #c0392b;  /* errors, destructive */
  --danger-100:  #f5c6c2;
  --danger-50:   #fdf0ef;

  --info-600:    #1e4fa0;
  --info-500:    #2563c0;
  --info-100:    #bfd3f5;
  --info-50:     #eaf1fc;

  /* ── Text ───────────────────────────────────── */
  --text-primary:   #1a1a14;  /* headings, body — warm near-black */
  --text-secondary: #4a4a3a;  /* supporting text */
  --text-muted:     #7a7a62;  /* labels, metadata */
  --text-disabled:  #b8b8a0;  /* placeholders, locked */
  --text-on-dark:   #f7f5f0;  /* text on green-800+ surfaces */
  --text-on-accent: #ffffff;  /* text on terracotta */

  /* ── Course identity colors ─────────────────── */
  --course-webdev:     #3b6fd4;
  --course-data:       #7c4dbd;
  --course-design:     #c7384a;
  --course-marketing:  #c8703b;
  --course-python:     #2d8a6e;
  --course-devops:     #4a7fb5;
  --course-hr:         #b5468a;
  --course-finance:    #6b7c3a;
}
```

---

## 4. Gradients, Shadows, Effects

```css
:root {
  /* ── Gradients ──────────────────────────────── */
  --gradient-primary:   linear-gradient(135deg, #2d6a4f 0%, #1a4031 100%);
  --gradient-accent:    linear-gradient(135deg, #c8703b 0%, #b85c2a 100%);
  --gradient-amber:     linear-gradient(135deg, #e8a520 0%, #d4920e 100%);
  --gradient-success:   linear-gradient(135deg, #52a882 0%, #2d6a4f 100%);
  --gradient-surface:   linear-gradient(180deg, #ffffff 0%, #efece5 100%);
  --gradient-hero:      linear-gradient(135deg, #f7f5f0 0%, #e8f5ee 50%, #f7f5f0 100%);
  --gradient-locked:    linear-gradient(135deg, #efece5 0%, #e5e0d6 100%);
  --gradient-dark-cta:  linear-gradient(135deg, #1e5238 0%, #1a4031 100%);

  /* progress fills */
  --gradient-prog-green: linear-gradient(90deg, #2d6a4f 0%, #52a882 100%);
  --gradient-prog-amber: linear-gradient(90deg, #d4920e 0%, #e8a520 100%);
  --gradient-prog-terra: linear-gradient(90deg, #b85c2a 0%, #c8703b 100%);

  /* ── Shadows ────────────────────────────────── */
  --shadow-xs:       0 1px 2px rgba(26, 44, 34, 0.04);
  --shadow-sm:       0 1px 3px rgba(26, 44, 34, 0.06),
                     0 1px 2px rgba(26, 44, 34, 0.04);
  --shadow-md:       0 4px 16px rgba(26, 44, 34, 0.08),
                     0 2px 6px rgba(26, 44, 34, 0.04);
  --shadow-lg:       0 8px 32px rgba(26, 44, 34, 0.10),
                     0 4px 12px rgba(26, 44, 34, 0.06);
  --shadow-xl:       0 16px 56px rgba(26, 44, 34, 0.12),
                     0 8px 20px rgba(26, 44, 34, 0.07);
  --shadow-modal:    0 24px 80px rgba(26, 44, 34, 0.18);

  /* focus ring — used on all interactive elements */
  --focus-ring: 0 0 0 3px rgba(45, 106, 79, 0.28);
}
```

> **Note:** Remove all `--glow-*` variables. Neon glow effects don't belong in a light editorial system. Depth comes from layered natural shadows.

---

## 5. Typography

```css
:root {
  --ff-display: 'Fraunces', Georgia, serif;
  --ff-body:    'Figtree', system-ui, sans-serif;
  --ff-mono:    'JetBrains Mono', 'Fira Code', monospace;
}
```

### Type Scale

| Token | Font | Size | Weight | Use |
|---|---|---|---|---|
| `--type-display-2xl` | display | 52px | 500 | Hero / landing headings |
| `--type-display-xl` | display | 40px | 500 | Page titles |
| `--type-display-lg` | display | 30px | 500 | Section headers |
| `--type-display-md` | display | 22px | 500 | Card titles, modal headers |
| `--type-display-sm` | display | 17px | 500 | Subsection headings |
| `--type-body-lg` | body | 16px | 400 | Primary body text |
| `--type-body-md` | body | 14px | 400 | Secondary body, descriptions |
| `--type-body-sm` | body | 13px | 400 | Meta, captions |
| `--type-label-lg` | body | 13px | 600 | Button text, strong labels |
| `--type-label-sm` | body | 11px | 600 | Caps labels, badges, tags |
| `--type-code` | mono | 13px | 400 | Code blocks, tokens |

```css
:root {
  --type-display-2xl: 500 52px/1.08 var(--ff-display);
  --type-display-xl:  500 40px/1.10 var(--ff-display);
  --type-display-lg:  500 30px/1.18 var(--ff-display);
  --type-display-md:  500 22px/1.25 var(--ff-display);
  --type-display-sm:  500 17px/1.35 var(--ff-display);
  --type-body-lg:     400 16px/1.65 var(--ff-body);
  --type-body-md:     400 14px/1.60 var(--ff-body);
  --type-body-sm:     400 13px/1.55 var(--ff-body);
  --type-label-lg:    600 13px/1.00 var(--ff-body);
  --type-label-sm:    600 11px/1.00 var(--ff-body);
  --type-code:        400 13px/1.60 var(--ff-mono);

  --tracking-tight:   -0.02em;
  --tracking-snug:    -0.015em;
  --tracking-normal:  0;
  --tracking-wide:    0.06em;
  --tracking-caps:    0.10em;   /* always pair with text-transform: uppercase */
}
```

### Heading Styles in Practice

```tsx
// Display — hero / page title
<h1 className="font-display text-[40px] font-medium tracking-tight text-primary leading-[1.1]">
  Learn at your own <em className="italic text-green-600">pace, your way</em>
</h1>

// Section heading
<h2 className="font-display text-[22px] font-medium text-primary">
  Continue learning
</h2>

// Card title
<h3 className="font-display text-[17px] font-medium text-primary">
  Full Stack MERN
</h3>

// Caps label (metadata, tags)
<span className="font-body text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
  Module 4 · 8 lessons
</span>
```

---

## 6. Spacing & Radius

```css
:root {
  /* ── Spacing ────────────────────────────────── */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;

  /* ── Border radius ──────────────────────────── */
  --radius-xs:   4px;   /* chips, code inline */
  --radius-sm:   6px;   /* badges, tags, small inputs */
  --radius-md:   10px;  /* buttons, inputs */
  --radius-lg:   16px;  /* cards */
  --radius-xl:   24px;  /* modals, sheets */
  --radius-2xl:  32px;  /* hero panels */
  --radius-full: 9999px; /* pills, avatar, toggle */
}
```

---

## 7. Motion

```css
:root {
  /* ── Easing ─────────────────────────────────── */
  --ease-smooth: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out:    cubic-bezier(0.00, 0.00, 0.20, 1.00);
  --ease-in:     cubic-bezier(0.40, 0.00, 1.00, 1.00);

  /* ── Durations ──────────────────────────────── */
  --duration-instant: 80ms;
  --duration-fast:    150ms;
  --duration-base:    220ms;
  --duration-slow:    380ms;
  --duration-spring:  420ms;

  /* ── Transitions (shorthand) ─────────────────  */
  --transition-fast:   150ms var(--ease-smooth);
  --transition-base:   220ms var(--ease-smooth);
  --transition-slow:   380ms var(--ease-smooth);
  --transition-spring: 420ms var(--ease-spring);
}
```

### Keyframe Animations

```css
/* app/globals.css — animation definitions */

@keyframes fade-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes slide-in-right {
  from { opacity: 0; transform: translateX(16px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(0.94); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}

@keyframes progress-grow {
  from { width: 0%; }
  to   { width: var(--progress-value); }
}

@keyframes lock-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%       { transform: scale(1.08); opacity: 0.75; }
}

@keyframes xp-pop {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.18); }
  100% { transform: scale(1); }
}
```

### Tailwind v4 Animation Aliases

```css
/* inside @theme inline in globals.css */
--animate-fade-up:        fade-up 400ms var(--ease-out) both;
--animate-fade-in:        fade-in 250ms var(--ease-out) both;
--animate-slide-in-right: slide-in-right 300ms var(--ease-out) both;
--animate-scale-in:       scale-in 220ms var(--ease-spring) both;
--animate-shimmer:        shimmer 1.8s linear infinite;
--animate-progress-grow:  progress-grow 600ms var(--ease-out) both;
--animate-lock-pulse:     lock-pulse 2s var(--ease-smooth) infinite;
--animate-xp-pop:         xp-pop 350ms var(--ease-spring) both;
```

### Stagger Pattern for Card Grids

```tsx
// Apply animation-delay via inline style for staggered reveals
{courses.map((course, i) => (
  <CourseCard
    key={course.id}
    course={course}
    style={{ animationDelay: `${i * 60}ms` }}
    className="animate-fade-up"
  />
))}
```

---

## 8. Tailwind v4 Theme Mapping

Full `@theme inline` block for `globals.css`:

```css
@theme inline {
  /* Fonts */
  --font-display: var(--ff-display);
  --font-body:    var(--ff-body);
  --font-mono:    var(--ff-mono);

  /* Colors — surfaces */
  --color-background:  var(--bg-base);
  --color-surface:     var(--bg-surface);
  --color-elevated:    var(--bg-elevated);
  --color-subtle:      var(--bg-subtle);
  --color-overlay:     var(--bg-overlay);

  /* Colors — text */
  --color-foreground:  var(--text-primary);
  --color-secondary:   var(--text-secondary);
  --color-muted:       var(--text-muted);
  --color-disabled:    var(--text-disabled);
  --color-on-dark:     var(--text-on-dark);

  /* Colors — borders */
  --color-border:         var(--border-default);
  --color-border-muted:   var(--border-muted);
  --color-border-strong:  var(--border-strong);
  --color-border-focus:   var(--border-focus);

  /* Colors — brand */
  --color-primary:        var(--green-800);
  --color-primary-mid:    var(--green-600);
  --color-primary-light:  var(--green-100);
  --color-primary-ghost:  var(--green-50);
  --color-accent:         var(--terra-500);
  --color-accent-light:   var(--terra-50);

  /* Colors — semantic */
  --color-xp:      var(--amber-400);
  --color-xp-soft: var(--amber-50);
  --color-streak:  var(--terra-500);
  --color-success: var(--success-500);
  --color-danger:  var(--danger-500);
  --color-info:    var(--info-500);

  /* Colors — course (applied via CSS custom property) */
  --color-course:      var(--course-color);
  --color-course-soft: color-mix(in srgb, var(--course-color) 12%, transparent);
  --color-course-pale: color-mix(in srgb, var(--course-color) 6%, transparent);

  /* Radius */
  --radius-xs:   var(--radius-xs);
  --radius-sm:   var(--radius-sm);
  --radius-md:   var(--radius-md);
  --radius-lg:   var(--radius-lg);
  --radius-xl:   var(--radius-xl);
  --radius-2xl:  var(--radius-2xl);
  --radius-full: var(--radius-full);

  /* Shadows */
  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-xl: var(--shadow-xl);

  /* Animations */
  --animate-fade-up:        fade-up 400ms var(--ease-out) both;
  --animate-fade-in:        fade-in 250ms var(--ease-out) both;
  --animate-slide-in-right: slide-in-right 300ms var(--ease-out) both;
  --animate-scale-in:       scale-in 220ms var(--ease-spring) both;
  --animate-shimmer:        shimmer 1.8s linear infinite;
  --animate-progress-grow:  progress-grow 600ms var(--ease-out) both;
  --animate-lock-pulse:     lock-pulse 2s var(--ease-smooth) infinite;
  --animate-xp-pop:         xp-pop 350ms var(--ease-spring) both;
}
```

---

## 9. Component Specifications

### 9.1 Cards

**Standard course card:**

```
bg-surface
border border-border (1px solid var(--border-default))
rounded-lg (16px)
shadow-sm
overflow-hidden
cursor-pointer

hover → shadow-md, translateY(-2px), border-border-strong
transition: all 220ms var(--ease-smooth)
```

**Card structure:**
```
┌─ 5px top accent bar (var(--course-color)) ───────────────┐
│  padding: 16px 18px                                       │
│  ┌ card-meta row ──────────────────────────────────────┐  │
│  │ [icon 32×32]                    [course badge]      │  │
│  └─────────────────────────────────────────────────────┘  │
│  [card-title — Fraunces 15px/500]                         │
│  [card-desc  — Figtree 12px, text-muted, 2 lines max]     │
│  [progress track — 6px, margin-top: 12px]                 │
├─ card-footer (1px solid border-muted) ───────────────────┤
│  [lesson count meta]              [progress % — green]    │
└───────────────────────────────────────────────────────────┘
```

**Card icon:**
```
width: 32px; height: 32px
border-radius: var(--radius-sm)
background: color-mix(in srgb, var(--course-color) 12%, transparent)
color: var(--course-color)
font-size: 16px (Tabler icon)
```

**Implementation:**
```tsx
// src/components/learn/CourseCard.tsx
<div
  className="group relative bg-surface border border-border rounded-lg shadow-sm overflow-hidden cursor-pointer transition-all duration-220 ease-smooth hover:shadow-md hover:-translate-y-0.5 hover:border-border-strong"
  style={{ '--course-color': `var(${course.colorToken})` } as CSSProperties}
>
  {/* Accent bar */}
  <div className="h-[5px] w-full" style={{ background: 'var(--course-color)' }} />
  {/* ... rest of card */}
</div>
```

---

### 9.2 Locked Cards

```
background: var(--gradient-locked)
border: 1.5px dashed var(--border-strong)
border-radius: var(--radius-lg)
opacity: 0.72
aria-disabled: true
```

**Lock overlay:**
```
position: absolute, inset: 0
backdrop-filter: blur(1.5px)
background: rgba(247, 245, 240, 0.5)
display: flex + align-items/justify-content: center
```

**Lock pill:**
```
background: var(--amber-50)
border: 1px solid var(--amber-200)
border-radius: var(--radius-full)
padding: 6px 14px
font-size: 13px; font-weight: 600
color: var(--amber-600)
icon: ti-lock (animate-lock-pulse)
```

---

### 9.3 Buttons

#### Primary
```
background: var(--green-800)
color: var(--text-on-dark)
border-radius: var(--radius-full)
padding: 9px 20px
font: 600 13px var(--ff-body)
border: none

hover → background: var(--green-700), translateY(-1px), shadow-md
active → scale(0.97)
focus → box-shadow: var(--focus-ring)
```

#### Secondary
```
background: var(--bg-surface)
color: var(--text-primary)
border: 1.5px solid var(--border-strong)
border-radius: var(--radius-full)
padding: 8px 20px
font: 600 13px var(--ff-body)

hover → border-color: var(--green-600), color: var(--green-700), background: var(--green-50)
```

#### Accent (Terracotta)
```
background: var(--terra-500)
color: var(--text-on-accent)
border-radius: var(--radius-full)
padding: 9px 20px
font: 600 13px var(--ff-body)

hover → background: var(--terra-600), translateY(-1px), shadow-md
```

#### Ghost
```
background: transparent
color: var(--green-700)
border: none
border-radius: var(--radius-sm)
padding: 7px 12px
text-decoration: underline
text-decoration-color: var(--green-200)
text-underline-offset: 3px

hover → background: var(--green-50), text-decoration-color: var(--green-500)
```

#### Danger
```
background: transparent
color: var(--danger-500)
border: 1.5px solid var(--danger-100)
border-radius: var(--radius-full)
padding: 8px 20px

hover → background: var(--danger-50), border-color: var(--danger-500)
```

#### Icon button
```
width: 36px; height: 36px
border-radius: var(--radius-md)
background: transparent
border: 1px solid var(--border-default)
display: flex; align-items/justify-content: center
color: var(--text-muted)
font-size: 18px (Tabler icon)

hover → background: var(--bg-elevated), color: var(--text-primary), border-color: var(--border-strong)
```

---

### 9.4 Badges

```tsx
// Tailwind base: "inline-flex items-center gap-1 rounded-full font-body text-[11px] font-semibold px-2.5 py-0.5"

// Course — Web Dev
"bg-[#e8eef8] text-[#2a4fa0] border border-[#b8ccf0]"

// Course — Data Science
"bg-[#f0ebfa] text-[#5a30a0] border border-[#c8aef0]"

// Course — Design
"bg-[#fce8ea] text-[#a02030] border border-[#f0b0b8]"

// Course — Marketing / Terracotta
"bg-terra-50 text-terra-600 border border-terra-200"

// Course — Python / Green
"bg-green-50 text-green-700 border border-green-200"

// XP reward
"bg-amber-50 text-amber-600 border border-amber-200"

// Streak
"bg-[#fce8ea] text-[#a02030] border border-[#f0b0b8]"

// New / unlocked
"bg-green-50 text-green-700 border border-green-200"

// Muted / default
"bg-elevated text-muted border border-border"

// Pro / premium
"bg-green-800 text-on-dark"
```

---

### 9.5 Progress Bars

```
track → height: 6px, background: var(--bg-subtle), border-radius: var(--radius-full)
fill  → height: 100%, border-radius: var(--radius-full)
       animation: animate-progress-grow (on mount)
       width: var(--progress-value)  [set via inline CSS var]

fill gradients:
  green  → var(--gradient-prog-green)   [completion progress]
  amber  → var(--gradient-prog-amber)   [XP / level progress]
  terra  → var(--gradient-prog-terra)   [challenge / streak progress]
```

```tsx
// src/components/ui/progress.tsx
<div
  role="progressbar"
  aria-valuenow={value}
  aria-valuemin={0}
  aria-valuemax={100}
  className="h-1.5 rounded-full overflow-hidden bg-subtle"
>
  <div
    className="h-full rounded-full animate-progress-grow"
    style={{
      '--progress-value': `${clamp(value, 0, 100)}%`,
      background: variantGradientMap[variant],
    } as CSSProperties}
  />
</div>
```

---

### 9.6 Stat Cards

```
background: var(--bg-surface)
border: 1px solid var(--border-default)
border-radius: var(--radius-md)
padding: 14px
shadow-xs

label → font-body 10px/600, uppercase, tracking-wide, text-muted, margin-bottom: 4px
value → font-display 28px/700, line-height: 1
        .green → color: var(--green-700)
        .amber → color: var(--amber-600)
        .terra → color: var(--terra-500)
sub   → font-body 11px, text-muted, margin-top: 3px
```

---

### 9.7 XP Level Widget

```
background: var(--bg-surface)
border: 1px solid var(--border-default)
border-radius: var(--radius-lg)
padding: 14px 18px
shadow-sm
display: flex; gap: 12px; align-items: center

circle →
  width: 44px; height: 44px; border-radius: 50%
  background: var(--amber-50)
  border: 2px solid var(--amber-200)
  font-display 14px/700, color: var(--amber-600)
  animate-xp-pop (on level-up)

inner label →
  display: flex; justify-content: space-between
  left:  font-body 11px/600, uppercase, tracking-wide, text-muted
  right: font-display 13px/500, color: var(--amber-600)

track → standard amber progress fill
```

---

### 9.8 Navigation Bar

```
background: var(--bg-surface)
border-bottom: 1px solid var(--border-default)
height: 60px
padding: 0 24px
position: fixed; top: 0; left: 0; right: 0
z-index: 50
shadow-sm

logo →
  font-display 18px/700, color: var(--green-800)
  leading dot: 8×8px circle, background: var(--green-600), border-radius: full

nav-link →
  font-body 13px/500, color: text-muted
  padding: 6px 12px, border-radius: var(--radius-sm)
  hover → background: var(--bg-elevated), color: text-primary
  .active → background: var(--green-50), color: var(--green-800)

notification bell →
  Tabler ti-bell, 20px, color: text-muted
  unread dot: 8px, background: var(--terra-500), border: 2px solid bg-surface
  position: absolute, top: -1px, right: -1px

avatar →
  30×30px circle
  background: var(--green-100)
  border: 1.5px solid var(--green-200)
  font-body 11px/600, color: var(--green-700)
  initials — uppercase

page-offset → padding-top: 72px  (navbar 60px + 12px gap)
```

---

### 9.9 Sidebar

```
width: 248px
background: var(--bg-surface)
border-right: 1px solid var(--border-default)
height: 100vh; position: sticky; top: 60px
padding: 20px 12px
overflow-y: auto

sidebar-item →
  display: flex; align-items: center; gap: 10px
  padding: 9px 12px; border-radius: var(--radius-md)
  font-body 13px/500, color: text-secondary
  Tabler icon 18px, color: text-muted

  hover → background: var(--bg-elevated), color: text-primary
  .active →
    background: var(--green-50)
    color: var(--green-800); font-weight: 600
    icon color: var(--green-600)
    left accent: 2px solid var(--green-600) (box-shadow inset or border-left)

section-label →
  font-body 10px/600, uppercase, tracking-caps, text-disabled
  padding: 16px 12px 6px
```

---

### 9.10 Alerts & Toasts

```
border-radius: var(--radius-md)
padding: 10px 14px
display: flex; align-items: flex-start; gap: 10px
font-body 13px

success → bg: var(--green-50),   border: 1px solid var(--green-200),   color: var(--green-800)
warning → bg: var(--amber-50),   border: 1px solid var(--amber-200),   color: var(--amber-700)
danger  → bg: var(--danger-50),  border: 1px solid var(--danger-100),  color: var(--danger-600)
info    → bg: var(--info-50),    border: 1px solid var(--info-100),    color: var(--info-600)
accent  → bg: var(--terra-50),   border: 1px solid var(--terra-200),   color: var(--terra-600)

toast (floating) →
  position: fixed; bottom: 24px; right: 24px
  background: var(--green-900)
  color: var(--text-on-dark)
  border-radius: var(--radius-md)
  padding: 12px 16px
  shadow-lg
  animate-slide-in-right (enter) + fade-in reverse (exit)
  z-index: 100
```

---

### 9.11 Modal / Sheet

```
scrim →
  background: rgba(26, 44, 34, 0.45)
  backdrop-filter: blur(4px)
  animate-fade-in

modal →
  background: var(--bg-surface)
  border-radius: var(--radius-xl)
  shadow-modal
  padding: 28px
  max-width: 520px
  animate-scale-in

  header →
    font-display text-[22px]/500, margin-bottom: 4px
    font-body 14px, text-muted, margin-bottom: 20px
    close btn: icon-button top-right, absolute

  footer →
    border-top: 1px solid var(--border-muted)
    padding-top: 16px
    display: flex; justify-content: flex-end; gap: 10px

bottom-sheet (mobile) →
  border-radius: var(--radius-xl) var(--radius-xl) 0 0
  position: fixed; bottom: 0; left: 0; right: 0
  padding-bottom: env(safe-area-inset-bottom, 20px)
  animate: slide up from translateY(100%)
```

---

### 9.12 Form Inputs

```
base →
  background: var(--bg-surface)
  border: 1.5px solid var(--border-default)
  border-radius: var(--radius-md)
  padding: 9px 13px
  font-body 14px, text-primary
  width: 100%; height: 40px

  placeholder → color: var(--text-disabled)
  hover → border-color: var(--border-strong)
  focus → border-color: var(--border-focus), box-shadow: var(--focus-ring), outline: none
  disabled → background: var(--bg-elevated), color: var(--text-disabled), cursor: not-allowed
  error → border-color: var(--danger-500), focus shadow uses danger tint

label →
  font-body 13px/600, text-primary
  margin-bottom: 6px; display: block

helper-text →
  font-body 12px, text-muted, margin-top: 5px

select →
  same as input + custom caret icon (ti-chevron-down, 16px, text-muted)
  background-image approach or wrapper + absolute icon

checkbox / radio →
  custom styled: 18×18px square (checkbox) or circle (radio)
  unchecked: border 1.5px solid var(--border-strong), bg: var(--bg-surface)
  checked: background: var(--green-800), border-color: var(--green-800)
           checkmark: white SVG path or Tabler ti-check
  focus: var(--focus-ring) on the control
```

---

### 9.13 Dark Promotional Block

Used for upsell banners, end-of-module CTA, and subscription prompts:

```
background: var(--gradient-dark-cta)
  (linear-gradient(135deg, #1e5238 0%, #1a4031 100%))
border-radius: var(--radius-lg)
padding: 20px 24px
display: flex; align-items: center; justify-content: space-between; gap: 16px

label → font-body 10px/600, uppercase, tracking-caps, color: var(--green-200), margin-bottom: 6px
title → font-display 20px/500, color: var(--text-on-dark)
desc  → font-body 13px, color: var(--green-200), line-height: 1.5
cta   →
  background: var(--text-on-dark)  [#f7f5f0]
  color: var(--green-800)
  border-radius: var(--radius-full)
  padding: 9px 18px; font-body 13px/600
  hover → background: var(--green-50), translateY(-1px)
  flex-shrink: 0
```

---

## 10. Course Identity System

Each course is assigned a color token. Apply it via CSS custom property:

```tsx
// Parent element — set the course color variable
<div style={{ '--course-color': `var(--course-${course.slug})` } as CSSProperties}>
```

Then use these derived values throughout the course context:

| Token | Value | Use |
|---|---|---|
| `var(--course-color)` | Raw color | Banner bar, icon tint, badge text/border |
| `color-mix(in srgb, var(--course-color) 12%, transparent)` | Tinted bg | Icon container background, badge fill |
| `color-mix(in srgb, var(--course-color) 6%, transparent)` | Ghost bg | Hover states on course-scoped elements |

### Course Color Reference

| Slug | Token | Hex | Category |
|---|---|---|---|
| `webdev` | `--course-webdev` | `#3b6fd4` | Web Development |
| `data` | `--course-data` | `#7c4dbd` | Data Science |
| `design` | `--course-design` | `#c7384a` | UI / UX Design |
| `marketing` | `--course-marketing` | `#c8703b` | Digital Marketing |
| `python` | `--course-python` | `#2d8a6e` | Python / Backend |
| `devops` | `--course-devops` | `#4a7fb5` | DevOps & Cloud |
| `hr` | `--course-hr` | `#b5468a` | HR & People Ops |
| `finance` | `--course-finance` | `#6b7c3a` | Finance & Business |

---

## 11. Layout

### Page Structure

```
fixed navbar (height: 60px)
  └── main content wrapper
        padding-top: 72px   (navbar + 12px breathing room)
        padding-x: 16px → sm:24px → lg:32px
        max-width: 1280px
        margin: 0 auto

  with sidebar:
    display: grid
    grid-template-columns: 248px 1fr
    gap: 0
    align-items: start

  without sidebar (full content):
    max-width: 896px
    margin: 0 auto
```

### Content Max Widths

| Context | Max width |
|---|---|
| Dashboard / course grid | `max-w-7xl` (1280px) |
| Lesson / reading content | `max-w-3xl` (768px) |
| Settings pages | `max-w-2xl` (672px) |
| Auth pages | `max-w-md` (448px) |

### Course Grid

```
display: grid
grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))
gap: 16px
```

---

## 12. Accessibility

All patterns from v1 are preserved and extended:

- **Focus rings:** `box-shadow: var(--focus-ring)` on every interactive element — 3px offset ring in `rgba(45, 106, 79, 0.28)`. Never remove `outline` without replacing with `--focus-ring`.
- **Color-only state:** Every state (complete, locked, in-progress, error) uses an icon, label, or pattern in addition to color.
- **Progress bars:** `role="progressbar"` + `aria-valuenow` + `aria-valuemin=0` + `aria-valuemax=100` + `aria-label`.
- **Locked content:** `aria-disabled="true"` on locked navigation and cards. Don't use `disabled` on non-form elements.
- **Images / icons:** Decorative icons use `aria-hidden="true"`. Meaningful icons use `aria-label` or have adjacent visible text.
- **Motion:** Respect `prefers-reduced-motion`. Wrap all transitions and keyframe animations:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- **Contrast:** All body text on `--bg-base` or `--bg-surface` meets WCAG AA (4.5:1 minimum). `--text-muted` on `--bg-surface` is `#7a7a62` → passes at ~5.2:1. Green-800 on amber-50 passes large text AA.
- **Typography:** Never use font sizes below 12px for any readable text (labels, captions). `--text-disabled` is for decorative / non-informational use only.

---

## 13. Shimmer / Skeleton Loading

```
background: linear-gradient(
  90deg,
  var(--bg-elevated) 0%,
  var(--bg-subtle) 50%,
  var(--bg-elevated) 100%
)
background-size: 200% 100%
animation: animate-shimmer

border-radius: matches the shape it replaces
  text line → --radius-sm, height: 14px or 18px
  card      → --radius-lg
  avatar    → --radius-full
```

```tsx
// src/components/ui/skeleton.tsx
<div
  className="animate-shimmer rounded-md"
  style={{ width, height }}
  aria-hidden="true"
/>
```

---

## 14. What to Remove

The following from v1 are deprecated and should be deleted:

| Removed | Reason |
|---|---|
| `--glow-primary`, `--glow-amber`, `--glow-success` | Neon glows don't suit the light theme |
| `--gradient-card-glow` (radial violet) | Replaced by natural warm shadows |
| `--primary-400` through `--primary-900` (violet ramp) | Entire violet brand replaced by green |
| `--bg-base: #0a0b0f` and all dark surfaces | Light-first system |
| `--text-inverse: #0a0b0f` | No longer needed |
| `Syne` and `DM Sans` font imports | Replaced by Fraunces + Figtree |
| `.dark` selector overrides in globals.css | Single-theme system |
| `animate-glow`, `animate-lock-bounce` | Replaced by lock-pulse and xp-pop |
| `--gradient-hero: ...#13102a...` | Replaced by warm-toned hero gradient |

---

## 15. Quick Reference Card

```
PRIMARY           #1a4031  (green-800)
PRIMARY MID       #2d6a4f  (green-600)
ACCENT            #c8703b  (terra-500)
XP COLOR          #e8a520  (amber-400)

BG BASE           #f7f5f0
BG SURFACE        #ffffff
BG ELEVATED       #efece5
BORDER DEFAULT    #ddd8ce
BORDER FOCUS      #2d6a4f

TEXT PRIMARY      #1a1a14
TEXT SECONDARY    #4a4a3a
TEXT MUTED        #7a7a62

DISPLAY FONT      Fraunces (opsz, wght axis)
BODY FONT         Figtree

CARD RADIUS       16px
BUTTON RADIUS     9999px (pill)
INPUT RADIUS      10px
MODAL RADIUS      24px

TRANSITION BASE   220ms cubic-bezier(0.25, 0.46, 0.45, 0.94)
TRANSITION SPRING 420ms cubic-bezier(0.34, 1.56, 0.64, 1)
FOCUS RING        0 0 0 3px rgba(45, 106, 79, 0.28)
```