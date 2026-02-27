# MogGambl Next.js (Logo + Winning Lines Upgrade)

This project is a pure **Next.js full-stack app** (App Router + API routes).

## What's upgraded


- Added fairness improvements: deterministic RNG from `serverSeed + clientSeed + nonce`, per-spin fairness metadata, and next-seed hash commitment.
- Added animated background coin rain for richer casino atmosphere.
- Added a brand-new **Mogambl logo** at `public/assets/mogambl-logo.svg`.
- Implemented real **line-based win logic** in the engine:
  - 50 paylines
  - per-line symbol match evaluation
  - per-line payout amounts returned as `winningLines`
- Frontend now draws **animated payline overlays** on winning spins and shows a **line-by-line payout list** in the win popup.
- Added **Turbo Spin** and **Auto Spin** controls for faster and repeated spins.


## UI improvements

- Moved the heavy interactive casino UI into a client-only component (`app/slots-client.jsx`) loaded dynamically from `app/page.jsx` to avoid SSR hydration edge cases that can cause desktop blank screens.
- Added resilient startup fallback so UI renders even if API init fails/hangs on desktop environments.
- Added safer spin/withdraw error handling to prevent client crashes from network/API failures.
- Fixed blank-page risk by removing non-deterministic render values (hydration-safe jackpot counters).
- Mobile-first responsive layout for controls, reels, jackpot strip, and slot cards.
- Improved neon casino aesthetics with better spacing, typography scaling, and glow effects.
- Winning payline overlays and line-by-line payout breakdown remain visible on small screens.

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
