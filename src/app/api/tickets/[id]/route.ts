import { NextRequest } from 'next/server';
import { ticketRepository } from '@/lib/db/repositories/ticket.repository';
import { conversationRepository } from '@/lib/db/repositories/conversation.repository';
import { messageRepository } from '@/lib/db/repositories/message.repository';
import { actionLogRepository } from '@/lib/db/repositories/action-log.repository';
import { seedDatabase } from '@/lib/db/seed';

seedDatabase();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticketId = Number(id);

    const ticket = ticketRepository.findById(ticketId);
    if (!ticket) {
      return Response.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const conversation = conversationRepository.findByTicketId(ticketId);
    const messages = conversation
      ? messageRepository.findByConversationId(conversation.id)
      : [];
    const actions = actionLogRepository.findByTicketId(ticketId);

    return Response.json({
      ticket,
      conversation,
      messages,
      actions,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticketId = Number(id);
    const body = await req.json();

    const ticket = ticketRepository.findById(ticketId);
    if (!ticket) {
      return Response.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (body.status) {
      ticketRepository.updateStatus(ticketId, body.status);

      // Auto-follow-up: when a ticket is resolved, schedule a follow-up message
      if (body.status === 'resolved') {
        const conv = conversationRepository.findByTicketId(ticketId);
        if (conv) {
          messageRepository.create({
            conversation_id: conv.id,
            role: 'system',
            content: 'Auto Follow-Up Scheduled — A follow-up check-in will be sent to the customer in 24 hours to verify the issue remains resolved.',
          });
        }
      }
    }

    if (body.assigned_agent_id !== undefined) {
      ticketRepository.assignAgent(ticketId, body.assigned_agent_id);
    }

    if (body.priority) {
      ticketRepository.updatePriority(ticketId, body.priority);
    }

    if (body.satisfaction_rating && body.satisfaction_rating >= 1 && body.satisfaction_rating <= 5) {
      ticketRepository.updateSatisfaction(ticketId, body.satisfaction_rating);
    }

    const updated = ticketRepository.findById(ticketId);
    return Response.json({ ticket: updated });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
