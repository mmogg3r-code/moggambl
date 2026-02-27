# MogGambl Next.js (404 Resource Fix + Deployment)

This project is a pure **Next.js full-stack app** (App Router + API routes).

## 404 "Failed to load resource" fix applied

A common production 404 was caused by missing/static asset references.
This update fixes resource paths and ensures files exist in the deployed output:

- Added logo asset at: `public/assets/moggambl-logo.svg`
- Added Next app icon at: `app/icon.svg`
- Updated UI to load logo using absolute URL path:
  - `src="/assets/moggambl-logo.svg"`
- Updated metadata icon path:
  - `icons.icon = '/icon.svg'`

On Linux hosts, paths are case-sensitive. Keep exact spelling/case.

## Build output and deploy

Use default Next output (`.next`) and standard startup:

```bash
npm install
npm run build
npm start
```

## Hostinger settings

- Install command: `npm install`
- Build command: `npm run build`
- Start command: `npm start`
- Output directory: `.next` (or blank for Next auto-detect)
- Environment: `NODE_ENV=production`

## Local

```bash
npm install
npm run dev
```

## API endpoints

- `GET /api/config`
- `POST /api/player`
- `POST /api/deposit`
- `POST /api/spin`
- `POST /api/withdraw`

## Security note

Deposit crediting is demo-oriented and trusts client-submitted tx hashes.
For real-money operation, verify chain receipts server-side before crediting.
