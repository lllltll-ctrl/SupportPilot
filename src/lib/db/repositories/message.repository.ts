import { getDb } from '../connection';

export interface Message {
  readonly id: number;
  readonly conversation_id: number;
  readonly role: 'customer' | 'ai' | 'agent' | 'system';
  readonly content: string;
  readonly tool_call: string | null;
  readonly created_at: string;
}

export const messageRepository = {
  findByConversationId(conversationId: number): Message[] {
    const db = getDb();
    return db.prepare(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).all(conversationId) as Message[];
  },

  create(data: { conversation_id: number; role: Message['role']; content: string; tool_call?: string }): Message {
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO messages (conversation_id, role, content, tool_call) VALUES (?, ?, ?, ?)'
    ).run(data.conversation_id, data.role, data.content, data.tool_call || null);
    return db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid) as Message;
  },
};
