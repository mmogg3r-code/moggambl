import { deposit } from '@/lib/engine';
import { store } from '@/lib/store';

export async function POST(req) {
  try {
    const body = await req.json();
    const player = deposit(store, body);
    return Response.json(player);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
