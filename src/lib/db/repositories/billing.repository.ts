import { getSupabase } from '../connection';

export interface BillingRecord {
  readonly id: number;
  readonly customer_id: number;
  readonly amount: number;
  readonly description: string;
  readonly type: 'charge' | 'refund';
  readonly created_at: string;
}

export const billingRepository = {
  async findByCustomerId(customerId: number, limit = 20): Promise<BillingRecord[]> {
    const { data, error } = await getSupabase()
      .from('billing_history')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findById(id: number): Promise<BillingRecord | undefined> {
    const { data, error } = await getSupabase()
      .from('billing_history')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? undefined;
  },

  async createRefund(customerId: number, amount: number, reason: string): Promise<BillingRecord> {
    const { data, error } = await getSupabase()
      .from('billing_history')
      .insert({
        customer_id: customerId,
        amount,
        description: `Refund: ${reason}`,
        type: 'refund',
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async createCharge(customerId: number, amount: number, description: string): Promise<BillingRecord> {
    const { data, error } = await getSupabase()
      .from('billing_history')
      .insert({
        customer_id: customerId,
        amount,
        description,
        type: 'charge',
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
};
