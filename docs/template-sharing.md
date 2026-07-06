# Template Sharing

Let users share the *look* of a resume: export it as a portable file, import someone
else's, and browse a community gallery hosted on GitHub.

## Concept: a template is an appearance preset (data, not code)

A shared template is a JSON file that captures only the **appearance** of a resume —
never personal content. Appearance is the style subset of `resume.data.metadata`:

| Included (appearance) | Excluded |
| --- | --- |
| `template` (built-in skeleton) | `notes` (private, author-only) |
| `layout` (columns, section placement, spacing, margins, page format) | resume content (`basics`, `sections`, `summary`, `picture`, …) |
| `page` (margins, format, locale) | |
| `design` (colors, level designs) | |
| `typography` (fonts, sizes) | |
| `styleRules` (structured per-section style rules) | |

Because a preset is pure data, it is safe (nothing is executed), small, and portable.
Applying a preset swaps the resume's look while leaving its content untouched.

## File format

```jsonc
{
  "formatVersion": 1,
  "name": "Clean Two-Column",
  "author": "someone",          // optional
  "tags": ["minimal", "two-column"],
  "appearance": {
    "template": "onyx",
    "layout": { /* … */ },
    "page": { /* … */ },
    "design": { /* … */ },
    "typography": { /* … */ },
    "styleRules": { /* … */ }
  }
}
```

Validated with a Zod schema (`templatePresetSchema`). On import, `layout` may reference
custom-section UUIDs that don't exist in the target resume; those references are dropped
so the layout still renders.

## Capabilities

1. **Export (local, no network).** Extract the current resume's appearance → download a
   `.json`. Also render a preview thumbnail from a **built-in sample resume** (never the
   user's real data) so galleries have something to show.
2. **Import (local, no network).** Pick a `.json` → validate → merge its appearance into
   the current resume's metadata. Content is untouched. Always available.
3. **Community gallery (GitHub).** The app fetches an index and preview images from the
   `resumelite-templates` repo, shows a grid, and one click downloads + applies a preset.
   When GitHub is unreachable it degrades to the file import above.

## Community repo — `YIOYIOIOI/resumelite-templates`

```
index.json                        # [{ slug, name, author, tags, preview }]
templates/<slug>/template.json    # a TemplatePreset
templates/<slug>/preview.png      # thumbnail
```

Contributing a template = open a PR adding one `templates/<slug>/` folder and an
`index.json` entry.

## Where it fits in the existing code

- **Preset schema + pure functions** (`extractPreset`, `applyPreset`, validation) live in
  `packages/schema` — no UI, no I/O, fully unit-testable.
- **Apply** reuses the existing metadata-write path: the template gallery already sets
  `draft.metadata.template` via `onSelectTemplate` (`apps/web/src/dialogs/resume/template/gallery.tsx`);
  applying a preset sets the rest of the appearance the same way.
- **Preview rendering** reuses `packages/pdf` (`createResumePdfBlob`) with
  `sampleResumeData` from `packages/schema`.
- **UI** hangs off the existing template gallery dialog; the community gallery is a new
  tab/section beside the built-in templates.

## Phases

1. **Format + export/import** — the preset schema, pure functions, and the local
   file-based import/export UI. A complete, useful loop with no network dependency.
2. **Community gallery** — the GitHub client, the in-app gallery, and seeding the
   `resumelite-templates` repo with a few starter presets.

## Testing

- Preset schema validation and `extractPreset` / `applyPreset` round-trip — pure-function
  unit tests.
- Import/export UI — component tests (valid file applies, malformed file is rejected).
- GitHub client — tests with a mocked `fetch` (index parsing, error/offline fallback).
