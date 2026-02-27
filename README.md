# MogGambl Next.js (Deployment-Fixed)

This project is now a **pure Next.js full-stack app** (App Router + API routes).

## What was fixed for deployment failure

Your last deployment failed because the repo still contained mixed legacy Express/Vite artifacts and startup shims pointing at old backend files.
That can break Hostinger detection/startup depending on which entrypoint it picks.

### Fixes applied
- Removed legacy `backend/` and `frontend/` folders from runtime path.
- Kept a single Next.js architecture (`app/`, `app/api/`, `lib/`).
- Replaced root startup entrypoints with a real Next HTTP server (`server.js`) and `app.js` shim.
- Updated `npm start` to run `node server.js` for consistent startup behavior in Hostinger.

## Stack
- Next.js 14 App Router
- API routes: `/api/config`, `/api/player`, `/api/deposit`, `/api/spin`, `/api/withdraw`
- Shared game engine: `lib/engine.js`

Deposit address:
`0x9dCc878e6BfAdAd7BA47ae55Bee452870aA2DD89`

## Local
```bash
npm install
npm run dev
```

## Production
```bash
npm install
npm run build
npm start
```

## Hostinger redeploy steps (important)
1. Re-upload/pull latest code.
2. In Node.js app settings use:
   - Install: `npm install`
   - Build: `npm run build`
   - Start: `npm start`
3. Startup file (if required): `server.js`.
4. Output directory for Next.js build artifacts: `dist` (because `distDir` is configured).
5. Environment:
   - `NODE_ENV=production`
   - `PORT` managed by Hostinger (or set explicitly if needed).
6. Redeploy and restart app.

If build still fails, clear previous build cache/artifacts in Hostinger and redeploy from clean state.

## Security note
Deposit crediting is demo-oriented and currently trusts client-submitted tx hashes.
For real-money operation, verify on-chain receipts server-side before crediting.
