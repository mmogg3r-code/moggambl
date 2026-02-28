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
- Enhanced UX layout with glassmorphism cards, quick-stake chips, live recent-number pills, and celebration states.
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


## Rendering reliability

- The root page now directly renders the client roulette component (no dynamic loading fallback), which avoids cases where users get stuck on a loading screen when a dynamic chunk fails to load.
- The logo is rendered with a standard `<img>` to reduce runtime integration issues on restrictive deployments.


## Animation approach

- Uses performant browser-native animation tools (CSS keyframes + transform transitions) for coin rain, wheel movement and win pulses.
- UI interactions use micro-animations (hover lift, state glow, button feedback) to make gameplay feel lively without extra runtime dependencies.
