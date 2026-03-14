import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  className?: string;
}

export function StatsCard({ title, value, subtitle, icon: Icon, trend, className }: StatsCardProps) {
  return (
    <div className={cn('bg-gray-800/50 border border-gray-700/50 rounded-xl p-5', className)}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-gray-400">{title}</p>
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <div className="flex items-center gap-2 mt-1">
        {trend && (
          <span className={cn('text-xs font-medium', trend.positive ? 'text-green-400' : 'text-red-400')}>
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
        )}
        {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
      </div>
    </div>
  );
}
