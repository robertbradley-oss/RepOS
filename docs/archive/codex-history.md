# Codex History Map

This repo keeps project-level memory in tracked markdown files and leaves raw Codex session logs in the user's local Codex data directory.

Raw session JSONL files can be very large and may contain private prompts, local paths, credentials, screenshots, pasted support data, or unrelated project context. Do not copy raw sessions into the repository unless Robert explicitly asks for a narrowed export that has been reviewed for sensitive data.

## Repo-Local Memory

- `PROJECT_CONTEXT.md` - product vision, UI direction, workflow rules, screen inventory, demo workspace rules, and future integration direction.
- `docs/project-backlog.md` - completed work history and remaining product/engineering tasks.
- `CHANGELOG.md` - dated implementation log for meaningful product, UI, data, and architecture changes.
- `docs/archive/design-qa.md` - archived homepage visual QA notes and screenshot evidence paths.
- `docs/backend.md` - backend contracts, persistence notes, auth/session behavior, merge rules, and smoke-test guidance.

## Global Codex Session Index

Local session index:

```text
%USERPROFILE%\.codex\session_index.jsonl
```

RepOS/Tessario/iSpring-related entries found there:

| Thread | Updated | Session file |
| --- | --- | --- |
| Update Tessario color system | 2026-05-09T05:50:44Z | `%USERPROFILE%\.codex\sessions\2026\05\09\rollout-2026-05-09T01-50-05-019e0b49-2d04-73f0-9a5d-7d290c4e8d55.jsonl` |
| Improve Tessario Assist | 2026-05-09T14:33:45Z | `%USERPROFILE%\.codex\sessions\2026\05\09\rollout-2026-05-09T10-33-02-019e0d27-f4a9-7001-8e52-d44eb2c619b5.jsonl` |
| Polish Tessario UI | 2026-05-09T19:16:47Z | `%USERPROFILE%\.codex\sessions\2026\05\09\rollout-2026-05-09T15-16-01-019e0e2b-0890-7010-ac04-ebf33183d897.jsonl` |
| Fix Tessario scrolling | 2026-05-12T01:17:15Z | `%USERPROFILE%\.codex\sessions\2026\05\11\rollout-2026-05-11T21-16-27-019e19c1-bdbe-76e0-90af-d8e23b40a345.jsonl` |
| Build iSpring Support Trainer | 2026-05-21T01:05:40Z | `%USERPROFILE%\.codex\sessions\2026\05\20\rollout-2026-05-20T21-05-29-019e4810-c8a4-7062-9058-653edfc3e8e1.jsonl` |
| Polish iSpring Support UI | 2026-05-21T02:57:14Z | `%USERPROFILE%\.codex\sessions\2026\05\20\rollout-2026-05-20T22-57-08-019e4877-11f6-7b00-8b45-930633279766.jsonl` |
| Design RepOS homepage | 2026-06-30T02:01:38Z | `%USERPROFILE%\.codex\sessions\2026\06\29\rollout-2026-06-29T22-01-08-019f1642-3f72-7391-bcdd-07ce2f2be8c3.jsonl` |
| Locate RepOS iSpring login | 2026-07-04T12:16:24Z | `%USERPROFILE%\.codex\sessions\2026\07\04\rollout-2026-07-04T08-16-08-019f2d0e-bd48-7e62-bed1-7441624d48f5.jsonl` |

## Related Prompt Attachments

RepOS-related pasted prompts and handoffs were also found under:

```text
%USERPROFILE%\.codex\attachments\*\pasted-text.txt
```

Useful search pattern:

```powershell
Get-ChildItem -Force -Recurse "$env:USERPROFILE\.codex\attachments" -File -Filter pasted-text.txt |
  Select-String -Pattern "RepOS|REPOS HANDOFF REPORT|Tessario|iSpring"
```

Some attachment files include real support-ticket URLs, review text, customer names, or pasted operational context, so review and redact before moving any attachment content into tracked docs.

## Recovery Workflow

When a future Codex session needs prior context:

1. Read `PROJECT_CONTEXT.md`, `docs/project-backlog.md`, `CHANGELOG.md`, and `docs/backend.md`.
2. Check this history map for the relevant thread title and session path.
3. If exact chat context is needed, inspect the local JSONL session file outside the repo.
4. Promote only durable, non-sensitive decisions or summaries into tracked markdown.
