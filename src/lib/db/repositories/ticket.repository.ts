import { getDb } from '../connection';

export interface Ticket {
  readonly id: number;
  readonly customer_id: number;
  readonly subject: string;
  readonly status: 'open' | 'in_progress' | 'resolved' | 'escalated';
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly category: 'billing' | 'technical' | 'account' | 'feature_request' | 'bug' | null;
  readonly ai_summary: string | null;
  readonly assigned_agent_id: string | null;
  readonly satisfaction_rating: number | null;
  readonly sentiment: 'positive' | 'neutral' | 'negative' | null;
  readonly frustration_score: number | null;
  readonly created_at: string;
  readonly resolved_at: string | null;
}

export interface TicketWithCustomer extends Ticket {
  readonly customer_name: string;
  readonly customer_email: string;
  readonly customer_plan: string;
}

export const ticketRepository = {
  findAll(filters?: { status?: string; priority?: string; category?: string; limit?: number; offset?: number }): TicketWithCustomer[] {
    const db = getDb();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters?.status) { conditions.push('t.status = ?'); params.push(filters.status); }
    if (filters?.priority) { conditions.push('t.priority = ?'); params.push(filters.priority); }
    if (filters?.category) { conditions.push('t.category = ?'); params.push(filters.category); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    return db.prepare(`
      SELECT t.*, c.name as customer_name, c.email as customer_email, c.plan_tier as customer_plan
      FROM tickets t
      JOIN customers c ON t.customer_id = c.id
      ${where}
      ORDER BY
        CASE t.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        t.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as TicketWithCustomer[];
  },

  findById(id: number): TicketWithCustomer | undefined {
    const db = getDb();
    return db.prepare(`
      SELECT t.*, c.name as customer_name, c.email as customer_email, c.plan_tier as customer_plan
      FROM tickets t
      JOIN customers c ON t.customer_id = c.id
      WHERE t.id = ?
    `).get(id) as TicketWithCustomer | undefined;
  },

  findByCustomerId(customerId: number, limit = 10): Ticket[] {
    const db = getDb();
    return db.prepare(
      'SELECT * FROM tickets WHERE customer_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(customerId, limit) as Ticket[];
  },

  create(data: { customer_id: number; subject: string; priority?: string; category?: string }): Ticket {
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO tickets (customer_id, subject, priority, category) VALUES (?, ?, ?, ?)'
    ).run(data.customer_id, data.subject, data.priority || 'medium', data.category || null);
    return db.prepare('SELECT * FROM tickets WHERE id = ?').get(result.lastInsertRowid) as Ticket;
  },

  updateStatus(id: number, status: Ticket['status']): void {
    const db = getDb();
    const resolvedAt = status === 'resolved' ? new Date().toISOString() : null;
    db.prepare('UPDATE tickets SET status = ?, resolved_at = COALESCE(?, resolved_at) WHERE id = ?')
      .run(status, resolvedAt, id);
  },

  updateSummary(id: number, summary: string): void {
    const db = getDb();
    db.prepare('UPDATE tickets SET ai_summary = ? WHERE id = ?').run(summary, id);
  },

  updatePriority(id: number, priority: Ticket['priority']): void {
    const db = getDb();
    db.prepare('UPDATE tickets SET priority = ? WHERE id = ?').run(priority, id);
  },

  updateCategory(id: number, category: string): void {
    const db = getDb();
    db.prepare('UPDATE tickets SET category = ? WHERE id = ?').run(category, id);
  },

  assignAgent(id: number, agentId: string | null): void {
    const db = getDb();
    db.prepare('UPDATE tickets SET assigned_agent_id = ? WHERE id = ?').run(agentId, id);
  },

  updateSatisfaction(id: number, rating: number): void {
    const db = getDb();
    db.prepare('UPDATE tickets SET satisfaction_rating = ? WHERE id = ?').run(rating, id);
  },

  updateSentiment(id: number, sentiment: 'positive' | 'neutral' | 'negative', frustrationScore: number): void {
    const db = getDb();
    db.prepare('UPDATE tickets SET sentiment = ?, frustration_score = ? WHERE id = ?')
      .run(sentiment, frustrationScore, id);
  },

  countByStatus(): Record<string, number> {
    const db = getDb();
    const rows = db.prepare('SELECT status, COUNT(*) as count FROM tickets GROUP BY status').all() as { status: string; count: number }[];
    return Object.fromEntries(rows.map(r => [r.status, r.count]));
  },

  countByCategory(): Record<string, number> {
    const db = getDb();
    const rows = db.prepare('SELECT category, COUNT(*) as count FROM tickets WHERE category IS NOT NULL GROUP BY category').all() as { category: string; count: number }[];
    return Object.fromEntries(rows.map(r => [r.category, r.count]));
  },

  countByPriority(): Record<string, number> {
    const db = getDb();
    const rows = db.prepare('SELECT priority, COUNT(*) as count FROM tickets GROUP BY priority').all() as { priority: string; count: number }[];
    return Object.fromEntries(rows.map(r => [r.priority, r.count]));
  },

  getAverageResolutionTime(): number {
    const db = getDb();
    const result = db.prepare(`
      SELECT AVG(
        (julianday(resolved_at) - julianday(created_at)) * 24 * 60
      ) as avg_minutes
      FROM tickets
      WHERE resolved_at IS NOT NULL
    `).get() as { avg_minutes: number | null };
    return result.avg_minutes || 0;
  },

  getTotal(): number {
    const db = getDb();
    const result = db.prepare('SELECT COUNT(*) as count FROM tickets').get() as { count: number };
    return result.count;
  },

  getRecentTrend(days = 7): { date: string; tickets: number; resolved: number }[] {
    const db = getDb();
    const rows = db.prepare(`
      WITH RECURSIVE dates(d) AS (
        SELECT date('now', '-' || ? || ' days')
        UNION ALL
        SELECT date(d, '+1 day') FROM dates WHERE d < date('now')
      )
      SELECT
        dates.d as date,
        COALESCE(SUM(CASE WHEN date(t.created_at) = dates.d THEN 1 ELSE 0 END), 0) as tickets,
        COALESCE(SUM(CASE WHEN date(t.resolved_at) = dates.d THEN 1 ELSE 0 END), 0) as resolved
      FROM dates
      LEFT JOIN tickets t ON date(t.created_at) = dates.d OR date(t.resolved_at) = dates.d
      GROUP BY dates.d
      ORDER BY dates.d
    `).all(days - 1) as { date: string; tickets: number; resolved: number }[];
    return rows;
  },

  /** Compare this week vs last week for trend percentages */
  getWeekOverWeekTrends(): {
    ticketsTrend: number;
    resolutionRateTrend: number;
    resolutionTimeTrend: number;
    satisfactionTrend: number;
  } {
    const db = getDb();

    const thisWeek = db.prepare(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        AVG(CASE WHEN resolved_at IS NOT NULL
          THEN (julianday(resolved_at) - julianday(created_at)) * 24 * 60
          ELSE NULL END) as avg_minutes
      FROM tickets
      WHERE created_at >= date('now', '-7 days')
    `).get() as { total: number; resolved: number; avg_minutes: number | null };

    const lastWeek = db.prepare(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        AVG(CASE WHEN resolved_at IS NOT NULL
          THEN (julianday(resolved_at) - julianday(created_at)) * 24 * 60
          ELSE NULL END) as avg_minutes
      FROM tickets
      WHERE created_at >= date('now', '-14 days') AND created_at < date('now', '-7 days')
    `).get() as { total: number; resolved: number; avg_minutes: number | null };

    const pctChange = (curr: number, prev: number): number => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const thisRate = thisWeek.total > 0 ? thisWeek.resolved / thisWeek.total : 0;
    const lastRate = lastWeek.total > 0 ? lastWeek.resolved / lastWeek.total : 0;

    return {
      ticketsTrend: pctChange(thisWeek.total, lastWeek.total),
      resolutionRateTrend: pctChange(thisRate * 100, lastRate * 100),
      resolutionTimeTrend: pctChange(
        lastWeek.avg_minutes || 0,
        thisWeek.avg_minutes || 0
      ), // inverted: faster is positive
      satisfactionTrend: pctChange(thisRate * 100, lastRate * 100),
    };
  },

  getSatisfactionScore(): number {
    const db = getDb();

    // Use real CSAT ratings when available
    const ratings = db.prepare(`
      SELECT AVG(satisfaction_rating) as avg_rating, COUNT(satisfaction_rating) as rated_count
      FROM tickets
      WHERE satisfaction_rating IS NOT NULL
    `).get() as { avg_rating: number | null; rated_count: number };

    if (ratings.rated_count >= 3 && ratings.avg_rating !== null) {
      return Math.round(ratings.avg_rating * 10) / 10;
    }

    // Fallback: estimate from resolution metrics when insufficient ratings
    const result = db.prepare(`
      SELECT
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(*) as total,
        AVG(CASE
          WHEN resolved_at IS NOT NULL
          THEN (julianday(resolved_at) - julianday(created_at)) * 24 * 60
          ELSE NULL
        END) as avg_resolution_minutes
      FROM tickets
    `).get() as { resolved: number; total: number; avg_resolution_minutes: number | null };

    const resolutionRate = result.total > 0 ? result.resolved / result.total : 0;
    const avgMinutes = result.avg_resolution_minutes || 60;
    const speedBonus = Math.max(0, 1.0 - (avgMinutes / 120));
    const score = 3.0 + resolutionRate * 1.0 + speedBonus;
    return Math.round(Math.min(score, 5.0) * 10) / 10;
  },
};
