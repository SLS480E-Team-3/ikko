---
name: make-quest
description: Plan a new quest - ask for its name and description, then run /grill-me to turn it into docs/<quest>.spec.json. Use when the user says "make quest" or asks to plan a new quest.
argument-hint: "[quest name]"
---

# Make a quest

Arguments: `$ARGUMENTS` (optional quest name).

## 1. Name and description
- Ask the user (AskUserQuestion, or plain chat if they'd rather type freely) for:
  - **Name**: the quest's name. Skip if given in `$ARGUMENTS`.
  - **Description**: a sentence or two on what the quest is.
- Turn the name into kebab-case for the file name (`Fish Market` → `fish-market`).

## 2. Grill me
- Invoke the `grill-me` skill with the name and description as the starting idea.
- Save the spec to `docs/<quest>.spec.json`, not `project.spec.json` (see CLAUDE.local.md).
- Read `docs/quests-and-levelup.md` and `docs/quest-tutorials.md` first so questions build on how quests already work.
