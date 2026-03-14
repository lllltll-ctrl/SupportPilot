import { getDb } from '../connection';

export interface Conversation {
  readonly id: number;
  readonly ticket_id: number;
  readonly customer_id: number;
  readonly started_at: string;
  readonly ended_at: string | null;
}

export interface ConversationWithDetails extends Conversation {
  readonly customer_name: string;
  readonly customer_email: string;
  readonly ticket_subject: string;
  readonly ticket_status: string;
  readonly ticket_priority: string;
  readonly ticket_sentiment: 'positive' | 'neutral' | 'negative' | null;
  readonly ticket_frustration_score: number | null;
  readonly message_count: number;
  readonly last_message: string | null;
}

export const conversationRepository = {
  findById(id: number): Conversation | undefined {
    const db = getDb();
    return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as Conversation | undefined;
  },

  findByTicketId(ticketId: number): Conversation | undefined {
    const db = getDb();
    return db.prepare('SELECT * FROM conversations WHERE ticket_id = ?').get(ticketId) as Conversation | undefined;
  },

  findActive(): ConversationWithDetails[] {
    const db = getDb();
    return db.prepare(`
      SELECT
        conv.*,
        c.name as customer_name,
        c.email as customer_email,
        t.subject as ticket_subject,
        t.status as ticket_status,
        t.priority as ticket_priority,
        t.sentiment as ticket_sentiment,
        t.frustration_score as ticket_frustration_score,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = conv.id) as message_count,
        (SELECT content FROM messages WHERE conversation_id = conv.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM conversations conv
      JOIN customers c ON conv.customer_id = c.id
      JOIN tickets t ON conv.ticket_id = t.id
      WHERE conv.ended_at IS NULL AND t.status IN ('in_progress', 'escalated')
      ORDER BY conv.started_at DESC
    `).all() as ConversationWithDetails[];
  },

  create(ticketId: number, customerId: number): Conversation {
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO conversations (ticket_id, customer_id) VALUES (?, ?)'
    ).run(ticketId, customerId);
    return db.prepare('SELECT * FROM conversations WHERE id = ?').get(result.lastInsertRowid) as Conversation;
  },

  end(id: number): void {
    const db = getDb();
    db.prepare('UPDATE conversations SET ended_at = datetime(\'now\') WHERE id = ?').run(id);
  },
};
