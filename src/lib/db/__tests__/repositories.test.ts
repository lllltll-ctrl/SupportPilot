import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

// Build a tiny chainable query builder that mimics Supabase's PostgREST API
function createQueryBuilder(tableName: string) {
  let rows = [...(tables[tableName] || [])];
  let filters: Array<(r: Row) => boolean> = [];
  let orderCols: Array<{ col: string; asc: boolean }> = [];
  let limitN: number | null = null;
  let rangeStart: number | null = null;
  let rangeEnd: number | null = null;
  let singleMode = false;
  let maybeSingleMode = false;
  let selectFields: string | null = null;
  let countOnly = false;
  let headOnly = false;
  let insertData: Record<string, unknown> | null = null;
  let updateData: Record<string, unknown> | null = null;
  let doSelect = false;

  const builder: Record<string, unknown> = {
    select(fields?: string, opts?: { count?: string; head?: boolean }) {
      selectFields = fields || '*';
      if (opts?.count === 'exact') countOnly = true;
      if (opts?.head) headOnly = true;
      return builder;
    },
    insert(data: Record<string, unknown>) {
      insertData = data;
      return builder;
    },
    update(data: Record<string, unknown>) {
      updateData = data;
      return builder;
    },
    eq(col: string, val: unknown) {
      filters.push((r) => r[col] === val);
      return builder;
    },
    not(col: string, op: string, val: unknown) {
      if (op === 'is' && val === null) {
        filters.push((r) => r[col] != null);
      }
      return builder;
    },
    order(col: string, opts?: { ascending?: boolean }) {
      orderCols.push({ col, asc: opts?.ascending ?? true });
      return builder;
    },
    limit(n: number) {
      limitN = n;
      return builder;
    },
    range(start: number, end: number) {
      rangeStart = start;
      rangeEnd = end;
      return builder;
    },
    single() {
      singleMode = true;
      doSelect = true;
      return builder;
    },
    maybeSingle() {
      maybeSingleMode = true;
      return builder;
    },
    then(resolve: (v: unknown) => void, reject?: (e: unknown) => void) {
      try {
        // Handle INSERT
        if (insertData) {
          const id = nextId(tableName);
          const row: Row = {
            id,
            created_at: new Date().toISOString(),
            ...insertData,
          };
          tables[tableName].push(row);

          // For tickets_with_customer view sync
          if (tableName === 'tickets') {
            const customer = tables.customers.find(c => c.id === row.customer_id);
            if (customer) {
              tables.tickets_with_customer.push({
                ...row,
                customer_name: customer.name as string,
                customer_email: customer.email as string,
                customer_plan: customer.plan_tier as string,
                priority_order: { critical: 1, high: 2, medium: 3, low: 4 }[row.priority as string] || 3,
              });
            }
          }

          if (doSelect || singleMode) {
            return resolve({ data: row, error: null });
          }
          return resolve({ data: [row], error: null });
        }

        // Handle UPDATE
        if (updateData) {
          for (const row of tables[tableName]) {
            if (filters.every(f => f(row))) {
              Object.assign(row, updateData);
            }
          }
          // Sync views
          if (tableName === 'tickets') {
            for (const row of tables.tickets_with_customer) {
              if (filters.every(f => f(row))) {
                Object.assign(row, updateData);
              }
            }
          }
          if (singleMode) {
            const match = tables[tableName].find(r => filters.every(f => f(r)));
            return resolve({ data: match || null, error: null });
          }
          return resolve({ error: null });
        }

        // Handle SELECT
        let result = tables[tableName].filter(r => filters.every(f => f(r)));

        for (const { col, asc } of orderCols) {
          result.sort((a, b) => {
            const va = a[col] as string | number;
            const vb = b[col] as string | number;
            if (va < vb) return asc ? -1 : 1;
            if (va > vb) return asc ? 1 : -1;
            return 0;
          });
        }

        if (rangeStart !== null && rangeEnd !== null) {
          result = result.slice(rangeStart, rangeEnd + 1);
        }
        if (limitN !== null) {
          result = result.slice(0, limitN);
        }

        if (countOnly && headOnly) {
          return resolve({ count: result.length, error: null });
        }
        if (singleMode) {
          return resolve({ data: result[0] || null, error: null });
        }
        if (maybeSingleMode) {
          return resolve({ data: result[0] || null, error: null });
        }

        // Handle field filtering
        if (selectFields && selectFields !== '*') {
          const field = selectFields;
          result = result.map(r => ({ id: r.id, [field]: r[field] })) as Row[];
        }

        return resolve({ data: result, error: null });
      } catch (e) {
        if (reject) reject(e);
      }
    },
  };
  return builder;
}

const rpcResults: Record<string, unknown> = {};

const mockSupabase = {
  from: (table: string) => createQueryBuilder(table),
  rpc: async (fn: string, params?: Record<string, unknown>) => {
    if (rpcResults[fn] !== undefined) {
      return { data: rpcResults[fn], error: null };
    }
    // Default fallback for RPC functions
    if (fn === 'get_avg_resolution_time') return { data: 30, error: null };
    if (fn === 'get_recent_trend') {
      const days = (params?.p_days as number) || 7;
      return { data: Array.from({ length: days }, (_, i) => ({ date: `2026-03-${9 + i}`, tickets: 0, resolved: 0 })), error: null };
    }
    if (fn === 'get_week_over_week_trends') {
      return { data: { ticketsTrend: 0, resolutionRateTrend: 0, resolutionTimeTrend: 0, satisfactionTrend: 0 }, error: null };
    }
    if (fn === 'get_satisfaction_score') return { data: 4.2, error: null };
    return { data: null, error: null };
  },
};

vi.mock('../connection', () => ({
  getSupabase: () => mockSupabase,
}));

import { customerRepository } from '../repositories/customer.repository';
import { billingRepository } from '../repositories/billing.repository';
import { ticketRepository } from '../repositories/ticket.repository';
import { conversationRepository } from '../repositories/conversation.repository';
import { messageRepository } from '../repositories/message.repository';
import { actionLogRepository } from '../repositories/action-log.repository';

// ---------------------------------------------------------------------------
// Seed helper
// ---------------------------------------------------------------------------
interface SeededIds {
  customerId: number;
  secondCustomerId: number;
  ticketId: number;
  resolvedTicketId: number;
  conversationId: number;
  actionId: number;
}

async function seedBaseScenario(): Promise<SeededIds> {
  const sarah = await customerRepository.create({ name: 'Sarah Johnson', email: 'sarah.johnson@email.com', plan_tier: 'pro', account_status: 'active' });
  const mike = await customerRepository.create({ name: 'Mike Chen', email: 'mike.chen@email.com', plan_tier: 'enterprise', account_status: 'active' });

  await billingRepository.createCharge(sarah.id, 9.99, 'Pro Plan - Monthly Subscription');
  await billingRepository.createCharge(sarah.id, 9.99, 'Pro Plan - Monthly Subscription (duplicate)');

  const openTicket = await ticketRepository.create({ customer_id: sarah.id, subject: 'Duplicate charge on March invoice', priority: 'high', category: 'billing' });
  await ticketRepository.updateStatus(openTicket.id, 'in_progress');

  const resolvedTicket = await ticketRepository.create({ customer_id: mike.id, subject: 'SSO setup question', priority: 'medium', category: 'technical' });
  await ticketRepository.updateStatus(resolvedTicket.id, 'resolved');

  const conversation = await conversationRepository.create(openTicket.id, sarah.id);

  await messageRepository.create({ conversation_id: conversation.id, role: 'customer', content: 'I think I was charged twice this month.' });
  await messageRepository.create({ conversation_id: conversation.id, role: 'ai', content: 'I am checking your recent billing history now.' });

  const action = await actionLogRepository.create({
    ticket_id: openTicket.id,
    action_type: 'refund',
    parameters: { customer_id: sarah.id, amount: 9.99, reason: 'duplicate charge' },
    ai_reasoning: 'A duplicate charge is visible in the billing history.',
  });

  return {
    customerId: sarah.id,
    secondCustomerId: mike.id,
    ticketId: openTicket.id,
    resolvedTicketId: resolvedTicket.id,
    conversationId: conversation.id,
    actionId: action.id,
  };
}

// ---------------------------------------------------------------------------
beforeEach(() => resetTables());
afterEach(() => resetTables());

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('customerRepository', () => {
  it('finds customers by email and id', async () => {
    const { customerId } = await seedBaseScenario();

    const byEmail = await customerRepository.findByEmail('sarah.johnson@email.com');
    const byId = await customerRepository.findById(customerId);

    expect(byEmail?.name).toBe('Sarah Johnson');
    expect(byId?.plan_tier).toBe('pro');
  });

  it('creates customers, lists them, and updates plan tier', async () => {
    await seedBaseScenario();

    const created = await customerRepository.create({
      name: 'Emma Wilson',
      email: 'emma.wilson@email.com',
      plan_tier: 'free',
      account_status: 'trial',
    });

    const allCustomers = await customerRepository.findAll();
    const updated = await customerRepository.updatePlan(created.id, 'enterprise');

    expect(allCustomers).toHaveLength(3);
    expect(updated?.plan_tier).toBe('enterprise');
  });
});

describe('billingRepository', () => {
  it('returns billing history and respects limits', async () => {
    const { customerId } = await seedBaseScenario();

    const allRecords = await billingRepository.findByCustomerId(customerId);
    const limitedRecords = await billingRepository.findByCustomerId(customerId, 1);

    expect(allRecords).toHaveLength(2);
    expect(limitedRecords).toHaveLength(1);
  });

  it('creates refund and charge records', async () => {
    const { customerId } = await seedBaseScenario();

    const refund = await billingRepository.createRefund(customerId, 9.99, 'duplicate charge');
    const charge = await billingRepository.createCharge(customerId, 19.99, 'Additional storage add-on');

    const foundRefund = await billingRepository.findById(refund.id);
    const foundCharge = await billingRepository.findById(charge.id);

    expect(foundRefund?.type).toBe('refund');
    expect(foundCharge?.description).toBe('Additional storage add-on');
  });
});

describe('ticketRepository', () => {
  it('creates tickets and updates status', async () => {
    const { customerId } = await seedBaseScenario();

    const created = await ticketRepository.create({
      customer_id: customerId,
      subject: 'Need help with storage limits',
      priority: 'medium',
      category: 'account',
    });

    await ticketRepository.updateStatus(created.id, 'in_progress');
    await ticketRepository.updateSummary(created.id, 'Customer needs help understanding storage usage limits.');
    await ticketRepository.updatePriority(created.id, 'critical');
    await ticketRepository.updateCategory(created.id, 'technical');
    await ticketRepository.assignAgent(created.id, 'agent-7');

    const updated = await ticketRepository.findById(created.id);

    expect(updated?.status).toBe('in_progress');
    expect(updated?.ai_summary).toContain('storage usage');
    expect(updated?.priority).toBe('critical');
    expect(updated?.category).toBe('technical');
    expect(updated?.assigned_agent_id).toBe('agent-7');
  });

  it('computes ticket analytics through repository methods', async () => {
    await seedBaseScenario();

    const total = await ticketRepository.getTotal();
    const avgTime = await ticketRepository.getAverageResolutionTime();
    const trend = await ticketRepository.getRecentTrend(7);
    const satisfaction = await ticketRepository.getSatisfactionScore();

    expect(total).toBe(2);
    expect(avgTime).toBeGreaterThan(0);
    expect(trend).toHaveLength(7);
    expect(satisfaction).toBeGreaterThan(0);
  });
});

describe('conversationRepository and messageRepository', () => {
  it('finds and creates conversations', async () => {
    const { ticketId, customerId, conversationId } = await seedBaseScenario();

    const byId = await conversationRepository.findById(conversationId);
    const byTicketId = await conversationRepository.findByTicketId(ticketId);
    const created = await conversationRepository.create(ticketId, customerId);

    expect(byId?.ticket_id).toBe(ticketId);
    expect(byTicketId?.customer_id).toBe(customerId);
    expect(created.ticket_id).toBe(ticketId);
  });

  it('creates messages and returns ordered history', async () => {
    const { conversationId } = await seedBaseScenario();

    const created = await messageRepository.create({
      conversation_id: conversationId,
      role: 'agent',
      content: 'I am stepping in to review this billing issue.',
      tool_call: JSON.stringify({ tool: 'issue_refund' }),
    });

    const messages = await messageRepository.findByConversationId(conversationId);
    const createdMessage = messages.find((message) => message.id === created.id);

    expect(messages).toHaveLength(3);
    expect(createdMessage?.role).toBe('agent');
    expect(createdMessage?.tool_call).toContain('issue_refund');
  });

  it('ends conversations', async () => {
    const { conversationId } = await seedBaseScenario();
    await conversationRepository.end(conversationId);

    const conv = await conversationRepository.findById(conversationId);
    expect(conv?.ended_at).toBeTruthy();
  });
});

describe('actionLogRepository', () => {
  it('creates actions, lists them, finds pending, and updates status', async () => {
    const { ticketId, actionId } = await seedBaseScenario();

    const created = await actionLogRepository.create({
      ticket_id: ticketId,
      action_type: 'password_reset',
      parameters: { customer_id: 1, email: 'sarah.johnson@email.com' },
      ai_reasoning: 'Customer cannot access the account.',
    });

    const byTicket = await actionLogRepository.findByTicketId(ticketId);
    const byId = await actionLogRepository.findById(actionId);
    const pending = await actionLogRepository.findPending();

    await actionLogRepository.updateStatus(created.id, 'executed');
    const updated = await actionLogRepository.findById(created.id);

    expect(byTicket).toHaveLength(2);
    expect(byId?.status).toBe('proposed');
    expect(pending).toHaveLength(2);
    expect(updated?.status).toBe('executed');
    expect(updated?.parameters).toContain('sarah.johnson@email.com');
  });
});
