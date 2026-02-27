# MogGambl Slots (Hostinger-ready)

Full-stack slots simulator:
- Frontend: **React + Vite**
- Backend: **Express**
- Wallet: **MetaMask** connect + `eth_sendTransaction`

Deposit destination:
`0x9dCc878e6BfAdAd7BA47ae55Bee452870aA2DD89`

## Deployment diagnosis and fix

Your latest diagnosis is correct:
- Build completes.
- Hostinger tries to find `.next` output.
- This project is not Next.js, so `.next` will never exist.

For Hostinger **Node.js app deployment**, set output directory to:

`null`

(Equivalent in UI: leave Output Directory empty/unset.)

The app still builds frontend files to `frontend/dist`, and Express serves that folder at runtime.

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

## Full Hostinger deployment guide (corrected)

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

### 5) Output Directory setting (critical)
If Hostinger asks for **Output Directory / Publish Directory**, set:

`null`

Meaning: no static framework output directory is required for this Node.js app.

> Do **not** use `.next`.

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
- Ensure framework preset is Node.js/Express, not Next.js.
- Ensure output directory is `null` (blank/unset).
- Ensure app root is the repo root.
- Ensure startup file points to a real file.
- Ensure build command is `npm run build`.

---

## Security note
Current deposit crediting trusts the client-provided tx hash and amount for demo purposes.
For real-money production, implement server-side on-chain receipt verification (RPC, `to`, `value`, confirmations).
