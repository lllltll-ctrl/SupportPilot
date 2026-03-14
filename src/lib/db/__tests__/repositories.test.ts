import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { CREATE_TABLES_SQL } from '../schema';

let db: Database.Database;

vi.mock('../connection', () => ({
  getDb: () => db,
}));

import { customerRepository } from '../repositories/customer.repository';
import { billingRepository } from '../repositories/billing.repository';
import { ticketRepository } from '../repositories/ticket.repository';
import { conversationRepository } from '../repositories/conversation.repository';
import { messageRepository } from '../repositories/message.repository';
import { actionLogRepository } from '../repositories/action-log.repository';

interface SeededIds {
  customerId: number;
  secondCustomerId: number;
  ticketId: number;
  resolvedTicketId: number;
  conversationId: number;
  actionId: number;
}

function resetDatabase(): void {
  db.exec(`
    DELETE FROM actions_log;
    DELETE FROM messages;
    DELETE FROM conversations;
    DELETE FROM tickets;
    DELETE FROM billing_history;
    DELETE FROM customers;
  `);
}

function seedBaseScenario(): SeededIds {
  const firstCustomer = db
    .prepare('INSERT INTO customers (name, email, plan_tier, account_status) VALUES (?, ?, ?, ?)')
    .run('Sarah Johnson', 'sarah.johnson@email.com', 'pro', 'active');

  const secondCustomer = db
    .prepare('INSERT INTO customers (name, email, plan_tier, account_status) VALUES (?, ?, ?, ?)')
    .run('Mike Chen', 'mike.chen@email.com', 'enterprise', 'active');

  const customerId = Number(firstCustomer.lastInsertRowid);
  const secondCustomerId = Number(secondCustomer.lastInsertRowid);

  db.prepare(
    'INSERT INTO billing_history (customer_id, amount, description, type, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(customerId, 9.99, 'Pro Plan - Monthly Subscription', 'charge', '2026-03-01T09:00:00Z');

  db.prepare(
    'INSERT INTO billing_history (customer_id, amount, description, type, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(customerId, 9.99, 'Pro Plan - Monthly Subscription (duplicate)', 'charge', '2026-03-03T09:00:00Z');

  const openTicket = db
    .prepare('INSERT INTO tickets (customer_id, subject, status, priority, category, ai_summary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(
      customerId,
      'Duplicate charge on March invoice',
      'in_progress',
      'high',
      'billing',
      'Customer reported a possible duplicate charge on the latest invoice.',
      '2026-03-14T09:00:00Z'
    );

  const resolvedTicket = db
    .prepare('INSERT INTO tickets (customer_id, subject, status, priority, category, created_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(
      secondCustomerId,
      'SSO setup question',
      'resolved',
      'medium',
      'technical',
      '2026-03-13T08:00:00Z',
      '2026-03-13T08:30:00Z'
    );

  const ticketId = Number(openTicket.lastInsertRowid);
  const resolvedTicketId = Number(resolvedTicket.lastInsertRowid);

  const conversation = db
    .prepare('INSERT INTO conversations (ticket_id, customer_id, started_at) VALUES (?, ?, ?)')
    .run(ticketId, customerId, '2026-03-14T09:05:00Z');

  const conversationId = Number(conversation.lastInsertRowid);

  db.prepare('INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)')
    .run(conversationId, 'customer', 'I think I was charged twice this month.', '2026-03-14T09:05:00Z');

  db.prepare('INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)')
    .run(conversationId, 'ai', 'I am checking your recent billing history now.', '2026-03-14T09:06:00Z');

  const action = db
    .prepare('INSERT INTO actions_log (ticket_id, action_type, parameters, status, ai_reasoning, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(
      ticketId,
      'refund',
      JSON.stringify({ customer_id: customerId, amount: 9.99, reason: 'duplicate charge' }),
      'proposed',
      'A duplicate charge is visible in the billing history.',
      '2026-03-14T09:07:00Z'
    );

  return {
    customerId,
    secondCustomerId,
    ticketId,
    resolvedTicketId,
    conversationId,
    actionId: Number(action.lastInsertRowid),
  };
}

beforeAll(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(CREATE_TABLES_SQL);
});

beforeEach(() => {
  resetDatabase();
});

afterAll(() => {
  db.close();
});

describe('customerRepository', () => {
  it('finds customers by email and id', () => {
    const { customerId } = seedBaseScenario();

    const byEmail = customerRepository.findByEmail('sarah.johnson@email.com');
    const byId = customerRepository.findById(customerId);

    expect(byEmail?.name).toBe('Sarah Johnson');
    expect(byId?.plan_tier).toBe('pro');
  });

  it('creates customers, lists them, and updates plan tier', () => {
    seedBaseScenario();

    const created = customerRepository.create({
      name: 'Emma Wilson',
      email: 'emma.wilson@email.com',
      plan_tier: 'free',
      account_status: 'trial',
    });

    const allCustomers = customerRepository.findAll();
    const updated = customerRepository.updatePlan(created.id, 'enterprise');

    expect(allCustomers).toHaveLength(3);
    expect(updated?.plan_tier).toBe('enterprise');
  });
});

describe('billingRepository', () => {
  it('returns billing history in descending order and respects limits', () => {
    const { customerId } = seedBaseScenario();

    const allRecords = billingRepository.findByCustomerId(customerId);
    const limitedRecords = billingRepository.findByCustomerId(customerId, 1);

    expect(allRecords).toHaveLength(2);
    expect(allRecords[0].description).toContain('duplicate');
    expect(limitedRecords).toHaveLength(1);
  });

  it('creates refund and charge records through repository helpers', () => {
    const { customerId } = seedBaseScenario();

    const refund = billingRepository.createRefund(customerId, 9.99, 'duplicate charge');
    const charge = billingRepository.createCharge(customerId, 19.99, 'Additional storage add-on');

    expect(billingRepository.findById(refund.id)?.type).toBe('refund');
    expect(billingRepository.findById(charge.id)?.description).toBe('Additional storage add-on');
  });
});

describe('ticketRepository', () => {
  it('returns joined ticket data and filters by status', () => {
    const { ticketId } = seedBaseScenario();

    const allTickets = ticketRepository.findAll();
    const inProgressTickets = ticketRepository.findAll({ status: 'in_progress' });
    const ticket = ticketRepository.findById(ticketId);

    expect(allTickets).toHaveLength(2);
    expect(inProgressTickets).toHaveLength(1);
    expect(ticket?.customer_email).toBe('sarah.johnson@email.com');
  });

  it('creates tickets and updates status, summary, priority, category, and assignment', () => {
    const { customerId } = seedBaseScenario();

    const created = ticketRepository.create({
      customer_id: customerId,
      subject: 'Need help with storage limits',
      priority: 'medium',
      category: 'account',
    });

    ticketRepository.updateStatus(created.id, 'in_progress');
    ticketRepository.updateSummary(created.id, 'Customer needs help understanding storage usage limits.');
    ticketRepository.updatePriority(created.id, 'critical');
    ticketRepository.updateCategory(created.id, 'technical');
    ticketRepository.assignAgent(created.id, 'agent-7');

    const updated = ticketRepository.findById(created.id);

    expect(updated?.status).toBe('in_progress');
    expect(updated?.ai_summary).toContain('storage usage');
    expect(updated?.priority).toBe('critical');
    expect(updated?.category).toBe('technical');
    expect(updated?.assigned_agent_id).toBe('agent-7');
  });

  it('computes ticket analytics through repository methods', () => {
    seedBaseScenario();

    expect(ticketRepository.countByStatus()).toMatchObject({ in_progress: 1, resolved: 1 });
    expect(ticketRepository.countByCategory()).toMatchObject({ billing: 1, technical: 1 });
    expect(ticketRepository.countByPriority()).toMatchObject({ high: 1, medium: 1 });
    expect(ticketRepository.getTotal()).toBe(2);
    expect(ticketRepository.getAverageResolutionTime()).toBeGreaterThan(0);
    expect(ticketRepository.getRecentTrend(7)).toHaveLength(7);
    expect(ticketRepository.getSatisfactionScore()).toBeGreaterThan(0);
  });
});

describe('conversationRepository and messageRepository', () => {
  it('finds and creates conversations, including active conversation details', () => {
    const { ticketId, customerId, conversationId } = seedBaseScenario();

    const byId = conversationRepository.findById(conversationId);
    const byTicketId = conversationRepository.findByTicketId(ticketId);
    const active = conversationRepository.findActive();
    const created = conversationRepository.create(ticketId, customerId);

    expect(byId?.ticket_id).toBe(ticketId);
    expect(byTicketId?.customer_id).toBe(customerId);
    expect(active[0].customer_name).toBe('Sarah Johnson');
    expect(created.ticket_id).toBe(ticketId);
  });

  it('creates messages and returns ordered conversation history', () => {
    const { conversationId } = seedBaseScenario();

    const created = messageRepository.create({
      conversation_id: conversationId,
      role: 'agent',
      content: 'I am stepping in to review this billing issue.',
      tool_call: JSON.stringify({ tool: 'issue_refund' }),
    });

    const messages = messageRepository.findByConversationId(conversationId);
    const createdMessage = messages.find((message) => message.id === created.id);

    expect(messages).toHaveLength(3);
    expect(createdMessage?.role).toBe('agent');
    expect(createdMessage?.tool_call).toContain('issue_refund');
  });

  it('ends conversations so they no longer appear as active', () => {
    const { conversationId } = seedBaseScenario();

    conversationRepository.end(conversationId);

    expect(conversationRepository.findActive()).toHaveLength(0);
  });
});

describe('actionLogRepository', () => {
  it('creates actions, lists them by ticket, finds pending actions, and updates status', () => {
    const { ticketId, actionId } = seedBaseScenario();

    const created = actionLogRepository.create({
      ticket_id: ticketId,
      action_type: 'password_reset',
      parameters: { customer_id: 1, email: 'sarah.johnson@email.com' },
      ai_reasoning: 'Customer cannot access the account and requested a password reset.',
    });

    const byTicket = actionLogRepository.findByTicketId(ticketId);
    const byId = actionLogRepository.findById(actionId);
    const pending = actionLogRepository.findPending();

    actionLogRepository.updateStatus(created.id, 'executed');
    const updated = actionLogRepository.findById(created.id);

    expect(byTicket).toHaveLength(2);
    expect(byId?.status).toBe('proposed');
    expect(pending).toHaveLength(2);
    expect(updated?.status).toBe('executed');
    expect(updated?.parameters).toContain('sarah.johnson@email.com');
  });
});
