# MogGambl Next.js (Logo + Winning Lines Upgrade)

This project is a pure **Next.js full-stack app** (App Router + API routes).

## What's upgraded

- Added a brand-new **Mogambl logo** at `public/assets/mogambl-logo.svg`.
- Implemented real **line-based win logic** in the engine:
  - 50 paylines
  - per-line symbol match evaluation
  - per-line payout amounts returned as `winningLines`
- Frontend now draws **animated payline overlays** on winning spins and shows a **line-by-line payout list** in the win popup.

## Build & Run

```bash
npm install
npm run build
npm start
```

## Local dev

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
