import { NextRequest } from 'next/server';
import { executeConfirmedAction, rejectAction } from '@/lib/ai/tool-executor';
import { seedDatabase } from '@/lib/db/seed';

seedDatabase();

export async function POST(req: NextRequest) {
  try {
    const { actionId, confirmed } = await req.json();

    if (!actionId || typeof confirmed !== 'boolean') {
      return Response.json({ error: 'actionId and confirmed (boolean) are required' }, { status: 400 });
    }

    const result = confirmed
      ? executeConfirmedAction(actionId)
      : rejectAction(actionId);

    return Response.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
