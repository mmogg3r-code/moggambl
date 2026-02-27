# MogGambl Slots (Hostinger-ready)

Full-stack slots simulator:
- Frontend: **React + Vite**
- Backend: **Express**
- Wallet: **MetaMask** connect + `eth_sendTransaction`

Deposit destination:
`0x9dCc878e6BfAdAd7BA47ae55Bee452870aA2DD89`

## Deployment diagnosis and fix

Your diagnosis is correct: Hostinger expected a different output directory than what was configured.

- Build succeeds.
- Hostinger checks for framework output.
- If it expects `.next`, this project will fail because it is **not Next.js**.
- For this Vite app, output must be treated as:

`frontend/dist`

This repo is now aligned to build frontend assets into `frontend/dist`, and Express serves that directory in production.

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

## Full Hostinger deployment guide (with corrected output directory)

### 1) Choose Node.js hosting (not static-only)
In hPanel, use **Node.js App** hosting.

### 2) App root
Point Hostinger to the repo root that contains:
- `package.json`
- `backend/`
- `frontend/`
- `server.js` / `app.js`

### 3) Node version
Use Node **18+** (20/22 recommended).

### 4) Set commands
Use exactly:

- Install:
  ```bash
  npm install
  ```
- Build:
  ```bash
  npm run build
  ```
- Start:
  ```bash
  npm start
  ```

### 5) Output directory setting (important)
If Hostinger asks for output/publish/build artifact directory, set:

`frontend/dist`

Do **not** set `.next` for this project.

### 6) Startup file
If Hostinger asks for startup file, use one of:
- `server.js` (preferred)
- `app.js`
- `backend/src/server.js`

### 7) Environment variables
Set:
- `NODE_ENV=production`
- `PORT` only if Hostinger requires explicit value.

### 8) Redeploy sequence
1. Stop app
2. Run `npm install`
3. Run `npm run build`
4. Start app (`npm start`)
5. Check logs for: `Slots backend listening on ...`

### 9) Troubleshooting if Hostinger still fails
- Ensure framework is Node.js/Express, not Next.js preset.
- Ensure output directory is `frontend/dist`.
- Ensure root folder is correct.
- Ensure startup file points to real file.
- Ensure build command is `npm run build`.

---

## Security note
Current deposit crediting trusts the client-provided tx hash and amount for demo purposes.
For real-money production, implement server-side on-chain receipt verification (RPC, `to`, `value`, confirmations).
