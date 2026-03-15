import { getSupabase } from '../connection';

export interface ActionLog {
  readonly id: number;
  readonly ticket_id: number;
  readonly action_type: 'refund' | 'password_reset' | 'plan_change' | 'bug_ticket' | 'escalation';
  readonly parameters: string;
  readonly status: 'proposed' | 'approved' | 'executed' | 'rejected';
  readonly ai_reasoning: string | null;
  readonly created_at: string;
}

export const actionLogRepository = {
  async findByTicketId(ticketId: number): Promise<ActionLog[]> {
    const { data, error } = await getSupabase()
      .from('actions_log')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findById(id: number): Promise<ActionLog | undefined> {
    const { data, error } = await getSupabase()
      .from('actions_log')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? undefined;
  },

  async findPending(): Promise<ActionLog[]> {
    const { data, error } = await getSupabase()
      .from('actions_log')
      .select('*')
      .eq('status', 'proposed')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async create(data: {
    ticket_id: number;
    action_type: ActionLog['action_type'];
    parameters: Record<string, unknown>;
    status?: ActionLog['status'];
    ai_reasoning?: string;
  }): Promise<ActionLog> {
    const { data: created, error } = await getSupabase()
      .from('actions_log')
      .insert({
        ticket_id: data.ticket_id,
        action_type: data.action_type,
        parameters: JSON.stringify(data.parameters),
        status: data.status || 'proposed',
        ai_reasoning: data.ai_reasoning || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return created;
  },

  async updateStatus(id: number, status: ActionLog['status']): Promise<void> {
    const { error } = await getSupabase()
      .from('actions_log')
      .update({ status })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },
};
