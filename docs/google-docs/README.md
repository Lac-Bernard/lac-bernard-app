# HTML exports for Google Docs

These `.html` files are generated from the Markdown guides in the parent `docs/` folder. They use simple styling (Arial-sized body text, heading sizes) so you can bring them into Google Docs with formatting mostly intact.

## Regenerate after editing the `.md` sources

From the repo root:

```bash
npm run docs:google-docs
```

## Copy-paste into Google Docs

1. Open an `.html` file in your browser (double-click the file, or **File → Open** in Chrome / Safari / Firefox).
2. **Select all** (Cmd+A on Mac, Ctrl+A on Windows).
3. **Copy** (Cmd+C / Ctrl+C).
4. In Google Docs, **Paste** (Cmd+V / Ctrl+V).

You should get headings, bold text, lists, horizontal rules, and links. If a link pointed to another `.md` file in the repo, it will still point to that path. You can fix those in Docs after pasting.

## Import instead of paste (optional)

In Google Docs: **File → Open → Upload** and choose the `.html` file. Results can differ slightly from paste; use whichever looks better for your document.

## Files

| File | Source |
|------|--------|
| `member-system-launch-welcome.html` | Launch email draft (EN) |
| `member-system-launch-welcome-fr.html` | Launch email draft (FR) |
| `member-membership-guide.html` | Member guide (EN) |
| `member-membership-guide-fr.html` | Member guide (FR) |
| `admin-membership-guide.html` | Admin guide (EN) |
| `admin-membership-guide-fr.html` | Admin guide (FR) |
