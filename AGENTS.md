<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Green Room GRC App Guide

## Purpose

This is **Green Room CRM**, a private CRM, METRC inventory, product catalog, sales-order, invoice, and payment lifecycle app for Green Room Cannabis.

Use this file as the first source of project context. `./CLAUDE.md` only references `./AGENTS.md`. `./README.md` is still default create-next-app boilerplate and should not be treated as app-specific truth.

## Stack

- **Runtime/app**: Next.js `16.3.0` App Router, React `19.2.8`, TypeScript strict mode.
- **Styling/UI**: Tailwind CSS v4 via `./src/app/globals.css`, Headless UI, Heroicons, Lucide, Motion, custom primitives in `./src/components/ui`.
- **Backend**: Firebase Auth, Firebase Admin SDK, Firestore, Cloud Storage, Firebase Functions v2.
- **Validation/forms**: Zod schemas in `./src/lib/domain/schemas.ts`; forms submit `FormData` to Server Actions.
- **Tests**: Vitest in Node environment; tests are colocated under `./src/**/*.test.ts`.

## Commands

- **Dev**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Typecheck**: `npm run typecheck`
- **Tests**: `npm run test`
- **Functions build**: `npm --prefix functions run build`
- **Firebase emulators**: configured in `./firebase.json` for Auth `9099`, Firestore `8080`, Storage `9199`, UI `4000`; use Firebase CLI when needed.

After code changes, run `npm run lint` and `npm run typecheck`. Run `npm run test` for domain/data/business-logic changes. Run `npm run build` for App Router/build-sensitive changes. Run the functions build when touching `./functions`.

## Next.js 16 Rules To Remember

- Before writing Next-specific code, read the relevant file in `./node_modules/next/dist/docs/`.
- `params` and `searchParams` props are Promises; await them in Server Components.
- `LayoutProps`, `PageProps`, and `RouteContext` are generated global helpers after Next type generation.
- Pages are Server Components by default. Add `'use client'` only for state, effects, event handlers, browser APIs, or client-only libraries.
- Props crossing a client boundary must be serializable.
- Server Actions live in dedicated `actions.ts` files with top-level `'use server'`.
- `./src/app/(authenticated)/layout.tsx` uses `export const dynamic = "force-dynamic"` and calls `requireUser()` before rendering `AppShell`.

## Project Map

- `./src/app`: App Router routes, layouts, API route handlers, and route-local Server Actions/dialog helpers.
- `./src/app/api/auth`: session-cookie endpoints used after Firebase Google sign-in.
- `./src/components/layout`: app shell, sidebar, route navigation, page header.
- `./src/components/ui`: reusable primitives; prefer these before adding new UI abstractions.
- `./src/components/{auth,brands,company,products,sales,strains,users}`: feature tables, forms, dialogs, and client widgets.
- `./src/lib/auth`: session cookies, current-user helpers, role gates, allowed-email checks.
- `./src/lib/firebase`: Firebase client and admin initialization.
- `./src/lib/env.ts`: Zod-validated environment access.
- `./src/lib/domain`: shared constants, types, schemas, formatting, company slugs, phone helpers.
- `./src/lib/data`: server-only Firestore/Storage data layer and app business operations.
- `./src/lib/metrc`: METRC spreadsheet parsing and inventory grouping.
- `./src/lib/sales`: pure sales/order/invoice/package-status helpers.
- `./src/lib/crm`, `./src/lib/users`, `./src/lib/types`, `./src/lib/sales/*-service.ts`: thin re-export facades; prefer the concrete `./src/lib/data`, `./src/lib/domain`, and `./src/lib/sales` modules for new code unless matching existing imports.
- `./functions`: Firebase Functions v2, currently health check plus an interaction-created trigger.
- `./inspiration`: reference-only Catalyst UI kit and sample files; do not edit unless explicitly asked.

## Routes

- `/`: redirects to `/dashboard` when authenticated, otherwise `/login`.
- `/login`: Firebase Google sign-in UI.
- `/dashboard`: operational overview; Guest users receive an empty view.
- `/companies`: searchable company list; `?newCompany=1` opens create dialog.
- `/companies/[companyId]`: company detail. `[companyId]` is a canonical slug from company name/city; `./src/app/(authenticated)/companies/[companyId]/company-route.ts` redirects stale slugs.
- `/companies/[companyId]/contacts`: contacts list; `?contact=` opens the view/edit dialog.
- `/companies/[companyId]/orders`: orders for one company.
- `/companies/[companyId]/activity`: interactions and replies.
- `/sales`: searchable/filterable orders by status.
- `/sales/create`: creates pending orders from available METRC packages.
- `/sales/[orderId]`: order detail, status actions, package edits, invoice, discounts, payments, activity.
- `/inventory`: available package groups from METRC sync.
- `/inventory/[group]`: package rows for one inventory group hash.
- `/brands`, `/strains`, `/products`: sales catalog settings; `?brand=`, `?strain=`, `?product=` open create/edit dialogs.
- `/users`: Manager/Admin-only user profile and role management; `?user=` opens edit dialog.
- `/profile`: current user's app-only display settings.

## Auth And Authorization

- Login uses Firebase client Auth with a Google provider in `./src/lib/firebase/client.ts` and posts the Firebase ID token to `POST /api/auth/session`.
- Server sessions are Firebase Admin session cookies named `__session`, max age 5 days, implemented in `./src/lib/auth/session.ts`.
- Access requires a verified email in `FIREBASE_ALLOWED_DOMAIN`, defaulting to `greenroomcannabis.com`.
- Roles are `Guest`, `Employee`, `Manager`, `Admin` from `./src/lib/domain/types.ts`.
- Use these gates:
  - `getCurrentUser()` for optional auth.
  - `requireUser()` for any authenticated user.
  - `requireNonGuest()` for operational CRM/sales/inventory access.
  - `requireManagerOrAdmin()` for restricted create/update/archive/admin operations.
  - `requireAdmin()` for Admin-only operations.
  - `canManageRestrictedResources()` for UI affordances.
- Initial seeded admins are in `./src/lib/data/profiles.ts` and should remain Admin-locked.

## Data Model And Firestore

Use the server-only data layer. Do not import Firebase Admin modules into Client Components.

Main collections:

- `companies`: company account records with canonical `slug`, nested `contacts`, nested `interactions`, and nested interaction `entries`.
- `users`: synced app profiles and roles.
- `packages`: active/inactive METRC package records.
- `orders`: order documents with nested `activity` records and embedded invoice/payment data.
- `brands`, `strains`, `products`: sales catalog settings, each with nested `activity` audit rows.

Key conventions:

- `FirestoreRecord<T>` is `{ id, data }`.
- Use `now()`, `listCollection()`, `getDocument()`, `docIdFromTag()`, `millis()`, and `normalizedText()` from `./src/lib/data/firestore.ts`.
- Money is stored as integer cents. Zod helpers convert money strings to cents.
- Form validation belongs in `./src/lib/domain/schemas.ts`; shared shape definitions belong in `./src/lib/domain/types.ts`.
- Server-side Admin SDK writes bypass Firestore/Storage rules. If adding client-side Firestore/Storage access, update `./firestore.rules` or `./storage.rules` first.

## Business Domains

### CRM

- `./src/lib/data/crm.ts` owns companies, contacts, primary contact selection, interactions, replies, slug backfill, and company search.
- Company routes use `companyPath()` and `companyUrlSegment()` from `./src/lib/domain/company-slug.ts`.
- `./functions/src/index.ts` has `onInteractionCreated`, which updates `last_interaction_at`, `last_interaction_method`, `interaction_count`, and `updated_at` on the parent company.

### Inventory And METRC

- `./src/lib/metrc/metrc-spreadsheet-parser.ts` parses the first worksheet of uploaded `.xlsx` METRC exports using tolerant column aliases.
- `./src/lib/data/inventory.ts` uploads files to Storage under `metrc-uploads/YYYY/MM/DD/active-packages-<uuid>-<safeName>`, parses packages, maps them to Products, upserts active packages, and deactivates packages absent from the latest upload.
- METRC uploads must be `.xlsx` and at most 20 MB.
- Product mapping matches normalized Product name, SKU, or UPC. Ambiguous mappings throw; uploaded item rows that cannot map to a Product throw. Tag-only rows can preserve existing mappings.
- Package document IDs are derived from package tags by replacing `/` with `_`.
- Package availability is derived from orders via `./src/lib/data/package-status.ts` and `./src/lib/sales/package-status.ts`; use `listPackages()` when status matters.
- Inventory groups are SHA-1 keys from product-or-item plus source package, implemented in `./src/lib/metrc/inventory-grouping.ts`.

### Sales, Orders, Invoices, Payments

- `./src/lib/data/orders.ts` owns order creation, transitions, invoice generation, delivery, payments, discounts, package edits, close/reopen, deletion, and activity logging.
- Order numbers start at `1501`; order document IDs are `order-<number>`.
- Order items snapshot package fields at order creation/edit time. Do not read current package docs to reconstruct historical order contents.
- Order statuses are `pending`, `approved`, `delivered`, `paid`, `rejected`, `cancelled`, and `delivery_rejected`; state is `open` or `closed`.
- Legal transitions and available actions are in `./src/lib/sales/order-status.ts`.
- Releasing statuses are `rejected`, `cancelled`, and `delivery_rejected`; consuming statuses derive package status as `pending` or `sold`.
- Approval creates an invoice. Delivery can set invoice due dates from terms. Payments recalculate invoice totals and can auto-mark delivered orders as `paid`; deleting/updating payments can reopen paid orders to `delivered` when balance is due.
- Packages from the same source package must keep consistent implied unit pricing; see `assertSameSourcePrice()` in `./src/lib/sales/pricing.ts`.

### Sales Catalog

- `./src/lib/data/sales-settings.ts` owns Brands, Strains, Products, archive operations, and audit activity.
- Updates/archive operations require an edit reason through `editReasonSchema`.
- Products reference one Brand and one or more Strains. Product unit base price is cents per inventory unit and is used to prefill package prices.
- Archived Brands/Strains remain included when existing Products reference them.

## Mutation Pattern

For a route mutation:

1. Add or reuse an action in the route's `actions.ts` with top-level `'use server'`.
2. Call the appropriate auth gate first.
3. Parse `FormData` with a Zod schema from `./src/lib/domain/schemas.ts`; use `formEntries()`, `packageTagsFromForm()`, and `packagePricesFromForm()` when relevant.
4. Call a server-only data function from `./src/lib/data`.
5. `revalidatePath()` every affected list/detail page.
6. `redirect()` when the URL should change after mutation.
7. For client dialogs using `useActionState`, wrap the redirect-free action with a `{ error, success }` return shape and close the dialog with `router.replace(closeHref, { scroll: false })` on success.

## UI Patterns

- Use `PageHeader` for page title/actions.
- Use `Button`, `buttonClasses`, and `TouchTarget` from `./src/components/ui/button.tsx`.
- Use `Card`, `Table`, `Badge`/`StatusBadge`, `Dialog`, `Dropdown`, `Field`/`Input`/`Select`/`Textarea`, `TableSearch`, and `SearchableSelect` primitives before creating new primitives.
- Query-string driven modals are common for settings and detail tables; preserve existing filter query params when opening/closing.
- Row-wide clickable tables use absolute `Link` overlays inside cells; copy an existing table pattern before inventing a new one.
- Tailwind theme colors are custom purple and emerald scales. Dark mode is controlled by the root `.dark` class and localStorage key `theme` in the sidebar.
- The root layout uses the Jost Google font and injects a before-interactive theme script.

## Style Conventions

- Use TypeScript strict types and the `@/*` path alias.
- Follow nearby file style for quote choice, indentation, and formatting; the current codebase has mixed single/double quotes by area.
- Keep files kebab-case; exported React components are PascalCase.
- Avoid comments unless explicitly requested.
- Prefer Server Components and Server Actions over new API routes, except for auth/session endpoints or external webhooks.
- Keep server-only code in `./src/lib/data`, `./src/lib/firebase/admin.ts`, or other modules importing `server-only`.
- Client Components must not import server-only modules or non-serializable data.

## Environment

See `./.env.example` and `./src/lib/env.ts`.

- Client Firebase variables: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, optional `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST`.
- Server variables: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_ALLOWED_DOMAIN`, `FIREBASE_USE_EMULATORS`, emulator hosts, optional `GOOGLE_MAPS_API_KEY`.
- Service account values must be all present together; private keys may contain escaped `\n`.
- When `FIREBASE_USE_EMULATORS=true`, all emulator host variables are required; when false, emulator host variables must be empty.

## Tests

- Vitest config is `./vitest.config.mts` with alias `@ -> ./src`, Node test environment, and include pattern `./src/**/*.test.ts`.
- Mock `server-only` as `{}` in tests for server-only modules.
- Existing tests cover domain schemas, phone/company slug helpers, METRC parser/grouping, inventory product mapping, profiles, sales settings audit helpers, pricing, invoice math, order transitions, and package status.
- Add focused unit tests near changed pure/domain/data logic. UI tests are not currently established even though Testing Library and Playwright are installed.

## Token-Saving Research Tips

- Start with the route page under `./src/app` and the matching feature components under `./src/components`.
- For mutations, read the route's `actions.ts`, the matching Zod schema, and the data function it calls.
- For order bugs, usually read `./src/lib/data/orders.ts`, `./src/lib/sales/order-status.ts`, `./src/lib/sales/invoice.ts`, `./src/lib/sales/pricing.ts`, and the relevant `./src/app/(authenticated)/sales` page/dialog.
- For inventory bugs, usually read `./src/lib/data/inventory.ts`, `./src/lib/metrc/metrc-spreadsheet-parser.ts`, `./src/lib/metrc/inventory-grouping.ts`, and the relevant inventory page.
- For catalog bugs, usually read `./src/lib/data/sales-settings.ts`, the matching route `actions.ts`, and the matching component folder.
- Avoid reading `./package-lock.json`, `./.next`, `./node_modules`, `./inspiration`, and generated `./functions/lib` unless directly needed. The exception is Next.js docs under `./node_modules/next/dist/docs/` before writing Next code.
