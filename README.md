# Miras

Privacy-first, local-first family tree builder by Erenson.

Miras provides an infinite canvas for building interactive family trees with draggable people, complex family relationships, local autosave, GEDCOM support and portable encrypted-media-friendly backups.

## Features

- Local-first storage with IndexedDB
- Multiple parents, spouses and blended families
- Drag, pan, zoom and multi-selection
- Turkish and English interface
- JSON, `.miras`, GEDCOM, SVG and PDF export
- WebP avatar processing
- Light and dark themes

Cloud sharing UI is currently a preview. Authentication, encrypted cloud storage and live collaboration are not implemented yet.

## Development

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm test
npm run lint
npm run build
```

Production builds are exported to `out/` as static files.

An Nginx example for the production domain is available at [`deploy/miras.erenson.dev.conf`](deploy/miras.erenson.dev.conf).

## Privacy

Current releases keep tree data and avatars in the browser. Review exports before sharing them: backup files can contain personal family information.

## License

[MIT](LICENSE)
