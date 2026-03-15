import { NextRequest } from 'next/server';
import { ticketRepository } from '@/lib/db/repositories/ticket.repository';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const [tickets, total] = await Promise.all([
      ticketRepository.findAll({
        status: searchParams.get('status') || undefined,
        priority: searchParams.get('priority') || undefined,
        category: searchParams.get('category') || undefined,
        limit: Number(searchParams.get('limit')) || 50,
        offset: Number(searchParams.get('offset')) || 0,
      }),
      ticketRepository.getTotal(),
    ]);

    return Response.json({ tickets, total });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
