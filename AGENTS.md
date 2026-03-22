# AGENTS.md

Repository-wide agent instructions for this project. Use this file for collaboration rules that should persist across sessions and tools.

## Instruction Scope

- Follow `CLAUDE.md` for project and implementation context.
- Use this file for collaboration and response-discipline rules.

## Channel Discipline

- Assume the user may see both `commentary` and `final`.
- Put substantive user-facing content only in `final`.
- Treat substantive content as: answers, clarifying questions, recommendations, design discussion, and anything the user is expected to respond to.
- Use `commentary` only for brief progress updates while tools are running or longer work is in progress.
- Never repeat the same substantive text in both `commentary` and `final`.
- If no tool work is happening, do not send `commentary`.
- If a progress update is necessary, keep it status-only and not phrased as the actual answer.

## Preferred Pattern

- `commentary`: "Checking the chart code now."
- `final`: actual answer or question to the user

## Failure Mode To Avoid

- Do not send a clarifying question in `commentary` and then repeat it in `final`.
- Do not use `commentary` as a draft response.
