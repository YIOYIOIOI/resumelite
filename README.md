<div align="center">
  <h1>ResumeLite</h1>

  <p>A local-first resume builder for personal desktop and browser use.</p>

  <p><strong>English</strong> · <a href="README.zh-CN.md">简体中文</a></p>

  <p>
    <a href="https://github.com/YIOYIOIOI/resumelite/actions/workflows/ci.yml"><img src="https://github.com/YIOYIOIOI/resumelite/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT">
  </p>
</div>

---

ResumeLite is a resume builder that keeps everything on your machine. It has the editor, templates, imports, and PDF/DOCX/JSON export — but no login, no backend API, no database, and no hosted service. Your resumes live in a local JSON file at `data/local/resumes.json`, read and written by the Vite server middleware (not in the browser).

Because persistence lives in that middleware, run the app with `pnpm dev` or `pnpm start` (vite preview) — a plain static build has no `/api/local` endpoint and cannot save. Export JSON backups regularly, especially before moving to another machine.

## Quick Start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). No `.env`, Docker, database, or cloud credentials are required for normal local use.

## Desktop App

ResumeLite ships as a self-contained Windows desktop build — double-click to run, no server to start manually. It stores its data in a `data` folder next to the executable, so the whole thing is portable: unzip anywhere, run, delete the folder to uninstall.

```bash
pnpm --filter web package:desktop
```

The packaged app lands in `apps/web/release-desktop/ResumeLite-<version>-win-x64.zip`.

## Features

- Local resume dashboard: create, edit, duplicate, lock/unlock, delete, sort, and tag resumes.
- Autosave into the local JSON file, with live reload when the data changes on disk.
- JSON import for Reactive Resume and JSON Resume data.
- PDF, DOCX, and JSON export.
- Multiple templates, page settings, typography, layout, notes, custom sections, rich text, and custom CSS.
- A **project experience library** (`/dashboard/experiences`) for recording the projects you have worked on as reusable source material for tailoring resumes.
- Bilingual UI — switch between English and Chinese from the sidebar (powered by Lingui).

## Set up & use with an AI agent

Got a coding agent (Claude Code, Cursor, Codex, …)? Paste the prompt below — it will clone, install, launch, and then help you build resumes:

```text
Set up ResumeLite and help me use it:
1. Clone https://github.com/YIOYIOIOI/resumelite and cd into it.
2. Run "pnpm install", then "pnpm dev" and keep it running in the background — the app saves through a local server middleware, so it must stay up.
3. Confirm http://localhost:3000 loads the dashboard.
4. Read AGENTS.md and .claude/skills/resumelite-workspace/SKILL.md to learn how the local resume/experience API works.
5. Help me record my project experiences at /dashboard/experiences, then tailor a resume from a job description I give you.
```

Under the hood the local API is plain HTTP, so the agent reads your experience library and writes tailored resumes directly. The bundled skill at `.claude/skills/resumelite-workspace/` documents the mechanics for Claude Code; `AGENTS.md` gives other agents the same pointers.

## Commands

| Task | Command |
| --- | --- |
| Install dependencies | `pnpm install` |
| Start dev server | `pnpm dev` |
| Build production bundle | `pnpm build` |
| Preview production bundle | `pnpm start` |
| Package desktop app (Windows) | `pnpm --filter web package:desktop` |
| Typecheck | `pnpm typecheck` |
| Run tests | `pnpm test` |
| Read-only Biome check | `pnpm exec biome check .` |
| Format/fix | `pnpm check` |

## Tech Stack

| Category | Technology |
| --- | --- |
| Frontend | React 19, Vite, TanStack Router |
| Server state | TanStack Query |
| Client state | Zustand, Immer |
| Local storage | Local JSON file via Vite middleware |
| Desktop | Electron |
| Styling | Tailwind CSS |
| UI | Base UI + shared shadcn-style package |
| Forms | TanStack Form + Zod |
| Rich text | Tiptap |
| Export | React PDF, DOCX generator, JSON |
| i18n | Lingui |

## Credits & License

ResumeLite is a local-first fork of [Reactive Resume](https://github.com/AmruthPillai/Reactive-Resume) by Amruth Pillai. It keeps the resume editor and templates while dropping the hosted-service stack (auth, database, server API, Docker, and the public sharing layer). It stays under the original [MIT license](./LICENSE) — keep the upstream attribution when redistributing.
