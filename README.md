# MogGambl Roulette (Next.js)

MogGambl is now a **roulette game** built as a Next.js full-stack app (App Router + API routes).

## Features

- European roulette outcomes (`0-36`) with deterministic fairness RNG (`serverSeed + clientSeed + nonce`).
- Bet types:
  - Straight number (35:1)
  - Color (red/black)
  - Even/Odd
  - High/Low (1-18 / 19-36)
  - Dozens (2:1)
  - Columns (2:1)
- Turbo Spin and Auto Spin.
- MetaMask wallet connect + demo ETH deposit flow.
- API routes for player/session state and bankroll actions.

## API

- `GET /api/config`
- `POST /api/player`
- `POST /api/deposit`
- `POST /api/spin`
- `POST /api/withdraw`

## Local development

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

## Deployment note

This is a Node/Next.js app. Deploy with your host's **Next.js** runtime using `npm run build` then `npm start`.
Do not configure a static-only output directory for this deployment mode.
