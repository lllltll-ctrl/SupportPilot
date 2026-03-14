import { conversationRepository } from '@/lib/db/repositories/conversation.repository';
import { seedDatabase } from '@/lib/db/seed';

seedDatabase();

export async function GET() {
  try {
    const conversations = conversationRepository.findActive();
    return Response.json({ conversations });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
