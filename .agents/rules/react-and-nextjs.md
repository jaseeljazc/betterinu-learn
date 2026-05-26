---
trigger: always_on
description: React 19 / Next.js 16 component, hook, layout, and tenant-routing patterns
globs: app/**/*.{ts,tsx},components/**/*.{ts,tsx},hooks/**/*.{ts,tsx},context/**/*.{ts,tsx},middleware/**/*.{ts,tsx},middleware.ts
---

# React & Next.js Patterns

## Server vs Client Components

- Default to **Server Components**. Only add `"use client"` when the file uses
  state, effects, refs, browser APIs, event handlers, or context.
- The `"use client"` directive is the **first line** of the file, followed by a
  blank line.
- Server-only files (e.g. `lib/auth/firebase-admin.ts`, `app/api/**/route.ts`)
  must NEVER end up in a client bundle — keep their imports server-side.

### RSC → Client prop boundary (don't break it)

A Server Component may pass only **plain serializable values** as props to a
Client Component. React component references (e.g. `@tabler/icons-react`
icons, anything with `$$typeof` / `render` / `forwardRef`) are NOT plain
objects and will throw at render time:

> Only plain objects can be passed to Client Components from Server Components.

Common offenders in this repo:

- `MenuNavbarItem.icon`, `MenuSidebarItem.icon`, `HeaderBreadcrumbItem.icon`
- `brand.icon` for `NavbarLayout` / `AppNavbar`
- Any `ComponentType<SVGProps<SVGSVGElement>>` field in a config array

There are two valid fixes — pick based on what else the file needs to do.

### Fix A (preferred for tenant layouts) — re-export icons through a `"use client"` boundary file

Anything exported from a `"use client"` file is registered as a Client
Component module reference at build time. Server Components can then import
those references and pass them across the RSC → Client boundary as props.

`components/navbar/icons.ts` exists for exactly this:

```ts
"use client"

export {
  IconLayoutDashboard,
  IconUsers,
  // …add new icons here as tenant navs grow
} from "@tabler/icons-react"
```

This lets the layout stay a **Server Component** (so it can call
`getCurrentEmployee()` and `redirect()` synchronously) while still passing
icon refs into `NavbarLayout`. The admin tenant uses this pattern:

```tsx
// app/admin/(home)/layout.tsx — Server Component, no "use client"
import { redirect } from "next/navigation"

import { IconLayoutDashboard, IconUsers } from "@/components/navbar/icons"
import { NavbarLayout } from "@/components/layout/navbar-layout"
import { getCurrentEmployee } from "@/lib/auth/session"

export default async function Layout({ children }: React.PropsWithChildren) {
  const employee = await getCurrentEmployee()
  if (!employee) redirect("/auth/login")

  return (
    <NavbarLayout
      navItems={[
        { title: "Dashboard", url: "/", icon: IconLayoutDashboard, exact: true },
        { title: "Students", url: "/students", icon: IconUsers },
      ]}
      user={{ name: employee.name, email: employee.email, initials: "AM" }}
    >
      {children}
    </NavbarLayout>
  )
}
```

Importing the icons directly from `@tabler/icons-react` here would still
break — they must come from the `"use client"` re-export.

### Fix B — mark the wrapper itself as `"use client"`

Use this when the wrapper has no server-only work to do (no DB calls, no
cookie reads, no `redirect()` from `next/navigation`). The student tenant
layout currently uses this style.

```tsx
"use client"

import { IconUsers } from "@tabler/icons-react"
import { NavbarLayout } from "@/components/layout/navbar-layout"
// …
```

```tsx
// app/admin/(home)/page.tsx — RSC
import { PageHeader } from "@/components/admin/page-header"

export default async function Page() {
  return (
    <div className="flex min-h-0 w-full flex-col gap-6 p-4 sm:p-6">
      <PageHeader title="Workspace overview" />
      {/* … */}
    </div>
  )
}
```

## App Router File Conventions

- Tenant trees live under `app/admin/` and `app/student/`. The route group
  `(home)` attaches the authed `NavbarLayout` shell without affecting the URL.
- Each route directory may export `page.tsx`, `layout.tsx`, `loading.tsx`,
  `not-found.tsx`, `error.tsx`, `route.ts`. Use `export default` for these.
- `loading.tsx` should render `<RoboLoader fill caption="…" />` for branded
  fallbacks (see `app/admin/(home)/loading.tsx`).
- Dynamic params are `Promise`-typed in Next 16:
  ```ts
  export default async function Page({
    params,
  }: {
    params: Promise<{ courseId: string }>
  }) {
    const { courseId } = await params
  }
  ```

## Layout Choice

| Use case                          | Layout component                            |
| --------------------------------- | ------------------------------------------- |
| Authed admin or student tenant    | `NavbarLayout` (top bar)                    |
| Authed legacy / sidebar feature   | `MainLayout` (sidebar + breadcrumbs)        |
| Forms with sticky save/cancel bar | `FormLayout` (wraps content + footer)       |
| Login / forgot pages              | `AuthLayout` (two-column shell)             |

`NavbarLayout` accepts `navItems`, `user`, optional `brand` and
`breadcrumbItems`. `MainLayout` is still used for sidebar-driven feature
spaces. Always reuse these — do not assemble shells inline in pages.

```tsx
// app/admin/(home)/layout.tsx
import { NavbarLayout } from "@/components/layout/navbar-layout"

const navItems = [
  { title: "Dashboard", url: "/", icon: IconLayoutDashboard, exact: true },
  { title: "Students",  url: "/students", icon: IconUsers },
]

export default function Layout({ children }: React.PropsWithChildren) {
  return (
    <NavbarLayout navItems={navItems} user={stubUser}>
      {children}
    </NavbarLayout>
  )
}
```

## Tenant Detection in Server Code

Never re-parse the `host` header. Read the `x-tenant` header set by middleware:

```ts
import { headers } from "next/headers"
import { TENANT_HEADER, type Tenant } from "@/lib/tenant"

export async function getCurrentTenant(): Promise<Tenant | null> {
  const h = await headers()
  const value = h.get(TENANT_HEADER)
  return value === "admin" || value === "student" ? value : null
}
```

In Edge middleware (`middleware.ts`) the rules are different — there you must
use `getTenantFromHost(request.headers.get("host"))`.

## Component Authoring

- Named function components only (no `React.FC`, no arrow-default-export).
- Props type defined immediately above with the suffix `Props`.
- One component per file; co-locate small helpers (e.g. `LayoutPreviewSidebar`
  inside `theme-modal.tsx`) only when they're not reused.
- Compose existing primitives from `@/components/ui/*` rather than reimplementing
  buttons, dialogs, dropdowns, etc.
- Page bodies follow the standard wrapper:

  ```tsx
  <div className="flex min-h-0 w-full flex-col gap-6 p-4 sm:p-6">
    <PageHeader title="…" description="…" actions={<…/>} />
    {/* sections */}
  </div>
  ```

## Hooks

- Files in `hooks/` are `use-*.ts(x)` and export the hook as a named export.
- Re-export third-party / shadcn-internal hooks (e.g. `use-mobile`) through
  `hooks/` to keep import paths stable (`@/hooks/use-mobile`).
- Reach for `useCallback` / `useMemo` only when memoization is justified
  (downstream context value, expensive compute) — see `context/layout-provider.tsx`.

## Context Providers

- Live in `context/<name>-provider.tsx` and `"use client"`.
- Export both the `XProvider` component and a `useX()` hook. The hook MUST
  throw a clear error if used outside its provider.

### Global providers (mounted in `app/layout.tsx`)

These are wrapped around every page exactly once. **Do not re-wrap them in
inner layouts** — that creates duplicate provider trees and breaks cookie /
theme persistence:

```
<ThemeProvider>          // next-themes
  <LayoutProvider>       // sidebar variant + collapsible (cookie-backed)
    <TooltipProvider>    // shared tooltip portal
      <NavigationProgress />
      {children}
    </TooltipProvider>
  </LayoutProvider>
</ThemeProvider>
```

`LayoutProvider` is required by `SettingsDialog` (theme-modal), which is
rendered from both the sidebar (`FooterSidebar`) and the navbar
(`UserMenuNavbar`). If you build a new shell that surfaces the settings
dialog, **don't wrap your shell in `LayoutProvider` again** — it's already
available at the root.

## API Route Handlers

- Place under `app/api/<domain>/<endpoint>/route.ts` and export named HTTP
  verbs: `export async function POST(req: NextRequest) { … }`.
- Route handlers are tenant-agnostic by default. If a handler must behave
  differently per tenant, branch on the `x-tenant` request header (see above).
- Use the shared types in `types/middleware.ts` (`ApiHandler`, `Middleware`,
  `MiddlewareContext`) when wrapping with middleware.
- Initialize Firebase Admin via `getAdminAuth()` / `adminAuth` from
  `@/lib/auth/firebase-admin` — never `initializeApp` inline.
- Read DB through `prisma` from `@/lib/db` — do not instantiate `PrismaClient`
  ad-hoc (it would break the dev hot-reload singleton).



Always use Tailwind CSS and shadcn components for all styling and components. 
