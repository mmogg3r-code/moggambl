# MogGambl Next.js Upgrade

A major upgrade of the casino app to a **single Next.js full-stack project**:
- Next.js App Router frontend (`app/page.jsx`)
- Next.js API routes (`app/api/*`) replacing standalone Express hosting path
- Shared game engine in `lib/engine.js`
- MetaMask wallet connect + deposit transaction flow
- 20 themed slots, 50 lines, max $5/line, 20,000x top multiplier, progressive jackpots to $1,000,000

Deposit address:
`0x9dCc878e6BfAdAd7BA47ae55Bee452870aA2DD89`

## Why this deploys better on Hostinger

This is now a true **Next.js** app with standard scripts:
- `next build`
- `next start`

And build output directory is explicitly configured to:

`dist`

via `next.config.mjs` (`distDir: 'dist'`).

---

## Local development

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

## Production

```bash
npm install
npm run build
npm start
```

---

## Hostinger deployment (Next.js)

1. Create a **Node.js app** in Hostinger hPanel.
2. Set Node version 18+ (20/22 recommended).
3. Upload this repository root.
4. Set commands:
   - Install: `npm install`
   - Build: `npm run build`
   - Start: `npm start`
5. Set **Output Directory** to:
   - `dist`
6. Set environment variable:
   - `NODE_ENV=production`
7. Redeploy/restart app.

If Hostinger requests startup file, use command start mode first. If file is required, use `node_modules/next/dist/bin/next` with arguments `start -p $PORT`.

---

## API endpoints

- `GET /api/config`
- `POST /api/player`
- `POST /api/deposit`
- `POST /api/spin`
- `POST /api/withdraw`

---

## Security note

Deposit crediting is still demo-oriented and trusts the client-submitted tx hash.
For production money flow, verify chain receipts server-side before crediting balance.
