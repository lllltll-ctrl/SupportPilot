'use client';

import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/stores/chat.store';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isCustomer = message.role === 'customer';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-3 mb-4', isCustomer ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isCustomer ? 'bg-blue-500' : 'bg-violet-500'
        )}
      >
        {isCustomer ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-3',
          isCustomer
            ? 'bg-blue-500 text-white rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md'
        )}
      >
        {isCustomer ? (
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </div>
        ) : (
          <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-headings:text-sm prose-h2:text-base prose-hr:my-2">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        <div
          className={cn(
            'text-[10px] mt-1',
            isCustomer ? 'text-blue-100' : 'text-muted-foreground'
          )}
        >
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
