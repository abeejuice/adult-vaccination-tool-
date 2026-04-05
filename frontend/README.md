# GalenAI Frontend

React + TypeScript + Vite. See the [root README](../README.md) for full project documentation, setup, and deployment instructions.

## Commands

```bash
npm install       # install dependencies
npm run dev       # dev server at localhost:5173 (proxies API to :8000)
npm run build     # production build → dist/
npm run preview   # preview the production build locally
```

## Notes

- `dist/` is committed to the repo so Railway can serve it without a build step
- SVG logo assets are base64-inlined at build time (under the 6KB `assetsInlineLimit`)
- After any source change, run `npm run build` and commit the updated `dist/`
