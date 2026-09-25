# Ikko!! (いっこ〜！！)

## What this is

A Japanese-learning web app for English speakers who are just starting to learn Japanese. Built for SLS480E Team 3.

- **Primary platform: mobile web.** Design and build mobile-first — that's the main target for v1.
- **Secondary platform: laptop/desktop web.** Comes later, as a responsive extension of the mobile experience, not a separate build.
- **Audience: absolute beginners.** English speakers with little to no prior Japanese. Favor plain language, romaji/furigana support, and gentle onboarding over assuming any existing kana/kanji literacy.

## Stack

- **Framework:** Next.js (App Router) + React 19 + TypeScript
- **Backend/DB/Auth:** Supabase (`@supabase/supabase-js`, `@supabase/ssr` for cookie-based auth in Next.js)
- **Hosting:** Vercel
- **Styling:** CSS Modules (see `src/app/form.module.css`)

## Conventions

- Path alias `@/*` maps to `src/*` (see `tsconfig.json`).
- Client components are marked `'use client'` explicitly (see `src/app/page.tsx`).
- Keep mobile-first CSS: design for small viewports first, then extend with larger breakpoints for the future desktop target.

## Status

Early scaffold stage — routing/layout and a placeholder form/nav exist (`src/app/form.tsx`), but core learning features (lessons, kana/kanji practice, progress tracking) are not built yet. Supabase project/env vars are not yet wired up (`.env` is currently empty).

## GH Issues and Branch Naming

Branch name is `IssueX` for issue #X (ex: issue #1 → branch name `Issue1`). This is a denotation, not an order.

## After edit

if completely new code
- under edited line or block include technical approach

if fix
- behind edited line and format as 'method: **before** -> **after**, reason: what its doing, mechanism: how it works'

## Compact instructions

Auto-compact threshold is 120k (60% of 200K), set by the user with `/autocompact 120k`. Before every compact, a `PreCompact` hook (`.claude/hooks/archive-transcript.sh`) saves the full transcript to `.claude/history/`.

Skip the archive for a manual compact with `/compact nosave`. Plain `/compact` and auto compacts always archive.

When compacting, the summary must keep:
- every file created/edited/deleted, with a one-line reason
- decisions the user made or confirmed, and corrections they gave
- commits made (hash + message)
- open issues, loose ends, and the task in progress

## File
files that are development purposes should have 'DEV' in the first line
```ts
// DEV
'use client'
```
