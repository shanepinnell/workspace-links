# Workspace Links

A Chrome/Chromium extension (Manifest V3) that rewrites the URL of the Google Doc, Sheet, Slide deck or Drawing in the current tab.

| Action            | URL suffix                          | Does          | Docs | Sheets | Slides | Drawings |
|-------------------|-------------------------------------|---------------|:----:|:------:|:------:|:--------:|
| Copy              | `/copy`                             | Copies link   | ✓ | ✓ | ✓ | ✓ |
| Preview           | `/preview`                          | Copies link   | ✓ | ✓ | ✓ | ✓ |
| Template          | `/template/preview`                 | Copies link   | ✓ | ✓ | ✓ |   |
| Download PDF      | `/export?format=pdf`, `/export/pdf` | Downloads PDF | ✓ | ✓ | ✓ | ✓ |
| Download CSV      | `/export?format=csv&gid=…`          | Downloads CSV of the current sheet |   | ✓ |   |   |
| Download PNG / SVG | `/export/png`, `/export/svg` (`?pageid=…` on Slides) | Downloads image of the current slide or drawing |   |   | ✓ | ✓ |

Link actions **copy the rewritten URL** to the clipboard, ready to paste into an email or page. Download actions save the file through Chromium's downloads, leaving the tab where it is.

- **Popup:** click the toolbar icon. Only the actions that apply to the open app are shown.
- **Right-click menu:** the same actions under *Workspace Links* on any Docs, Sheets, Slides or Drawings page. A green ✓ on the toolbar icon confirms the copy.
- Multi-account URLs (`/u/1/d/…`) keep their account index.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and choose this folder.

## Test

```sh
node --test
```
