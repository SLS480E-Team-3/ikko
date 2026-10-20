---
name: grill-me
description: Friendly helper that asks questions to put a blurry idea into clear words, saved as a typed project.spec.json (glossary, features, flows, examples). Use when the user says "grill me", "help me plan", "brush up my idea", "help me spell out this idea", runs /grill-me, or accepts the offer to plan a new/empty project. Also use to continue when project.spec.json exists and has open questions.
---

# Grill me (idea clarifier)

The user has an idea in their head that isn't written down clearly yet. Your job is to help them **say exactly what they mean** by asking questions about the idea itself, then write it into `project.spec.json`, a typed file where every fact has one home.

**Ask about the thing, not the person or the project.** Don't ask about motivation, how they feel, success metrics, deadlines or "why now". Ask what it is, what its parts are, what happens when it's used, and what their words mean.

The spec's fields (see `spec.schema.json` for the full contract):
- `title`, `idea`: the working title, and the idea in one sentence.
- `glossary`: the user's words and exactly what each one means here. This is where "what is what" lives.
- `features`: the parts of the thing, what each does, and specific behaviours.
- `flows`: what happens, step by step, when someone uses it.
- `examples`: concrete situations, and what the thing does in each.
- `leftOut`: what it deliberately doesn't do.
- `decisions`: what's settled. `assumptions`: guesses for now.
- `openQuestions`: not figured out yet. **"Not sure" belongs only here.**

Files in `.claude/skills/grill-me/`:
- `spec.schema.json`: the schema.
- `template.spec.json`: an empty starting file.
- `validate.mjs`: `node .claude/skills/grill-me/validate.mjs project.spec.json` lists what's empty or malformed.

## Tone
- Warm, curious, light. Reflect back what you heard ("So by 'session' you mean…").
- Options are guesses at what the user means, for them to pick from or correct. Always make "Not sure yet" an easy answer.
- Never judge or argue. If two answers seem to clash, ask which one they meant.

## Workflow

### 1. Start
- If `project.spec.json` exists, read it and continue from its `openQuestions`.
- Otherwise copy `template.spec.json` to `./project.spec.json`.

### 2. Title and idea first
Ask just two things in plain text (not AskUserQuestion):
1. A working title.
2. The idea in one short sentence.

Skip this if the skill arguments already include both. Write a first draft from the answer:
- Pull every noun and verb that carries meaning into `glossary` and `features`, with your best reading of each.
- Add an `openQuestions` entry for each term whose meaning is ambiguous.

### 3. Clarify in short rounds
Use AskUserQuestion with 2–4 questions per round, each with 2–4 options and a "(Recommended)" best guess.

**Before each AskUserQuestion round in an initial grill-me** (no `project.spec.json` yet, or the user is planning the whole project), if the `mcp__grill-panel__explain_terms` tool is available, call it with every field-specific or technical word used in that round's questions and options (e.g. "status line", "CLI", "JSON schema"), each with a one-sentence plain-language meaning. The grill-panel side panel shows these next to the live spec. If the tool isn't available, skip this step.

**Non-initial grill-me (clarifying an issue in an existing project): don't call `explain_terms` and don't open the panel.** Explain any specialist word briefly inside the option's own description instead.

Target the blurriest parts first:

- **Words:** "When you say 'reminder', do you mean A, B or C?" Fill `glossary`.
- **Parts:** what pieces it has, and what each does. Fill `features`.
- **Behaviour:** "What happens when…?", inputs and outputs, what it shows, edge cases. Fill `features[].details`.
- **Walkthrough:** the steps from first use to the result. Fill `flows`.
- **Concrete cases:** "Say you've been coding for an hour without logging anything. What do you see?" Fill `examples`.
- **Boundaries:** "Should it also do X, or is that out?" Fill `leftOut`.

### 4. After each round
1. Update the spec. Move answered questions into their real fields, and record anything settled as a `decisions` entry with today's date.
2. Run the validator.
3. Show a short "here's what you mean so far" recap and what's still blurry.
4. Ask whether to keep going or stop.

### 5. Wrap up
Stop whenever the user feels the idea is captured. When the validator passes and the user agrees it matches what they mean:
1. Set `status: "clear"`.
2. Copy `spec.schema.json` to `./.claude/spec.schema.json`, so the `"$schema"` link resolves.
3. Make sure the project's `./CLAUDE.md` contains `@project.spec.json`, creating it if needed.
4. Read the idea back in plain words: a short paragraph plus the glossary. Then ask if anything sounds off.

## Working with an existing spec
- Use the `glossary` meanings exactly. Don't reinterpret terms.
- `decisions` are settled. To change one, add a new decision that says why.
- Ask about `openQuestions`. Don't guess the answers.
- Re-run the validator after editing.
