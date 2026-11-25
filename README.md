# Workspace Links

A Chrome/Chromium extension (Manifest V3) for sharing and downloading Google Docs, Sheets, Slides and Drawings. Click the toolbar icon on any of them to copy a special-purpose link or download the file — no hand-editing URLs.

## On a Docs, Sheets, Slides or Drawings page

**Share as:** copies a rewritten link to the clipboard, ready to paste into an email, chat or page.

| Item     | Link ends in        | Opens for the recipient as…            | Docs | Sheets | Slides | Drawings |
|----------|---------------------|----------------------------------------|:----:|:------:|:------:|:--------:|
| Copy     | `/copy`             | Google's "Make a copy" prompt          | ✓ | ✓ | ✓ | ✓ |
| Preview  | `/preview`          | A clean, read-only view without menus  | ✓ | ✓ | ✓ | ✓ |
| Template | `/template/preview` | A "Use template" page                  | ✓ | ✓ | ✓ |   |

Hover an item to see a copy icon; after copying, it turns into a check mark and a snackbar names the link (e.g. "Preview link copied"). The popup stays open so you can copy several.

**Download:** saves the file through Chromium's downloads, leaving the tab where it is.

| Item | Export URL                                         | Docs | Sheets | Slides | Drawings |
|------|----------------------------------------------------|:----:|:------:|:------:|:--------:|
| PDF  | `/export?format=pdf` or `/export/pdf`              | ✓ | ✓ | ✓ | ✓ |
| CSV  | `/export?format=csv&gid=…` (the sheet you're on)   |   | ✓ |   |   |
| PNG  | `/export/png` (`?pageid=…`: the slide you're on)   |   |   | ✓ | ✓ |
| SVG  | `/export/svg` (`?pageid=…`: the slide you're on)   |   |   | ✓ | ✓ |

A snackbar shows "Downloading…", then "Downloaded" with a **Show** button that opens your file manager at the file.

Multi-account URLs (`/u/1/d/…`) keep their account index.

## On any other page

- **Open Google Drive** — opens drive.google.com in a new tab.
- **Create new:** Document, Spreadsheet, Presentation or Drawing, via Google's `docs.new`, `sheets.new`, `slides.new` and `drawings.new` shortcuts (created in your default Google account).

## Design

The popup follows Material Design 3: Google's GM3 colour roles in light and dark mode, the M3 type scale, state layers, press ripples and snackbars. Icons are Material Symbols, and Roboto is bundled so headings render at the correct weight on any system.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and choose this folder.

Permissions: `activeTab` (read the current tab's URL when you open the popup) and `downloads`.

## Test

```sh
node --test
```

## Credits

- Icons: [Material Symbols](https://fonts.google.com/icons), Apache License 2.0 — see `icons/material/`.
- Font: [Roboto](https://github.com/googlefonts/roboto-classic) via Fontsource, SIL Open Font License 1.1 — see `fonts/`.
