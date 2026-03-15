import { NextRequest } from 'next/server';
import { actionLogRepository } from '@/lib/db/repositories/action-log.repository';
import { executeConfirmedAction, rejectAction } from '@/lib/ai/tool-executor';

export async function GET() {
  try {
    const pending = await actionLogRepository.findPending();
    return Response.json({ actions: pending });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { actionId, decision } = await req.json();

    if (!actionId || !['approved', 'rejected'].includes(decision)) {
      return Response.json({ error: 'actionId and decision (approved/rejected) are required' }, { status: 400 });
    }

    const result = decision === 'approved'
      ? await executeConfirmedAction(actionId)
      : await rejectAction(actionId);

    return Response.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
