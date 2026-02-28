import { spin } from '@/lib/engine';
import { store } from '@/lib/store';

export async function POST(req) {
  try {
    const body = await req.json();
    return Response.json(spin(store, body));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
