import { NextRequest } from 'next/server';
import { getAnthropicClient, getModelId } from '@/lib/ai/client';
import { ticketRepository } from '@/lib/db/repositories/ticket.repository';
import { conversationRepository } from '@/lib/db/repositories/conversation.repository';
import { messageRepository } from '@/lib/db/repositories/message.repository';
import { actionLogRepository } from '@/lib/db/repositories/action-log.repository';
import { assembleCustomerContext } from '@/lib/ai/context-assembler';
import { customerRepository } from '@/lib/db/repositories/customer.repository';
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

    const customer = customerRepository.findById(ticket.customer_id);
    const customerContext = customer ? assembleCustomerContext(customer) : '';

    const conversationText = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const actionsText = actions
      .map((a) => `[${a.status}] ${a.action_type}: ${a.ai_reasoning || 'no reasoning'}`)
      .join('\n');

    const sentimentInfo = ticket.sentiment
      ? `\nCustomer sentiment: ${ticket.sentiment} (frustration: ${ticket.frustration_score ?? 'unknown'})`
      : '';

    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: getModelId(),
      max_tokens: 500,
      system: `You are an expert support advisor helping human support agents decide what to do next. Given a conversation history, customer context, and actions taken so far, provide 2-4 concrete, actionable recommendations for the human agent. Consider the customer's sentiment and frustration level.

Respond ONLY with valid JSON: {"recommendations": [{"action": "short action label (3-6 words)", "reasoning": "1-2 sentence explanation of why", "urgency": "low|medium|high"}]}

Urgency guide:
- high: customer is frustrated, issue is time-sensitive, or risk of churn
- medium: issue needs attention but is not urgent
- low: nice-to-have improvements or proactive suggestions`,
      messages: [
        {
          role: 'user',
          content: `Customer context:\n${customerContext}\n\nConversation:\n${conversationText}\n\nActions taken:\n${actionsText || 'None'}${sentimentInfo}\n\nTicket status: ${ticket.status}, Priority: ${ticket.priority}`,
        },
      ],
    });

    const responseText =
      response.content[0]?.type === 'text' ? response.content[0].text : '';

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return Response.json({
          recommendations: parsed.recommendations || [],
        });
      } catch {
        return Response.json({ recommendations: [] });
      }
    }

    return Response.json({ recommendations: [] });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
