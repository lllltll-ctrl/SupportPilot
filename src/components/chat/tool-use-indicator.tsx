'use client';

import { Loader2, Search, CreditCard, Key, ArrowUpDown, Bug, PhoneForwarded } from 'lucide-react';

const TOOL_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  lookup_customer: { label: 'Looking up your account...', icon: <Search className="w-4 h-4" /> },
  get_billing_history: { label: 'Checking billing history...', icon: <CreditCard className="w-4 h-4" /> },
  get_past_tickets: { label: 'Reviewing past tickets...', icon: <Search className="w-4 h-4" /> },
  issue_refund: { label: 'Processing refund...', icon: <CreditCard className="w-4 h-4" /> },
  reset_password: { label: 'Preparing password reset...', icon: <Key className="w-4 h-4" /> },
  change_plan: { label: 'Preparing plan change...', icon: <ArrowUpDown className="w-4 h-4" /> },
  create_bug_ticket: { label: 'Creating bug report...', icon: <Bug className="w-4 h-4" /> },
  escalate_to_human: { label: 'Connecting to support agent...', icon: <PhoneForwarded className="w-4 h-4" /> },
};

interface ToolUseIndicatorProps {
  toolName: string;
}

export function ToolUseIndicator({ toolName }: ToolUseIndicatorProps) {
  const tool = TOOL_LABELS[toolName] || { label: 'Processing...', icon: <Loader2 className="w-4 h-4" /> };

  return (
    <div className="flex items-center gap-2 mb-3 ml-11">
      <div className="flex items-center gap-2 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 px-3 py-2 rounded-lg text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        {tool.icon}
        <span>{tool.label}</span>
      </div>
    </div>
  );
}
