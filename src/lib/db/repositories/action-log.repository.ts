import { getDb } from '../connection';

export interface ActionLog {
  readonly id: number;
  readonly ticket_id: number;
  readonly action_type: 'refund' | 'password_reset' | 'plan_change' | 'bug_ticket' | 'escalation';
  readonly parameters: string;
  readonly status: 'proposed' | 'approved' | 'executed' | 'rejected';
  readonly ai_reasoning: string | null;
  readonly created_at: string;
}

export const actionLogRepository = {
  findByTicketId(ticketId: number): ActionLog[] {
    const db = getDb();
    return db.prepare(
      'SELECT * FROM actions_log WHERE ticket_id = ? ORDER BY created_at DESC'
    ).all(ticketId) as ActionLog[];
  },

  findById(id: number): ActionLog | undefined {
    const db = getDb();
    return db.prepare('SELECT * FROM actions_log WHERE id = ?').get(id) as ActionLog | undefined;
  },

  findPending(): ActionLog[] {
    const db = getDb();
    return db.prepare(
      'SELECT * FROM actions_log WHERE status = \'proposed\' ORDER BY created_at DESC'
    ).all() as ActionLog[];
  },

  create(data: {
    ticket_id: number;
    action_type: ActionLog['action_type'];
    parameters: Record<string, unknown>;
    status?: ActionLog['status'];
    ai_reasoning?: string;
  }): ActionLog {
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO actions_log (ticket_id, action_type, parameters, status, ai_reasoning) VALUES (?, ?, ?, ?, ?)'
    ).run(
      data.ticket_id,
      data.action_type,
      JSON.stringify(data.parameters),
      data.status || 'proposed',
      data.ai_reasoning || null
    );
    return db.prepare('SELECT * FROM actions_log WHERE id = ?').get(result.lastInsertRowid) as ActionLog;
  },

  updateStatus(id: number, status: ActionLog['status']): void {
    const db = getDb();
    db.prepare('UPDATE actions_log SET status = ? WHERE id = ?').run(status, id);
  },
};
