import { cn } from '@/lib/utils';

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  high: { label: 'High', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  medium: { label: 'Medium', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  low: { label: 'Low', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-blue-500/20 text-blue-400' },
  in_progress: { label: 'In Progress', className: 'bg-yellow-500/20 text-yellow-400' },
  resolved: { label: 'Resolved', className: 'bg-green-500/20 text-green-400' },
  escalated: { label: 'Escalated', className: 'bg-red-500/20 text-red-400' },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', config.className)}>
      {config.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', config.className)}>
      {config.label}
    </span>
  );
}
