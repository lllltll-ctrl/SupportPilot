import { getSupabase } from '../connection';

export interface Ticket {
  readonly id: number;
  readonly customer_id: number;
  readonly subject: string;
  readonly status: 'open' | 'in_progress' | 'resolved' | 'escalated';
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly category: 'billing' | 'technical' | 'account' | 'feature_request' | 'bug' | null;
  readonly ai_summary: string | null;
  readonly assigned_agent_id: string | null;
  readonly satisfaction_rating: number | null;
  readonly sentiment: 'positive' | 'neutral' | 'negative' | null;
  readonly frustration_score: number | null;
  readonly created_at: string;
  readonly resolved_at: string | null;
}

export interface TicketWithCustomer extends Ticket {
  readonly customer_name: string;
  readonly customer_email: string;
  readonly customer_plan: string;
}

export const ticketRepository = {
  async findAll(filters?: { status?: string; priority?: string; category?: string; limit?: number; offset?: number }): Promise<TicketWithCustomer[]> {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    let query = getSupabase()
      .from('tickets_with_customer')
      .select('*');

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.priority) query = query.eq('priority', filters.priority);
    if (filters?.category) query = query.eq('category', filters.category);

    const { data, error } = await query
      .order('priority_order', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);
    return (data ?? []) as TicketWithCustomer[];
  },

  async findById(id: number): Promise<TicketWithCustomer | undefined> {
    const { data, error } = await getSupabase()
      .from('tickets_with_customer')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as TicketWithCustomer) ?? undefined;
  },

  async findByCustomerId(customerId: number, limit = 10): Promise<Ticket[]> {
    const { data, error } = await getSupabase()
      .from('tickets')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async create(data: { customer_id: number; subject: string; priority?: string; category?: string }): Promise<Ticket> {
    const { data: created, error } = await getSupabase()
      .from('tickets')
      .insert({
        customer_id: data.customer_id,
        subject: data.subject,
        priority: data.priority || 'medium',
        category: data.category || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return created;
  },

  async updateStatus(id: number, status: Ticket['status']): Promise<void> {
    const updateData: Record<string, unknown> = { status };
    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }
    const { error } = await getSupabase()
      .from('tickets')
      .update(updateData)
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  async updateSummary(id: number, summary: string): Promise<void> {
    const { error } = await getSupabase()
      .from('tickets')
      .update({ ai_summary: summary })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  async updatePriority(id: number, priority: Ticket['priority']): Promise<void> {
    const { error } = await getSupabase()
      .from('tickets')
      .update({ priority })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  async updateCategory(id: number, category: string): Promise<void> {
    const { error } = await getSupabase()
      .from('tickets')
      .update({ category })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  async assignAgent(id: number, agentId: string | null): Promise<void> {
    const { error } = await getSupabase()
      .from('tickets')
      .update({ assigned_agent_id: agentId })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  async updateSatisfaction(id: number, rating: number): Promise<void> {
    const { error } = await getSupabase()
      .from('tickets')
      .update({ satisfaction_rating: rating })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  async updateSentiment(id: number, sentiment: 'positive' | 'neutral' | 'negative', frustrationScore: number): Promise<void> {
    const { error } = await getSupabase()
      .from('tickets')
      .update({ sentiment, frustration_score: frustrationScore })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  async countByStatus(): Promise<Record<string, number>> {
    const { data, error } = await getSupabase()
      .from('tickets')
      .select('status');
    if (error) throw new Error(error.message);
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.status] = (counts[row.status] || 0) + 1;
    }
    return counts;
  },

  async countByCategory(): Promise<Record<string, number>> {
    const { data, error } = await getSupabase()
      .from('tickets')
      .select('category')
      .not('category', 'is', null);
    if (error) throw new Error(error.message);
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.category] = (counts[row.category] || 0) + 1;
    }
    return counts;
  },

  async countByPriority(): Promise<Record<string, number>> {
    const { data, error } = await getSupabase()
      .from('tickets')
      .select('priority');
    if (error) throw new Error(error.message);
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.priority] = (counts[row.priority] || 0) + 1;
    }
    return counts;
  },

  async getAverageResolutionTime(): Promise<number> {
    const { data, error } = await getSupabase().rpc('get_avg_resolution_time');
    if (error) throw new Error(error.message);
    return data ?? 0;
  },

  async getTotal(): Promise<number> {
    const { count, error } = await getSupabase()
      .from('tickets')
      .select('*', { count: 'exact', head: true });
    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  async getRecentTrend(days = 7): Promise<{ date: string; tickets: number; resolved: number }[]> {
    const { data, error } = await getSupabase().rpc('get_recent_trend', { p_days: days });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getWeekOverWeekTrends(): Promise<{
    ticketsTrend: number;
    resolutionRateTrend: number;
    resolutionTimeTrend: number;
    satisfactionTrend: number;
  }> {
    const { data, error } = await getSupabase().rpc('get_week_over_week_trends');
    if (error) throw new Error(error.message);
    return data ?? { ticketsTrend: 0, resolutionRateTrend: 0, resolutionTimeTrend: 0, satisfactionTrend: 0 };
  },

  async getSatisfactionScore(): Promise<number> {
    const { data, error } = await getSupabase().rpc('get_satisfaction_score');
    if (error) throw new Error(error.message);
    return data ?? 0;
  },
};
