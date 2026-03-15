import { getSupabase } from '../connection';

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
  async findById(id: number): Promise<Conversation | undefined> {
    const { data, error } = await getSupabase()
      .from('conversations')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? undefined;
  },

  async findByTicketId(ticketId: number): Promise<Conversation | undefined> {
    const { data, error } = await getSupabase()
      .from('conversations')
      .select('*')
      .eq('ticket_id', ticketId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? undefined;
  },

  async findActive(): Promise<ConversationWithDetails[]> {
    const { data, error } = await getSupabase()
      .from('active_conversations')
      .select('*')
      .order('started_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ConversationWithDetails[];
  },

  async create(ticketId: number, customerId: number): Promise<Conversation> {
    const { data, error } = await getSupabase()
      .from('conversations')
      .insert({ ticket_id: ticketId, customer_id: customerId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async end(id: number): Promise<void> {
    const { error } = await getSupabase()
      .from('conversations')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },
};
