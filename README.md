<div align="center">
  <h1>ResumeLite</h1>

  <p>A local-first personal resume manager — keep a library of everything you've done, and build tailored resumes from it.</p>

  <p><strong>English</strong> · <a href="README.zh-CN.md">简体中文</a></p>

  <p>
    <a href="https://github.com/YIOYIOIOI/resumelite/actions/workflows/ci.yml"><img src="https://github.com/YIOYIOIOI/resumelite/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT">
  </p>
</div>

---

ResumeLite is more than a resume editor — it's a personal resume management system. Keep a **library of your project experiences** (the single source of truth for what you've actually done), then draw on it to build tailored resumes for each role you apply to. Everything runs on your own machine, and every resume and experience is saved to local JSON files that never leave your computer.

Your data is read and written by the local server, so start the app with `pnpm dev` or `pnpm start` (vite preview) and it saves as you edit. Export a JSON backup now and then, especially before switching machines.

## Quick Start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and start building — everything works locally out of the box.

## Desktop App

ResumeLite ships as a self-contained Windows desktop build — just double-click to run. It stores its data in a `data` folder next to the executable, so the whole thing is portable: unzip anywhere, run, delete the folder to uninstall.

```bash
pnpm --filter web package:desktop
```

The packaged app lands in `apps/web/release-desktop/ResumeLite-<version>-win-x64.zip`.

## Features

- **Project experience library** (`/dashboard/experiences`) — record every project you've worked on in one place: your factual source of truth for writing resumes.
- **Tailored resumes** — spin up a resume for a specific role, reusing the experiences you've already recorded.
- Resume dashboard: create, edit, duplicate, lock/unlock, delete, sort, and tag.
- Multiple templates, page settings, typography, layout, notes, custom sections, rich text, and custom CSS.
- **Share templates** — export a resume's look as a file, import someone else's, or browse a community gallery of shared designs.
- Autosave into local JSON files, with live reload when data changes on disk.
- Import from Reactive Resume and JSON Resume; export to PDF, DOCX, and JSON.
- Bilingual UI — switch between English and Chinese from the sidebar (powered by Lingui).

## Set up with an AI agent

Got a coding agent (Claude Code, Cursor, Codex, …)? Paste this to have it clone, install, and launch the project for you:

```text
Set up ResumeLite for me:
1. Clone https://github.com/YIOYIOIOI/resumelite and cd into it.
2. Run "pnpm install", then start it with "pnpm dev" and keep it running in the background — the app saves through a local server middleware, so it must stay up.
3. Open http://localhost:3000, confirm the dashboard loads, and give me a short overview of what this project does.
```

Once it's running, point the agent at `AGENTS.md` and `.claude/skills/resumelite-workspace/` and it can help you record experiences and write tailored resumes.

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

ResumeLite is a local-first fork of [Reactive Resume](https://github.com/AmruthPillai/Reactive-Resume) by Amruth Pillai, reworked to run privately on your own machine. It stays under the original [MIT license](./LICENSE) — keep the upstream attribution when redistributing.
