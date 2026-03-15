import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// In-memory store that simulates Supabase tables
// ---------------------------------------------------------------------------
interface Row { id: number; [key: string]: unknown }
type Tables = Record<string, Row[]>;

let tables: Tables = {};
let autoId: Record<string, number> = {};

function resetTables() {
  tables = {
    customers: [],
    billing_history: [],
    tickets: [],
    conversations: [],
    messages: [],
    actions_log: [],
    tickets_with_customer: [],
    active_conversations: [],
  };
  autoId = {};
}

function nextId(table: string): number {
  autoId[table] = (autoId[table] || 0) + 1;
  return autoId[table];
}

function createQueryBuilder(tableName: string) {
  let filters: Array<(r: Row) => boolean> = [];
  let orderCols: Array<{ col: string; asc: boolean }> = [];
  let limitN: number | null = null;
  let singleMode = false;
  let maybeSingleMode = false;
  let insertData: Record<string, unknown> | null = null;
  let updateData: Record<string, unknown> | null = null;
  let doSelect = false;

  const builder: Record<string, unknown> = {
    select(fields?: string, opts?: { count?: string; head?: boolean }) {
      if (opts?.count === 'exact' && opts?.head) {
        return {
          eq: () => builder,
          then: (resolve: (v: unknown) => void) => {
            const result = tables[tableName].filter(r => filters.every(f => f(r)));
            resolve({ count: result.length, error: null });
          },
        };
      }
      return builder;
    },
    insert(data: Record<string, unknown>) { insertData = data; return builder; },
    update(data: Record<string, unknown>) { updateData = data; return builder; },
    eq(col: string, val: unknown) { filters.push((r) => r[col] === val); return builder; },
    not(col: string, op: string, val: unknown) {
      if (op === 'is' && val === null) filters.push((r) => r[col] != null);
      return builder;
    },
    order(col: string, opts?: { ascending?: boolean }) {
      orderCols.push({ col, asc: opts?.ascending ?? true });
      return builder;
    },
    limit(n: number) { limitN = n; return builder; },
    range() { return builder; },
    single() { singleMode = true; doSelect = true; return builder; },
    maybeSingle() { maybeSingleMode = true; return builder; },
    then(resolve: (v: unknown) => void) {
      if (insertData) {
        const id = nextId(tableName);
        const row: Row = { id, created_at: new Date().toISOString(), ...insertData };
        tables[tableName].push(row);
        if (tableName === 'tickets') {
          const customer = tables.customers.find(c => c.id === row.customer_id);
          if (customer) {
            tables.tickets_with_customer.push({
              ...row,
              customer_name: customer.name as string,
              customer_email: customer.email as string,
              customer_plan: customer.plan_tier as string,
            });
          }
        }
        return resolve(doSelect || singleMode ? { data: row, error: null } : { data: [row], error: null });
      }
      if (updateData) {
        for (const row of tables[tableName]) {
          if (filters.every(f => f(row))) Object.assign(row, updateData);
        }
        if (tableName === 'tickets') {
          for (const row of tables.tickets_with_customer) {
            if (filters.every(f => f(row))) Object.assign(row, updateData);
          }
        }
        if (singleMode) {
          const match = tables[tableName].find(r => filters.every(f => f(r)));
          return resolve({ data: match || null, error: null });
        }
        return resolve({ error: null });
      }
      let result = tables[tableName].filter(r => filters.every(f => f(r)));
      for (const { col, asc } of orderCols) {
        result.sort((a, b) => {
          const va = a[col] as string | number;
          const vb = b[col] as string | number;
          return asc ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
        });
      }
      if (limitN !== null) result = result.slice(0, limitN);
      if (singleMode || maybeSingleMode) return resolve({ data: result[0] || null, error: null });
      return resolve({ data: result, error: null });
    },
  };
  return builder;
}

const mockSupabase = {
  from: (table: string) => createQueryBuilder(table),
  rpc: async () => ({ data: null, error: null }),
};

vi.mock('../../db/connection', () => ({
  getSupabase: () => mockSupabase,
}));

// Seed data for each test
function seedTestData() {
  tables.customers.push({
    id: 1, name: 'Test User', email: 'test@example.com',
    plan_tier: 'pro', account_status: 'active', created_at: '2026-01-01T00:00:00Z',
  });
  autoId.customers = 1;

  tables.billing_history.push(
    { id: 1, customer_id: 1, amount: 9.99, description: 'Pro Plan - Monthly', type: 'charge', created_at: '2026-03-01T00:00:00Z' },
    { id: 2, customer_id: 1, amount: 9.99, description: 'Pro Plan - Monthly (duplicate)', type: 'charge', created_at: '2026-03-03T00:00:00Z' },
  );
  autoId.billing_history = 2;

  tables.tickets.push({
    id: 1, customer_id: 1, subject: 'Billing issue', status: 'open',
    priority: 'medium', category: 'billing', ai_summary: null,
    assigned_agent_id: null, satisfaction_rating: null, sentiment: null,
    frustration_score: null, created_at: '2026-03-14T00:00:00Z', resolved_at: null,
  });
  tables.tickets_with_customer.push({
    ...tables.tickets[0],
    customer_name: 'Test User', customer_email: 'test@example.com', customer_plan: 'pro',
  });
  autoId.tickets = 1;

  tables.conversations.push({
    id: 1, ticket_id: 1, customer_id: 1, started_at: '2026-03-14T00:00:00Z', ended_at: null,
  });
  autoId.conversations = 1;
}

beforeEach(() => {
  resetTables();
  seedTestData();
});

// Dynamic imports so mocks are applied
async function getExecutor() {
  return await import('../tool-executor');
}

describe('executeTool — business logic', () => {
  describe('lookup_customer', () => {
    it('should find customer by email and return context', async () => {
      const { executeTool } = await getExecutor();
      const result = await executeTool('lookup_customer', { email: 'test@example.com' }, 1);

      expect(result.requiresConfirmation).toBe(false);
      const data = result.result as { customer: { id: number; name: string }; context: string };
      expect(data.customer.id).toBe(1);
      expect(data.customer.name).toBe('Test User');
      expect(data.context).toContain('Test User');
    });

    it('should return error for non-existent customer', async () => {
      const { executeTool } = await getExecutor();
      const result = await executeTool('lookup_customer', { email: 'missing@example.com' }, 1);

      expect(result.requiresConfirmation).toBe(false);
      expect((result.result as { error: string }).error).toBe('Customer not found');
    });

    it('should find customer by ID', async () => {
      const { executeTool } = await getExecutor();
      const result = await executeTool('lookup_customer', { customer_id: 1 }, 1);

      const data = result.result as { customer: { id: number } };
      expect(data.customer.id).toBe(1);
    });
  });

  describe('get_billing_history', () => {
    it('should return billing records for customer', async () => {
      const { executeTool } = await getExecutor();
      const result = await executeTool('get_billing_history', { customer_id: 1 }, 1);

      const data = result.result as { billing: unknown[]; total: number };
      expect(data.billing).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it('should respect limit parameter', async () => {
      const { executeTool } = await getExecutor();
      const result = await executeTool('get_billing_history', { customer_id: 1, limit: 1 }, 1);

      const data = result.result as { billing: unknown[]; total: number };
      expect(data.billing).toHaveLength(1);
    });
  });

  describe('issue_refund', () => {
    it('should require confirmation when ticketId is provided', async () => {
      const { executeTool } = await getExecutor();
      const result = await executeTool('issue_refund', {
        customer_id: 1, amount: 9.99, reason: 'Duplicate charge',
      }, 1);

      expect(result.requiresConfirmation).toBe(true);
      expect(result.actionId).toBeDefined();
      expect(result.actionDescription).toContain('$9.99');

      const action = tables.actions_log.find(a => a.id === result.actionId);
      expect(action?.status).toBe('proposed');
      expect(action?.action_type).toBe('refund');
    });

    it('should execute directly when no ticketId', async () => {
      const { executeTool } = await getExecutor();
      const result = await executeTool('issue_refund', {
        customer_id: 1, amount: 5.00, reason: 'Test refund',
      }, null);

      expect(result.requiresConfirmation).toBe(false);
      const data = result.result as { refund: { type: string }; message: string };
      expect(data.refund.type).toBe('refund');
      expect(data.message).toContain('$5.00');

      const refunds = tables.billing_history.filter(r => r.type === 'refund');
      expect(refunds).toHaveLength(1);
    });
  });

  describe('change_plan', () => {
    it('should require confirmation when ticketId is provided', async () => {
      const { executeTool } = await getExecutor();
      const result = await executeTool('change_plan', {
        customer_id: 1, new_plan: 'enterprise',
      }, 1);

      expect(result.requiresConfirmation).toBe(true);
      expect(result.actionDescription).toContain('pro');
      expect(result.actionDescription).toContain('enterprise');
    });

    it('should return error for non-existent customer', async () => {
      const { executeTool } = await getExecutor();
      const result = await executeTool('change_plan', {
        customer_id: 999, new_plan: 'pro',
      }, 1);

      expect((result.result as { error: string }).error).toBe('Customer not found');
    });
  });

  describe('reset_password', () => {
    it('should require confirmation when ticketId is provided', async () => {
      const { executeTool } = await getExecutor();
      const result = await executeTool('reset_password', { customer_id: 1 }, 1);

      expect(result.requiresConfirmation).toBe(true);
      expect(result.actionDescription).toContain('test@example.com');
    });
  });

  describe('create_bug_ticket', () => {
    it('should create a bug ticket and log action', async () => {
      const { executeTool } = await getExecutor();
      const result = await executeTool('create_bug_ticket', {
        customer_id: 1, title: 'Upload fails',
        description: 'Files over 100MB fail to upload', severity: 'high',
      }, 1);

      expect(result.requiresConfirmation).toBe(false);
      const data = result.result as { bugTicket: { id: number }; message: string };
      expect(data.bugTicket.id).toBeDefined();
      expect(data.message).toContain('Upload fails');
    });
  });

  describe('escalate_to_human', () => {
    it('should escalate ticket and log action', async () => {
      const { executeTool } = await getExecutor();
      await executeTool('escalate_to_human', {
        customer_id: 1, reason: 'Complex issue',
        context_summary: 'Customer needs manual intervention',
      }, 1);

      const ticket = tables.tickets.find(t => t.id === 1);
      expect(ticket?.status).toBe('escalated');

      const actions = tables.actions_log.filter(a => a.ticket_id === 1 && a.action_type === 'escalation');
      expect(actions).toHaveLength(1);
    });
  });

  describe('unknown tool', () => {
    it('should return error for unknown tool', async () => {
      const { executeTool } = await getExecutor();
      const result = await executeTool('nonexistent_tool', {}, 1);
      expect((result.result as { error: string }).error).toContain('Unknown tool');
    });
  });
});

describe('executeConfirmedAction', () => {
  it('should execute a proposed refund', async () => {
    const { executeTool, executeConfirmedAction } = await getExecutor();

    const proposed = await executeTool('issue_refund', {
      customer_id: 1, amount: 9.99, reason: 'Duplicate charge',
    }, 1);

    const result = await executeConfirmedAction(proposed.actionId!);
    expect(result.success).toBe(true);
    expect(result.message).toContain('$9.99');

    const action = tables.actions_log.find(a => a.id === proposed.actionId);
    expect(action?.status).toBe('executed');
  });

  it('should reject already executed actions', async () => {
    const { executeTool, executeConfirmedAction } = await getExecutor();

    const proposed = await executeTool('issue_refund', {
      customer_id: 1, amount: 5.00, reason: 'Test',
    }, 1);

    await executeConfirmedAction(proposed.actionId!);
    const result = await executeConfirmedAction(proposed.actionId!);
    expect(result.success).toBe(false);
    expect(result.message).toContain('already');
  });

  it('should return error for non-existent action', async () => {
    const { executeConfirmedAction } = await getExecutor();
    const result = await executeConfirmedAction(99999);
    expect(result.success).toBe(false);
  });
});

describe('rejectAction', () => {
  it('should reject a proposed action', async () => {
    const { executeTool, rejectAction } = await getExecutor();

    const proposed = await executeTool('issue_refund', {
      customer_id: 1, amount: 9.99, reason: 'Test rejection',
    }, 1);

    const result = await rejectAction(proposed.actionId!);
    expect(result.success).toBe(true);

    const action = tables.actions_log.find(a => a.id === proposed.actionId);
    expect(action?.status).toBe('rejected');
  });
});
