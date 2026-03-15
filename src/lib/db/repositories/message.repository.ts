import { getSupabase } from '../connection';

export interface Message {
  readonly id: number;
  readonly conversation_id: number;
  readonly role: 'customer' | 'ai' | 'agent' | 'system';
  readonly content: string;
  readonly tool_call: string | null;
  readonly created_at: string;
}

export const messageRepository = {
  async findByConversationId(conversationId: number): Promise<Message[]> {
    const { data, error } = await getSupabase()
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async create(data: { conversation_id: number; role: Message['role']; content: string; tool_call?: string }): Promise<Message> {
    const { data: created, error } = await getSupabase()
      .from('messages')
      .insert({
        conversation_id: data.conversation_id,
        role: data.role,
        content: data.content,
        tool_call: data.tool_call || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return created;
  },
};
