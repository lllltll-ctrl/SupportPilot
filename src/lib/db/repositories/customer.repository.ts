import { getDb } from '../connection';

export interface Customer {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly plan_tier: 'free' | 'pro' | 'enterprise';
  readonly created_at: string;
  readonly account_status: 'active' | 'suspended' | 'trial';
}

export const customerRepository = {
  findByEmail(email: string): Customer | undefined {
    const db = getDb();
    return db.prepare('SELECT * FROM customers WHERE email = ?').get(email) as Customer | undefined;
  },

  findById(id: number): Customer | undefined {
    const db = getDb();
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer | undefined;
  },

  findAll(): Customer[] {
    const db = getDb();
    return db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all() as Customer[];
  },

  create(data: Omit<Customer, 'id' | 'created_at'>): Customer {
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO customers (name, email, plan_tier, account_status) VALUES (?, ?, ?, ?)'
    ).run(data.name, data.email, data.plan_tier, data.account_status);
    return { ...data, id: result.lastInsertRowid as number, created_at: new Date().toISOString() };
  },

  updatePlan(id: number, newPlan: 'free' | 'pro' | 'enterprise'): Customer | undefined {
    const db = getDb();
    db.prepare('UPDATE customers SET plan_tier = ? WHERE id = ?').run(newPlan, id);
    return this.findById(id);
  },
};
