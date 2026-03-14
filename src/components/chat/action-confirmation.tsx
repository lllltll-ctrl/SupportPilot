'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShieldCheck, X } from 'lucide-react';
import type { PendingAction } from '@/stores/chat.store';

interface ActionConfirmationProps {
  action: PendingAction;
  onConfirm: () => void;
  onReject: () => void;
  isProcessing: boolean;
}

export function ActionConfirmation({ action, onConfirm, onReject, isProcessing }: ActionConfirmationProps) {
  return (
    <div className="flex justify-start mb-4 ml-11">
      <Card className="max-w-[75%] p-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
              Action requires your confirmation
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
              {action.description}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={onConfirm}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isProcessing ? 'Processing...' : 'Confirm'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onReject}
                disabled={isProcessing}
              >
                <X className="w-3 h-3 mr-1" />
                Decline
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
