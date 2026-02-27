import { getPlayer } from '@/lib/engine';
import { store } from '@/lib/store';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const player = getPlayer(store, body?.playerId);
  if (body?.walletAddress) player.walletAddress = body.walletAddress;
  return Response.json(player);
}
