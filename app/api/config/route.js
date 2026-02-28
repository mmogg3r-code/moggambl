import { ETH_DEPOSIT_ADDRESS, MIN_BET_USD, MAX_BET_USD, MAX_PAYOUT_MULTIPLIER } from '@/lib/engine';
import { store } from '@/lib/store';

export async function GET() {
  return Response.json({
    game: 'roulette',
    depositAddress: ETH_DEPOSIT_ADDRESS,
    minBetUSD: MIN_BET_USD,
    maxBetUSD: MAX_BET_USD,
    maxPayoutMultiplier: MAX_PAYOUT_MULTIPLIER,
    tables: store.tables,
    betTypes: [
      { id: 'number', label: 'Straight Number', options: '0-36', multiplier: 35 },
      { id: 'color', label: 'Red / Black', options: ['red', 'black'], multiplier: 1 },
      { id: 'evenOdd', label: 'Even / Odd', options: ['even', 'odd'], multiplier: 1 },
      { id: 'highLow', label: '1-18 / 19-36', options: ['low', 'high'], multiplier: 1 },
      { id: 'dozen', label: 'Dozens', options: [1, 2, 3], multiplier: 2 },
      { id: 'column', label: 'Columns', options: [1, 2, 3], multiplier: 2 }
    ]
  });
}
