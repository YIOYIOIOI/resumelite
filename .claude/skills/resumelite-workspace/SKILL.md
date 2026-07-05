---
name: resumelite-workspace
description: Use when creating, updating, or tailoring a resume inside THIS ResumeLite project — reading the local experience library as source material and writing resumes through the project's local API and schema. This is the project-mechanics skill; for the resume-writing/tailoring craft itself (bullet quality, JD matching, phrasing), compose with the resume-tailor or tailored-resume-generator skills. Does not duplicate resume-writing guidance.
---

# ResumeLite Workspace

How to operate this project's local resume + experience data. **This skill is only the mechanics of applying resume content to this project. For how to actually write/tailor a resume, use the `resume-tailor` or `tailored-resume-generator` skill and hand the drafted content back here to persist.**

## Prerequisite: the local server must be running

Persistence is a Vite middleware, not a cloud backend. Confirm the API is reachable:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/local/resumes
```

If it is not `200`, ask the user to run `pnpm dev` (or `pnpm start`). Never hand-edit `data/local/*.json` while the server runs — go through the API so writes are validated and atomic, and so the app refreshes live.

## Data map

- `data/local/experiences.json` — the **project experience library**: the factual source material. Read it via the API.
- `data/local/resumes.json` — resumes. Read/write via the API.
- Schema of a resume: `packages/schema/src/resume/data.ts` (`ResumeData` + item schemas: `experienceItemSchema`, `projectItemSchema`, `skillItemSchema`, `educationItemSchema`, etc.) and `packages/schema/src/resume/default.ts` (a valid empty skeleton). A valid resume is a valid skeleton with content sections filled.

## Read the experience library (source material)

```bash
curl -s http://localhost:3000/api/local/experiences        # list (id, name, slug, tags, nature, stage)
curl -s http://localhost:3000/api/local/experiences/tags   # tags
curl -s http://localhost:3000/api/local/experiences/<id>   # full record incl. data (role, period, summary, details, techStack, link)
```

Each record is one project the user really worked on. Treat its fields as **facts**; do not invent projects, employers, dates, or metrics beyond what is recorded.

## Create a tailored resume (the safe recipe)

1. Read the JD from the user and the relevant experience records.
2. Pick a **base resume** for style (ask the user, or default to the most recently updated one) and duplicate it so the new resume inherits template/design/layout/typography:
   ```bash
   curl -s -X POST http://localhost:3000/api/local/resumes/<baseId>/duplicate \
     -H "Content-Type: application/json" \
     -d '{"name":"<Role> — <Company>","slug":"<role>-<company>-<short>","tags":["tailored"]}'
   ```
   (If there is no base resume, create a fresh one: `POST /api/local/resumes` with `{name, slug, tags}` — it starts from the default skeleton.)
3. **Hand the JD + the chosen experience records to `resume-tailor` / `tailored-resume-generator`** to draft the content. That skill owns the writing.
4. Map the drafted content onto `ResumeData` sections (basics from the base; a tailored `summary`; `sections.experience.items` / `sections.projects.items` built from the real experience records; `sections.skills.items` from their techStacks), keeping the skeleton's metadata.
5. Persist by patching the duplicated resume's `data`:
   ```bash
   curl -s -X PATCH http://localhost:3000/api/local/resumes/<newId> \
     -H "Content-Type: application/json" \
     -d '{"data": <the full ResumeData object>}'
   ```
6. Report the new resume's name/id/slug. It appears **live** in the running app (the dashboard and builder auto-refresh via the app's SSE live-reload).

## Project-specific guardrails

- Draw only from facts in the experience library and the base resume. If the JD needs something the library does not contain, **tell the user and suggest adding it to the experience library** (`/dashboard/experiences`) rather than inventing project-specific claims.
- Match the language of the base resume / JD.
- Do not restate general resume-writing advice here — that is the official skill's job.

## Verifying the write

After patching, `GET /api/local/resumes/<newId>` and confirm the record round-trips (the store drops structurally invalid resumes on read, so a missing/blank result means the `data` was malformed — re-check it against `ResumeData`).
