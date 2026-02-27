import { ETH_DEPOSIT_ADDRESS, LINES, MAX_BET_PER_LINE, MAX_MULTIPLIER, MAX_PROGRESSIVE, payLines } from '@/lib/engine';
import { store } from '@/lib/store';

export async function GET() {
  return Response.json({
    depositAddress: ETH_DEPOSIT_ADDRESS,
    lines: LINES,
    maxBetPerLine: MAX_BET_PER_LINE,
    maxMultiplier: MAX_MULTIPLIER,
    maxProgressive: MAX_PROGRESSIVE,
    payLines,
    slots: store.slots
  });
}
