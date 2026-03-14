'use client';

import { useEffect, useState } from 'react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { AnalyticsSkeleton } from '@/components/dashboard/loading-skeletons';
import { Ticket, Bot, Clock, ThumbsUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';

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
  byCategory: { category: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  byStatus: { status: string; count: number }[];
  recentTrend: { date: string; tickets: number; resolved: number }[];
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(setData);
  }, []);

  if (!data) {
    return <AnalyticsSkeleton />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center h-16 px-6 border-b border-white/[0.06] flex-shrink-0">
        <h1 className="text-lg font-semibold">Analytics</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Tickets" value={data.totalTickets} icon={Ticket} trend={data.trends ? { value: Math.abs(data.trends.ticketsTrend), positive: data.trends.ticketsTrend <= 0 } : undefined} subtitle="vs last week" />
        <StatsCard title="AI Resolution Rate" value={`${data.aiResolutionRate}%`} icon={Bot} trend={data.trends ? { value: Math.abs(data.trends.resolutionRateTrend), positive: data.trends.resolutionRateTrend >= 0 } : undefined} subtitle="vs last week" />
        <StatsCard title="Avg Resolution Time" value={`${data.avgResolutionTimeMinutes}m`} icon={Clock} trend={data.trends ? { value: Math.abs(data.trends.resolutionTimeTrend), positive: data.trends.resolutionTimeTrend <= 0 } : undefined} subtitle="vs last week" />
        <StatsCard title="Satisfaction" value={`${data.customerSatisfaction}/5`} icon={ThumbsUp} trend={data.trends ? { value: Math.abs(data.trends.satisfactionTrend), positive: data.trends.satisfactionTrend >= 0 } : undefined} subtitle="vs last week" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets by Category */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Tickets by Category</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data.byCategory}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="count"
                nameKey="category"
                label={({ name, value }) => `${name} (${value})`}
                labelLine={false}
              >
                {data.byCategory.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Tickets by Priority */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Tickets by Priority</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.byPriority}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="priority" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.byPriority.map((entry) => (
                  <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] || '#8b5cf6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trend */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-medium text-gray-400 mb-4">7-Day Ticket Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.recentTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Legend />
              <Line type="monotone" dataKey="tickets" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} name="Total Tickets" />
              <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} name="Resolved" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      </div>
    </div>
  );
}
