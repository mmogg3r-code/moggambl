# MogGambl Slots (MetaMask + Express + Vite)

This project is a full-stack slots simulator with:
- **Frontend:** React + Vite
- **Backend:** Express
- **Wallet:** MetaMask connect + `eth_sendTransaction` deposit flow
- **Casino constraints:** 50 lines, max $5/line, 20,000x max multiplier, 20x wagering requirement before withdrawal, progressive jackpots up to $1,000,000.

Deposit target wallet:
`0x9dCc878e6BfAdAd7BA47ae55Bee452870aA2DD89`

---

## Local development

```bash
npm install
npm run dev
```

- Frontend dev URL: `http://localhost:5173`
- Backend API URL: `http://localhost:3001/api/*`

## Production start

```bash
npm install
npm run build
npm start
```

`npm run build` generates frontend assets into `backend/public`, and Express serves them in production.

---

## Why you got Hostinger error: "Unsupported framework or invalid project structure"

That error usually appears when Hostinger can't detect a single supported app entrypoint. This repo was updated to be Hostinger-friendly by:
- using one root `package.json` with clear `build` and `start` scripts,
- building frontend into `backend/public`,
- serving frontend directly from Express.

So Hostinger sees this as a standard **Express** Node app.

---

## Full Hostinger deployment instructions

## Option A — Hostinger Node.js hosting (Express app)

1. **Create Node.js app in hPanel**
   - Go to **Websites → Manage → Advanced → Node.js**.
   - Create app with Node `18+` (20/22 recommended).

2. **Upload project files**
   - Upload the repository contents to your app directory (e.g., `~/domains/yourdomain.com/public_html/moggambl`).
   - Ensure root contains `package.json`, `backend/`, `frontend/`.

3. **Set startup file / command**
   - If Hostinger asks startup file: use `backend/src/server.js`.
   - If Hostinger asks start command: use `npm start`.

4. **Install dependencies**
   - In Hostinger terminal:
     ```bash
     npm install
     ```

5. **Build frontend assets**
   - In Hostinger terminal:
     ```bash
     npm run build
     ```
   - This creates static files inside `backend/public`.

6. **Set environment**
   - In Node.js app env vars, set:
     - `NODE_ENV=production`
     - `PORT` is usually auto-assigned by Hostinger (do not hardcode if their panel handles it).

7. **Start / restart app**
   - Restart from hPanel Node.js manager.
   - Check logs for `Slots backend listening on ...`.

8. **Domain routing**
   - Attach domain/subdomain to this Node app in hPanel.
   - Visit your domain; Express should serve frontend and API from same origin.

9. **MetaMask usage in production**
   - Open site in browser with MetaMask installed.
   - Click **Connect MetaMask**.
   - Use **Deposit with MetaMask** to send ETH to the configured deposit address.

---

## Option B — If using Hostinger static hosting + separate backend

If your plan does **not** support Node.js runtime:
1. Deploy frontend static files (from `backend/public` after `npm run build`) to static hosting.
2. Deploy backend separately on VPS/Cloud (Hostinger VPS, Railway, Render, Fly.io, etc.).
3. Update frontend API base URL from `/api` to your backend URL.

---

## Important production note

Current deposit crediting trusts tx hash submitted by client. For real-money operation, add server-side on-chain verification (RPC + receipt validation for `to`, `value`, `confirmations`) before crediting balances.
