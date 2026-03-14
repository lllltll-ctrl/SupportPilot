import { getDb, isSeeded, markSeeded } from './connection';

export function seedDatabase(): void {
  if (isSeeded()) return;

  const db = getDb();

  const hasData = db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number };
  if (hasData.count > 0) {
    markSeeded();
    return;
  }

  db.exec('BEGIN TRANSACTION');

  try {
    // ========== CUSTOMERS (3 demo + 2 background) ==========
    db.prepare(`
      INSERT INTO customers (name, email, plan_tier, created_at, account_status) VALUES
      ('Sarah Johnson',    'sarah.johnson@email.com',    'pro',        '2025-06-15T10:30:00Z', 'active'),
      ('Emma Wilson',      'emma.wilson@email.com',      'free',       '2026-02-28T09:15:00Z', 'trial'),
      ('James Rodriguez',  'james.rodriguez@email.com',  'pro',        '2025-09-10T16:45:00Z', 'active'),
      ('Mike Chen',        'mike.chen@email.com',        'enterprise', '2025-01-20T14:00:00Z', 'active'),
      ('Lisa Park',        'lisa.park@email.com',        'enterprise', '2025-03-05T11:20:00Z', 'active')
    `).run();

    // ========== BILLING HISTORY ==========
    db.prepare(`
      INSERT INTO billing_history (customer_id, amount, description, type, created_at) VALUES
      (1, 9.99, 'Pro Plan - Monthly Subscription',  'charge', '2026-01-01T00:00:00Z'),
      (1, 9.99, 'Pro Plan - Monthly Subscription',  'charge', '2026-02-01T00:00:00Z'),
      (1, 9.99, 'Pro Plan - Monthly Subscription',  'charge', '2026-03-01T00:00:00Z'),
      (1, 9.99, 'Pro Plan - Monthly Subscription (duplicate)', 'charge', '2026-03-03T00:00:00Z'),
      (2, 0.00, 'Free Trial Started',               'charge', '2026-02-28T09:15:00Z'),
      (3, 9.99, 'Pro Plan - Monthly Subscription',  'charge', '2026-01-01T00:00:00Z'),
      (3, 9.99, 'Pro Plan - Monthly Subscription',  'charge', '2026-02-01T00:00:00Z'),
      (3, 9.99, 'Pro Plan - Monthly Subscription',  'charge', '2026-03-01T00:00:00Z'),
      (4, 49.99, 'Enterprise Plan - Monthly Subscription', 'charge', '2026-02-01T00:00:00Z'),
      (4, 49.99, 'Enterprise Plan - Monthly Subscription', 'charge', '2026-03-01T00:00:00Z'),
      (5, 49.99, 'Enterprise Plan - Monthly Subscription', 'charge', '2026-02-01T00:00:00Z'),
      (5, 49.99, 'Enterprise Plan - Monthly Subscription', 'charge', '2026-03-01T00:00:00Z')
    `).run();

    // No pre-seeded tickets — all conversations are created live during demo

    db.exec('COMMIT');
    markSeeded();
    console.log('Database seeded with demo data');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// Allow running directly: npx tsx src/lib/db/seed.ts
if (require.main === module) {
  seedDatabase();
}
