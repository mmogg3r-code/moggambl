import { withdraw } from '@/lib/engine';
import { store } from '@/lib/store';

export async function POST(req) {
  try {
    const body = await req.json();
    const player = withdraw(store, body);
    return Response.json({ ok: true, message: 'Withdrawal request submitted for manual settlement.', player });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
