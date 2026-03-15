import { getSupabase } from '../connection';

export interface Customer {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly plan_tier: 'free' | 'pro' | 'enterprise';
  readonly created_at: string;
  readonly account_status: 'active' | 'suspended' | 'trial';
}

export const customerRepository = {
  async findByEmail(email: string): Promise<Customer | undefined> {
    const { data, error } = await getSupabase()
      .from('customers')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? undefined;
  },

  async findById(id: number): Promise<Customer | undefined> {
    const { data, error } = await getSupabase()
      .from('customers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? undefined;
  },

  async findAll(): Promise<Customer[]> {
    const { data, error } = await getSupabase()
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async create(data: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
    const { data: created, error } = await getSupabase()
      .from('customers')
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return created;
  },

  async updatePlan(id: number, newPlan: 'free' | 'pro' | 'enterprise'): Promise<Customer | undefined> {
    const { data, error } = await getSupabase()
      .from('customers')
      .update({ plan_tier: newPlan })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
};
