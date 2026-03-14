'use client';

import { useEffect, useState } from 'react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { PriorityBadge, StatusBadge } from '@/components/dashboard/priority-badge';
import { DashboardSkeleton } from '@/components/dashboard/loading-skeletons';
import { Ticket, Clock, Bot, ThumbsUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface TrendData {
  ticketsTrend: number;
  resolutionRateTrend: number;
  resolutionTimeTrend: number;
  satisfactionTrend: number;
}

interface AnalyticsData {
  totalTickets: number;
  aiResolutionRate: number;
  avgResolutionTimeMinutes: number;
  customerSatisfaction: number;
  trends: TrendData;
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
}

interface TicketData {
  id: number;
  subject: string;
  status: string;
  priority: string;
  category: string;
  customer_name: string;
  created_at: string;
  ai_summary: string | null;
}

export default function DashboardOverview() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics').then(r => r.json()),
      fetch('/api/tickets?limit=5').then(r => r.json()),
    ]).then(([analyticsData, ticketsData]) => {
      setAnalytics(analyticsData);
      setTickets(ticketsData.tickets || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center h-16 px-6 border-b border-white/[0.06] flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

      {/* KPI Cards — trends computed from real week-over-week data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Tickets"
          value={analytics?.totalTickets || 0}
          subtitle="vs last week"
          icon={Ticket}
          trend={analytics?.trends ? { value: Math.abs(analytics.trends.ticketsTrend), positive: analytics.trends.ticketsTrend <= 0 } : undefined}
        />
        <StatsCard
          title="AI Resolution Rate"
          value={`${analytics?.aiResolutionRate || 0}%`}
          subtitle="Resolved by AI"
          icon={Bot}
          trend={analytics?.trends ? { value: Math.abs(analytics.trends.resolutionRateTrend), positive: analytics.trends.resolutionRateTrend >= 0 } : undefined}
        />
        <StatsCard
          title="Avg Resolution Time"
          value={`${analytics?.avgResolutionTimeMinutes || 0}m`}
          subtitle="Minutes"
          icon={Clock}
          trend={analytics?.trends ? { value: Math.abs(analytics.trends.resolutionTimeTrend), positive: analytics.trends.resolutionTimeTrend <= 0 } : undefined}
        />
        <StatsCard
          title="Satisfaction"
          value={`${analytics?.customerSatisfaction || 0}/5`}
          subtitle="Customer rating"
          icon={ThumbsUp}
          trend={analytics?.trends ? { value: Math.abs(analytics.trends.satisfactionTrend), positive: analytics.trends.satisfactionTrend >= 0 } : undefined}
        />
      </div>

      {/* Recent Tickets */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-700/50">
          <h2 className="font-semibold">Priority Tickets</h2>
          <Link href="/dashboard/tickets" className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-gray-700/50">
          {tickets.map(ticket => (
            <Link
              key={ticket.id}
              href={`/dashboard/tickets?id=${ticket.id}`}
              className="flex items-center gap-4 p-4 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium truncate">{ticket.subject}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{ticket.customer_name}</span>
                  {ticket.category && (
                    <span className="text-xs text-violet-300 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded">
                      {ticket.category}
                    </span>
                  )}
                </div>
              </div>
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </Link>
          ))}
          {tickets.length === 0 && (
            <p className="p-8 text-center text-gray-500 text-sm">Loading tickets...</p>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
