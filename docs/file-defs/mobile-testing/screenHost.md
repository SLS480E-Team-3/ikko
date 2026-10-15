# screenHost

- **Path:** `src/app/MobDev/[screen]/screenHost.tsx`
- **Topic:** mobile-testing
- **Purpose:** Client host that lazy-loads one screen and renders it full-screen with the URL settings.

## Functions

### `ScreenHost` (default export)

Renders `SCREENS[screen]` in a `100% x 100lvh` wrapper.

**Input**

| Name | Type | Meaning |
| --- | --- | --- |
| `screen` | `ScreenType` | Which screen to show |

Reads `?island` (int, default 1) and `?sens` (number or `undefined`) via `useSearchParams`.

**Output:** JSX: the chosen screen with `island`, `sensitivity`, `onLeave`.

**Side effects:** fetches the screen's JS chunk on first render; `onLeave` does `router.push('/MobDev')`.

**Used in**

| Topic | File | Where |
| --- | --- | --- |
| mobile-testing | `src/app/MobDev/[screen]/page.tsx` | `MobDevScreen` (inside `<Suspense>`) |

### `SCREENS` (module const)

`Record<ScreenType, ComponentType<ScreenProps>>`; each value is `next/dynamic(..., { ssr: false })`. Quest and island entries adapt `ScreenProps` to the component's own props; form pages take none.

### `toNum`

`(v: string | null) => number | undefined`: query value to number; empty or not a number gives `undefined`. Used only in `ScreenHost`.
