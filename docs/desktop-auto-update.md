# Desktop auto-update (in-app ZIP swap)

ResumeLite ships as a **portable** Windows build: a zip that unpacks to a `ResumeLite/`
folder (Electron runtime + `resources/app`), with the user's data living in `data/` next
to the exe. There is no installer, no code signing, and the build machine is on a network
where electron-builder's binary downloads fail. Those constraints rule out the standard
Electron auto-updaters (`electron-updater`, Squirrel), which need an NSIS/Squirrel installer
format. So updates are handled by a small **custom updater** that keeps the portable model.

## Goal

When the user opens the packaged app and a newer release exists: prompt them, download the
new build in-app (with progress), and — after they confirm — swap the files in place and
relaunch. The user's resumes in `data/` are never touched.

## Flow

1. **Check** (startup, packaged Windows only) — `GET /releases/latest`, pick the
   `*-win-x64.zip` asset, compare its version to `app.getVersion()`. Newer → prompt
   "Update available — Download / Later". Fails silently when offline/rate-limited.
2. **Download** — stream the zip to `%TEMP%/resumelite-update/`, showing a small progress
   window (`Downloading update… 45%`) plus the taskbar progress bar. Hash the bytes with
   SHA-256 while streaming.
3. **Verify** — the downloaded size must match the asset size; if the release publishes a
   `<zip>.sha256` sidecar asset, the streamed hash must match it. Any mismatch aborts.
4. **Extract** — unpack to `%TEMP%/resumelite-update/ResumeLite/` (via `tar.exe`, falling
   back to PowerShell `Expand-Archive`). Sanity-check that `ResumeLite.exe` is present.
5. **Confirm** — prompt "Update ready — Install & Restart / Later".
6. **Swap & restart** — write a detached `.cmd` helper to `%TEMP%`, spawn it, and quit.

## The swap helper (safety-critical)

The helper `.cmd` runs outside the app process so it can replace locked files:

```
:waitloop  → wait for the app PID to exit (tasklist poll)
robocopy "<staged>\ResumeLite" "<installDir>" /MIR /XD "<installDir>\data" /R:10 /W:2
start "" "<installDir>\ResumeLite.exe"
```

- **`/MIR`** mirrors the new build over the install dir (adds new files, purges removed ones).
- **`/XD "<installDir>\data"`** excludes the data folder from *both* the copy and the purge —
  the user's resumes are guaranteed untouched. This is the one invariant the tests pin down.
- `robocopy` is a trusted Windows built-in (no antivirus friction, unlike electron-builder's
  rename step), and both the helper and the staged source live in `%TEMP%`, outside the
  mirrored install dir, so they can't be purged mid-run.
- The wait loop guarantees the swap only starts once the old process has released its files;
  `/R:10 /W:2` rides out any transient antivirus lock.

## Modules

- **`apps/web/src/features/desktop/updater.ts`** — pure, unit-tested logic: `isNewerVersion`,
  `pickWindowsZipAsset` (parse the release payload + find the zip and its `.sha256` sidecar),
  `parseSha256File`, `renderUpdateScript` (the helper `.cmd` text, incl. the `/XD data`
  guard), `pickUpdaterLocale` + `updaterStrings` (bilingual ZH/EN copy, chosen from
  `app.getLocale()`).
- **`apps/web/electron/main.ts`** — orchestration using Electron/Node APIs (dialogs, the
  progress `BrowserWindow`, streaming download, extract, spawn the helper). Not unit-tested
  (Electron runtime), consistent with the rest of `main.ts`.

## Release process

`scripts/pack-desktop.ps1` writes `ResumeLite-<ver>-win-x64.zip` **and** a
`ResumeLite-<ver>-win-x64.zip.sha256` sidecar. Both are uploaded to the GitHub release so the
updater can verify the checksum. Releases without the sidecar still work (size check only).

## Non-goals

- Not signed → first-run SmartScreen "unknown publisher" (same as today's portable exe).
- Windows x64 only. In dev / non-Windows the updater is a no-op.
- No delta updates, no "skip this version", no background silent install — the user always
  confirms both the download and the install.
