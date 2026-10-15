# page (MobDev)

Two route files.

## `src/app/MobDev/page.tsx`

- **Topic:** mobile-testing
- **Purpose:** `/MobDev`: static list of screen links.

### `MobDevList` (default export)

**Input:** none. **Output:** JSX: one `<Link prefetch={false}>` per `SCREEN_TYPES` entry. **Side effects:** none.

**Used in:** Next route `/MobDev`; linked from `src/app/form.tsx` (`Form`, MobDev button) and `ScreenHost`'s `onLeave`.

## `src/app/MobDev/[screen]/page.tsx`

- **Topic:** mobile-testing
- **Purpose:** `/MobDev/<ScreenType>`: static page per screen.

### `generateStaticParams`

**Input:** none. **Output:** `{ screen }[]`: one per `SCREEN_TYPES` entry. Used by Next at build time. With `dynamicParams = false`, other names are a 404.

### `MobDevScreen` (default export)

**Input:** `params: Promise<{ screen: string }>`. **Output:** `<Suspense><ScreenHost screen /></Suspense>`. **Side effects:** none.

**Used in:** Next route `/MobDev/[screen]`; linked from `src/app/MobDev/page.tsx` and `src/app/form.tsx` (quest buttons).
