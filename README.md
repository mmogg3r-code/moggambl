# MogGambl Slots

Node.js full-stack slot machine simulator with:
- React + Vite frontend (20 interactive themed slots)
- Express backend (wallet, betting, payouts, progressive jackpots)
- ETH deposit target: `0x9dCc878e6BfAdAd7BA47ae55Bee452870aA2DD89`

## Run

```bash
npm install
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3001

## Notes

- Each spin uses 50 fixed lines and max line bet of $5.
- Max multiplier is 20,000x.
- Progressive jackpot caps at $1,000,000 per slot.
- Withdrawals are locked until total wagered >= 20x total deposited.
- Demo deposit endpoint simulates post-chain crediting; production should verify on-chain transfers.
