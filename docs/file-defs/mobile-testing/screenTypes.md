# screenTypes

- **Path:** `src/app/MobDev/screenTypes.ts`
- **Topic:** mobile-testing
- **Purpose:** The list of `/MobDev/<ScreenType>` names, shared by the server pages and the client host.

## Exports

### `SCREEN_TYPES`

Readonly tuple of the 10 screen-type names (PascalCase).

**Used in**

| Topic | File | Where |
| --- | --- | --- |
| mobile-testing | `src/app/MobDev/page.tsx` | `MobDevList` (one link per name) |
| mobile-testing | `src/app/MobDev/[screen]/page.tsx` | `generateStaticParams` |

### `ScreenType`

Type: union of the `SCREEN_TYPES` strings.

**Used in**

| Topic | File | Where |
| --- | --- | --- |
| mobile-testing | `src/app/MobDev/[screen]/screenHost.tsx` | `SCREENS` keys, `ScreenHost` prop |
| mobile-testing | `src/app/MobDev/[screen]/page.tsx` | cast of `params.screen` |
