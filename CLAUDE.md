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

## After edit
under edited line or block include technical approach
