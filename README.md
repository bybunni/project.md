# project.md

`project.md` is an Electron desktop app for working with a single local markdown project file.

## Development

Install dependencies and run the desktop app in development mode:

```bash
npm ci
npm run dev
```

Useful commands:

```bash
npm test
npm run build:renderer
npm run build
```

## Releases

GitHub Releases are built by GitHub Actions from semantic version tags and are created as drafts first.

Release steps:

```bash
npm version patch
git push origin main
git push origin --tags
```

Notes:

- The tag must match the version in `package.json`, for example `v1.0.1`.
- CI runs `npm test` and `npm run build:renderer` on pushes and pull requests.
- The release workflow builds unsigned macOS, Windows, and Linux installers and uploads only end-user artifacts to the draft GitHub Release.
- Unsigned builds will trigger OS security warnings until signing and notarization are added.
