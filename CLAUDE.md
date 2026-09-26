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

## Plan mode

Every plan includes a parallelism section that follows the Parallelism rules below:
- **Agent count:** how many sub-agents will run (or none, if the work is too small or too interdependent to split).
- **Work split:** break the work into independent chunks.
- **Assignments:** for each agent, list its task and the exact files it owns.
- **Order:** which agents run in parallel, which must wait for another, and what the main session does itself (e.g. shared files, final integration, verification).

## Parallelism

Sub-agents are allowed once a plan-mode plan has been accepted. Before that (while exploring or planning), work inline without spawning sub-agents.

Sub-agents must not step on each other's feet:
- **File ownership:** each file is edited by at most one agent. Files touched by several tasks (shared types, index files, `CLAUDE.md`, `README`) are edited by the main session only, before or after the agents run.
- **Stay in scope:** an agent edits only the files assigned to it. If it needs a change elsewhere, it reports that back instead of making it.
- **No shared side effects:** agents don't run git commands (commit, checkout, stash, reset), install packages, or start/stop dev servers. The main session handles those.
- **Dependencies:** if one task needs another's output (e.g. new types), run them in sequence, not in parallel.
- **Integrate after:** once all agents finish, the main session reviews their changes together and runs `npx tsc --noEmit` before reporting done.

## After edit

if completely new code
- under edited line or block include technical approach

if fix
- behind edited line and format as 'method: **before** -> **after**, mechanism: how it works'

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
