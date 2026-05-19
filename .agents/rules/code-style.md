---
description: Formatting, naming, imports, and TypeScript conventions
alwaysApply: true
---

# Code Style

Match the existing files exactly. Prettier (`.prettierrc`) is the source of
truth — never override it inline.

## Prettier (locked)

- `semi: false` — **no trailing semicolons**
- `singleQuote: false` — **use double quotes** in TS/TSX
- `tabWidth: 2`, `printWidth: 80`, `trailingComma: "es5"`, `endOfLine: "lf"`
- Tailwind classes are auto-sorted by `prettier-plugin-tailwindcss`
  (uses `tailwindFunctions: ["cn", "cva"]`). **Do not manually reorder them.**

```tsx
// ❌ BAD
import {Button} from '@/components/ui/button';

// ✅ GOOD
import { Button } from "@/components/ui/button"
```

## File & Symbol Naming

| Kind                         | Convention                      | Example                          |
| ---------------------------- | ------------------------------- | -------------------------------- |
| Files / folders              | `kebab-case`                    | `form-layout.tsx`, `lib/auth/`   |
| React components             | `PascalCase`                    | `MainLayout`, `RoboLoader`       |
| Hooks                        | `use-*.ts(x)` + `useFoo` export | `use-unsaved-changes.ts`         |
| Types / interfaces           | `PascalCase`, suffix `Props`    | `type FormLayoutProps = { … }`   |
| Constants (module-level)     | `UPPER_SNAKE_CASE`              | `LAYOUT_VARIANT_COOKIE_NAME`     |
| SQL files                    | `NNN_snake_case.sql`            | `001_employees.sql`              |
| DB identifiers (schema/cols) | `snake_case`                    | `core.lov_categories.created_at` |

## Imports

- Order: (1) React / Next, (2) third-party, (3) `@/…` internal, (4) relative,
  (5) styles. Blank line between groups.
- Prefer **named exports**. Only use `export default` for files Next requires
  it (`page.tsx`, `layout.tsx`, `loading.tsx`, `not-found.tsx`, route handlers).
- `import type { … } from "…"` for type-only imports.

```tsx
import { useState } from "react"
import Link from "next/link"

import { cva, type VariantProps } from "class-variance-authority"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import styles from "./robo-loader.module.css"
```

## TypeScript

- `strict: true` is on — fix types, don't reach for `any` or `// @ts-ignore`.
  Use `unknown` + narrowing, or define a type.
- Define a **local `type FooProps = { … }`** above each component (see
  `components/layout/form-layout.tsx`). Use `interface` only when extending
  another interface or for cross-file shared shapes (see `types/middleware.ts`).
- For children: `React.PropsWithChildren` if that's all you need, otherwise add
  `children: React.ReactNode` to the local props type.
- Default values via destructuring, not `defaultProps`.

```tsx
type FormLayoutProps = {
  title: string
  isSubmitting?: boolean
  cancelHref: string
  children: React.ReactNode
}

export function FormLayout({
  title,
  isSubmitting = false,
  cancelHref,
  children,
}: FormLayoutProps) { /* … */ }
```

## Comments

- Use `/** … */` JSDoc for non-obvious utilities / props (see
  `lib/format-datetime.ts`, `components/loading/robo-loader.tsx`).
- **Do not narrate code** with comments like `// set state` or `// import x`.
  Comments should explain *why*, not *what*.
- SQL files start with the standard header banner (see
  `scripts/create/core/001_roles.sql`).
