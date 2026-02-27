# MogGambl Slots (Hostinger-ready)

Full-stack slots simulator:
- Frontend: **React + Vite**
- Backend: **Express**
- Wallet: **MetaMask** connect + `eth_sendTransaction`

Deposit destination:
`0x9dCc878e6BfAdAd7BA47ae55Bee452870aA2DD89`

## What was fixed for Hostinger deployment

If Hostinger reports **"Unsupported framework or invalid project structure"**, this repo now includes:
- a single root `package.json` with valid `build` + `start` scripts,
- root `server.js` and `app.js` entrypoints (for panels that require default entry names),
- React dependencies in root install scope,
- production build output to `backend/public`,
- Express static serving fallback for SPA routes.

---

## Local commands

```bash
npm install
npm run dev
```

Production smoke:

```bash
npm run build
npm start
```

---

## Full Hostinger deployment guide (Git deployment or upload)

### 1) Choose the correct hosting type
Use **Node.js hosting** (not static website-only hosting). If your plan has no Node.js app manager, use a VPS.

### 2) Project root in Hostinger
Ensure Hostinger points to the folder containing:
- `package.json`
- `backend/`
- `frontend/`
- `server.js` and `app.js`

### 3) Set Node version
Use Node **18, 20, 22, or 24** (20+ recommended).

### 4) Build/install/start settings in hPanel
Use these exact commands:

- **Install command**
  ```bash
  npm install
  ```
- **Build command**
  ```bash
  npm run build
  ```
- **Start command**
  ```bash
  npm start
  ```

If Hostinger asks for startup file instead of command, set one of:
- `server.js` (preferred)
- `app.js` (fallback)
- `backend/src/server.js` (direct)

### 5) Environment variables
Set:
- `NODE_ENV=production`
- `PORT` only if Hostinger requires explicit port (otherwise let platform inject it)

### 6) Redeploy sequence (important)
After changing settings:
1. Stop app
2. Clear previous build artifacts (optional)
3. Run install
4. Run build
5. Start app
6. Check logs

You should see: `Slots backend listening on ...`

### 7) If it still says unsupported framework
Usually one of these is wrong:
- wrong app root directory selected,
- Node.js app not enabled for the site,
- install/build/start commands missing,
- startup file points to non-existent path,
- deployment done under static hosting mode.

### 8) MetaMask usage after deploy
1. Open your domain in a browser with MetaMask.
2. Click **Connect MetaMask**.
3. Enter deposit amount and click **Deposit with MetaMask**.
4. Confirm transaction to deposit address in MetaMask.

---

## Security note

Current deposit crediting trusts the client-provided tx hash and amount for demo purposes.
For real-money production, implement server-side on-chain receipt verification (RPC, `to`, `value`, confirmations).
