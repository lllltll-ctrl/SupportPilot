import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { CREATE_TABLES_SQL } from '../../db/schema';

// We test the tool executor's business logic by setting up a real test DB
// and calling executeTool / executeConfirmedAction / rejectAction directly.

const TEST_DB_PATH = path.join(process.cwd(), 'data', 'test-executor.db');

// We need to mock the DB connection so tool-executor uses our test DB
let db: Database.Database;

beforeAll(() => {
  const dir = path.dirname(TEST_DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);

  db = new Database(TEST_DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(CREATE_TABLES_SQL);

  // Set DATABASE_PATH so the connection module picks up our test DB
  process.env.DATABASE_PATH = TEST_DB_PATH;
});

afterAll(() => {
  db.close();
  delete process.env.DATABASE_PATH;
  // DB file may be locked by the imported connection module — clean up is best-effort
  try {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  } catch {
    // Ignore — will be cleaned on next run
  }
});

// Seed fresh data before each test suite
beforeEach(() => {
  db.exec('DELETE FROM actions_log');
  db.exec('DELETE FROM messages');
  db.exec('DELETE FROM conversations');
  db.exec('DELETE FROM tickets');
  db.exec('DELETE FROM billing_history');
  db.exec('DELETE FROM customers');

  db.prepare(
    `INSERT INTO customers (id, name, email, plan_tier, account_status) VALUES (?, ?, ?, ?, ?)`
  ).run(1, 'Test User', 'test@example.com', 'pro', 'active');

  db.prepare(
    `INSERT INTO billing_history (id, customer_id, amount, description, type) VALUES (?, ?, ?, ?, ?)`
  ).run(1, 1, 9.99, 'Pro Plan - Monthly', 'charge');
  db.prepare(
    `INSERT INTO billing_history (id, customer_id, amount, description, type) VALUES (?, ?, ?, ?, ?)`
  ).run(2, 1, 9.99, 'Pro Plan - Monthly (duplicate)', 'charge');

  db.prepare(
    `INSERT INTO tickets (id, customer_id, subject, status, priority, category) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(1, 1, 'Billing issue', 'open', 'medium', 'billing');

  db.prepare(
    `INSERT INTO conversations (id, ticket_id, customer_id) VALUES (?, ?, ?)`
  ).run(1, 1, 1);
});

// Dynamic imports so they pick up the mocked DATABASE_PATH
async function getExecutor() {
  // Clear module cache to force fresh import with new DATABASE_PATH
  const mod = await import('../tool-executor');
  return mod;
}

describe('executeTool — business logic', () => {
  describe('lookup_customer', () => {
    it('should find customer by email and return context', async () => {
      const { executeTool } = await getExecutor();
      const result = executeTool('lookup_customer', { email: 'test@example.com' }, 1);

      expect(result.requiresConfirmation).toBe(false);
      const data = result.result as { customer: { id: number; name: string }; context: string };
      expect(data.customer.id).toBe(1);
      expect(data.customer.name).toBe('Test User');
      expect(data.context).toContain('Test User');
    });

    it('should return error for non-existent customer', async () => {
      const { executeTool } = await getExecutor();
      const result = executeTool('lookup_customer', { email: 'missing@example.com' }, 1);

      expect(result.requiresConfirmation).toBe(false);
      expect((result.result as { error: string }).error).toBe('Customer not found');
    });

    it('should find customer by ID', async () => {
      const { executeTool } = await getExecutor();
      const result = executeTool('lookup_customer', { customer_id: 1 }, 1);

      const data = result.result as { customer: { id: number } };
      expect(data.customer.id).toBe(1);
    });
  });

  describe('get_billing_history', () => {
    it('should return billing records for customer', async () => {
      const { executeTool } = await getExecutor();
      const result = executeTool('get_billing_history', { customer_id: 1 }, 1);

      const data = result.result as { billing: unknown[]; total: number };
      expect(data.billing).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it('should respect limit parameter', async () => {
      const { executeTool } = await getExecutor();
      const result = executeTool('get_billing_history', { customer_id: 1, limit: 1 }, 1);

      const data = result.result as { billing: unknown[]; total: number };
      expect(data.billing).toHaveLength(1);
    });
  });

  describe('issue_refund', () => {
    it('should require confirmation when ticketId is provided', async () => {
      const { executeTool } = await getExecutor();
      const result = executeTool('issue_refund', {
        customer_id: 1,
        amount: 9.99,
        reason: 'Duplicate charge',
      }, 1);

      expect(result.requiresConfirmation).toBe(true);
      expect(result.actionId).toBeDefined();
      expect(result.actionDescription).toContain('$9.99');

      // Verify action was logged as proposed
      const action = db.prepare('SELECT * FROM actions_log WHERE id = ?').get(result.actionId) as { status: string; action_type: string };
      expect(action.status).toBe('proposed');
      expect(action.action_type).toBe('refund');
    });

    it('should execute directly when no ticketId', async () => {
      const { executeTool } = await getExecutor();
      const result = executeTool('issue_refund', {
        customer_id: 1,
        amount: 5.00,
        reason: 'Test refund',
      }, null);

      expect(result.requiresConfirmation).toBe(false);
      const data = result.result as { refund: { type: string }; message: string };
      expect(data.refund.type).toBe('refund');
      expect(data.message).toContain('$5.00');

      // Verify billing record was created
      const refunds = db.prepare('SELECT * FROM billing_history WHERE type = ?').all('refund');
      expect(refunds).toHaveLength(1);
    });
  });

  describe('change_plan', () => {
    it('should require confirmation when ticketId is provided', async () => {
      const { executeTool } = await getExecutor();
      const result = executeTool('change_plan', {
        customer_id: 1,
        new_plan: 'enterprise',
      }, 1);

      expect(result.requiresConfirmation).toBe(true);
      expect(result.actionDescription).toContain('pro');
      expect(result.actionDescription).toContain('enterprise');
    });

    it('should execute directly when no ticketId', async () => {
      const { executeTool } = await getExecutor();
      const result = executeTool('change_plan', {
        customer_id: 1,
        new_plan: 'enterprise',
      }, null);

      expect(result.requiresConfirmation).toBe(false);

      // Verify the plan was actually changed
      const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(1) as { plan_tier: string };
      expect(customer.plan_tier).toBe('enterprise');
    });

    it('should return error for non-existent customer', async () => {
      const { executeTool } = await getExecutor();
      const result = executeTool('change_plan', {
        customer_id: 999,
        new_plan: 'pro',
      }, 1);

      expect((result.result as { error: string }).error).toBe('Customer not found');
    });
  });

  describe('reset_password', () => {
    it('should require confirmation when ticketId is provided', async () => {
      const { executeTool } = await getExecutor();
      const result = executeTool('reset_password', { customer_id: 1 }, 1);

      expect(result.requiresConfirmation).toBe(true);
      expect(result.actionDescription).toContain('test@example.com');
    });
  });

  describe('create_bug_ticket', () => {
    it('should create a bug ticket and log action', async () => {
      const { executeTool } = await getExecutor();
      const result = executeTool('create_bug_ticket', {
        customer_id: 1,
        title: 'Upload fails',
        description: 'Files over 100MB fail to upload',
        severity: 'high',
      }, 1);

      expect(result.requiresConfirmation).toBe(false);
      const data = result.result as { bugTicket: { id: number }; message: string };
      expect(data.bugTicket.id).toBeDefined();
      expect(data.message).toContain('Upload fails');

      // Verify ticket was created
      const bugTicket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(data.bugTicket.id) as { category: string; priority: string };
      expect(bugTicket.category).toBe('bug');
      expect(bugTicket.priority).toBe('high');
    });
  });

  describe('escalate_to_human', () => {
    it('should escalate ticket and log action', async () => {
      const { executeTool } = await getExecutor();
      const result = executeTool('escalate_to_human', {
        customer_id: 1,
        reason: 'Complex issue',
        context_summary: 'Customer needs manual intervention',
      }, 1);

      expect(result.requiresConfirmation).toBe(false);

      // Verify ticket status was changed to escalated
      const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(1) as { status: string };
      expect(ticket.status).toBe('escalated');

      // Verify action was logged
      const actions = db.prepare('SELECT * FROM actions_log WHERE ticket_id = ? AND action_type = ?').all(1, 'escalation');
      expect(actions).toHaveLength(1);
    });
  });

  describe('unknown tool', () => {
    it('should return error for unknown tool', async () => {
      const { executeTool } = await getExecutor();
      const result = executeTool('nonexistent_tool', {}, 1);

      expect((result.result as { error: string }).error).toContain('Unknown tool');
    });
  });
});

describe('executeConfirmedAction', () => {
  it('should execute a proposed refund', async () => {
    const { executeTool, executeConfirmedAction } = await getExecutor();

    // Create a proposed refund
    const proposed = executeTool('issue_refund', {
      customer_id: 1,
      amount: 9.99,
      reason: 'Duplicate charge',
    }, 1);

    expect(proposed.actionId).toBeDefined();

    // Confirm it
    const result = executeConfirmedAction(proposed.actionId!);
    expect(result.success).toBe(true);
    expect(result.message).toContain('$9.99');

    // Verify action status was updated
    const action = db.prepare('SELECT * FROM actions_log WHERE id = ?').get(proposed.actionId) as { status: string };
    expect(action.status).toBe('executed');

    // Verify refund billing record was created
    const refunds = db.prepare('SELECT * FROM billing_history WHERE type = ?').all('refund');
    expect(refunds).toHaveLength(1);
  });

  it('should execute a proposed plan change', async () => {
    const { executeTool, executeConfirmedAction } = await getExecutor();

    const proposed = executeTool('change_plan', {
      customer_id: 1,
      new_plan: 'enterprise',
    }, 1);

    const result = executeConfirmedAction(proposed.actionId!);
    expect(result.success).toBe(true);

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(1) as { plan_tier: string };
    expect(customer.plan_tier).toBe('enterprise');
  });

  it('should reject already executed actions', async () => {
    const { executeTool, executeConfirmedAction } = await getExecutor();

    const proposed = executeTool('issue_refund', {
      customer_id: 1,
      amount: 5.00,
      reason: 'Test',
    }, 1);

    // Execute once
    executeConfirmedAction(proposed.actionId!);

    // Try to execute again
    const result = executeConfirmedAction(proposed.actionId!);
    expect(result.success).toBe(false);
    expect(result.message).toContain('already');
  });

  it('should return error for non-existent action', async () => {
    const { executeConfirmedAction } = await getExecutor();
    const result = executeConfirmedAction(99999);
    expect(result.success).toBe(false);
  });
});

describe('rejectAction', () => {
  it('should reject a proposed action', async () => {
    const { executeTool, rejectAction } = await getExecutor();

    const proposed = executeTool('issue_refund', {
      customer_id: 1,
      amount: 9.99,
      reason: 'Test rejection',
    }, 1);

    const result = rejectAction(proposed.actionId!);
    expect(result.success).toBe(true);

    const action = db.prepare('SELECT * FROM actions_log WHERE id = ?').get(proposed.actionId) as { status: string };
    expect(action.status).toBe('rejected');
  });
});
