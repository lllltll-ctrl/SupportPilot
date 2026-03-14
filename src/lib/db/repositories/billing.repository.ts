import { getDb } from '../connection';

export interface BillingRecord {
  readonly id: number;
  readonly customer_id: number;
  readonly amount: number;
  readonly description: string;
  readonly type: 'charge' | 'refund';
  readonly created_at: string;
}

export const billingRepository = {
  findByCustomerId(customerId: number, limit = 20): BillingRecord[] {
    const db = getDb();
    return db.prepare(
      'SELECT * FROM billing_history WHERE customer_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(customerId, limit) as BillingRecord[];
  },

  findById(id: number): BillingRecord | undefined {
    const db = getDb();
    return db.prepare('SELECT * FROM billing_history WHERE id = ?').get(id) as BillingRecord | undefined;
  },

  createRefund(customerId: number, amount: number, reason: string): BillingRecord {
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO billing_history (customer_id, amount, description, type) VALUES (?, ?, ?, ?)'
    ).run(customerId, amount, `Refund: ${reason}`, 'refund');
    return {
      id: result.lastInsertRowid as number,
      customer_id: customerId,
      amount,
      description: `Refund: ${reason}`,
      type: 'refund',
      created_at: new Date().toISOString(),
    };
  },

  createCharge(customerId: number, amount: number, description: string): BillingRecord {
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO billing_history (customer_id, amount, description, type) VALUES (?, ?, ?, ?)'
    ).run(customerId, amount, description, 'charge');
    return {
      id: result.lastInsertRowid as number,
      customer_id: customerId,
      amount,
      description,
      type: 'charge',
      created_at: new Date().toISOString(),
    };
  },
};
