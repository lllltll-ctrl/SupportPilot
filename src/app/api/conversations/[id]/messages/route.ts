import { NextRequest } from 'next/server';
import { messageRepository } from '@/lib/db/repositories/message.repository';
import { conversationRepository } from '@/lib/db/repositories/conversation.repository';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = Number(id);
    const body = await req.json();
    const { content } = body;

    if (!content?.trim()) {
      return Response.json({ error: 'Message content is required' }, { status: 400 });
    }

    const conversation = await conversationRepository.findById(conversationId);
    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const message = await messageRepository.create({
      conversation_id: conversation.id,
      role: 'agent',
      content: content.trim(),
    });

    return Response.json({ message });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
