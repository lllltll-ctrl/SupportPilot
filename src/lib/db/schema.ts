export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK(plan_tier IN ('free', 'pro', 'enterprise')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  account_status TEXT NOT NULL DEFAULT 'active' CHECK(account_status IN ('active', 'suspended', 'trial'))
);

CREATE TABLE IF NOT EXISTS billing_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('charge', 'refund')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'escalated')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
  category TEXT DEFAULT NULL CHECK(category IN ('billing', 'technical', 'account', 'feature_request', 'bug')),
  ai_summary TEXT,
  assigned_agent_id TEXT,
  satisfaction_rating INTEGER DEFAULT NULL CHECK(satisfaction_rating BETWEEN 1 AND 5),
  sentiment TEXT DEFAULT NULL CHECK(sentiment IN ('positive', 'neutral', 'negative')),
  frustration_score REAL DEFAULT NULL CHECK(frustration_score BETWEEN 0.0 AND 1.0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('customer', 'ai', 'agent', 'system')),
  content TEXT NOT NULL,
  tool_call TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE TABLE IF NOT EXISTS actions_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  action_type TEXT NOT NULL CHECK(action_type IN ('refund', 'password_reset', 'plan_change', 'bug_ticket', 'escalation')),
  parameters TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed', 'approved', 'executed', 'rejected')),
  ai_reasoning TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE INDEX IF NOT EXISTS idx_billing_customer ON billing_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_conversations_ticket ON conversations(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_actions_ticket ON actions_log(ticket_id);
`;
