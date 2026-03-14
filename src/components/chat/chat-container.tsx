'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/stores/chat.store';
import { MessageBubble } from './message-bubble';
import { ChatInput } from './chat-input';
import { ToolUseIndicator } from './tool-use-indicator';
import { ActionConfirmation } from './action-confirmation';
import { SatisfactionRating } from './satisfaction-rating';
import { Button } from '@/components/ui/button';
import { Bot, LogOut, CheckCircle } from 'lucide-react';

export function ChatContainer() {
  const {
    messages,
    conversationId,
    ticketId,
    customerEmail,
    isStreaming,
    pendingAction,
    currentToolUse,
    showSatisfaction,
    satisfactionSubmitted,
    addMessage,
    updateLastAiMessage,
    setConversationId,
    setTicketId,
    setStreaming,
    setPendingAction,
    setCurrentToolUse,
    setShowSatisfaction,
    setSatisfactionSubmitted,
    reset,
  } = useChatStore();

  const [isConfirming, setIsConfirming] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentToolUse, pendingAction, scrollToBottom]);

  const sendMessage = useCallback(async (text: string) => {
    if (!customerEmail) return;

    // Re-open resolved conversation
    if (isResolved && ticketId) {
      fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      }).catch(() => {});
      setIsResolved(false);
      setShowSatisfaction(false);
      setSatisfactionSubmitted(false);
    }

    // Add customer message
    addMessage({
      id: crypto.randomUUID(),
      role: 'customer',
      content: text,
      timestamp: new Date().toISOString(),
    });

    setStreaming(true);

    // Add placeholder for AI response
    addMessage({
      id: crypto.randomUUID(),
      role: 'ai',
      content: '',
      timestamp: new Date().toISOString(),
    });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: text,
          customerEmail,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7);
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (eventType) {
                case 'conversation_created':
                  if (data.conversationId) setConversationId(data.conversationId);
                  if (data.ticketId) setTicketId(data.ticketId);
                  break;

                case 'text':
                  setCurrentToolUse(null);
                  updateLastAiMessage(data.text);
                  break;

                case 'tool_use':
                  setCurrentToolUse(data.tool);
                  break;

                case 'tool_result':
                  setCurrentToolUse(null);
                  break;

                case 'action_confirmation':
                  setPendingAction({
                    actionId: data.actionId,
                    actionType: data.actionType,
                    description: data.description,
                  });
                  break;

                case 'error':
                  updateLastAiMessage(`\n\nSorry, an error occurred: ${data.error}`);
                  break;

                case 'done':
                  break;
              }
            } catch {
              // Skip invalid JSON
            }
            eventType = '';
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateLastAiMessage(`Sorry, something went wrong: ${errorMessage}`);
    } finally {
      setStreaming(false);
      setCurrentToolUse(null);
    }
  }, [customerEmail, conversationId, ticketId, isResolved, addMessage, updateLastAiMessage, setConversationId, setTicketId, setStreaming, setPendingAction, setCurrentToolUse, setShowSatisfaction, setSatisfactionSubmitted]);

  const handleConfirmAction = useCallback(async () => {
    if (!pendingAction) return;
    setIsConfirming(true);

    try {
      const response = await fetch('/api/chat/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId: pendingAction.actionId, confirmed: true }),
      });

      const result = await response.json();

      addMessage({
        id: crypto.randomUUID(),
        role: 'system',
        content: result.message || 'Action confirmed and executed.',
        timestamp: new Date().toISOString(),
      });

      // Resolve ticket after successful action
      if (ticketId) {
        fetch(`/api/tickets/${ticketId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'resolved' }),
        }).catch(() => {});
        setIsResolved(true);
      }

      // Show CSAT rating after action completes
      setShowSatisfaction(true);
    } catch {
      addMessage({
        id: crypto.randomUUID(),
        role: 'system',
        content: 'Failed to confirm action. Please try again.',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setPendingAction(null);
      setIsConfirming(false);
    }
  }, [pendingAction, addMessage, setPendingAction, setShowSatisfaction]);

  const resolveTicket = useCallback(async () => {
    if (!ticketId) return;
    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      });
      setIsResolved(true);
      addMessage({
        id: crypto.randomUUID(),
        role: 'system',
        content: 'Conversation resolved. Thank you for contacting OrbitStack Support!',
        timestamp: new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  }, [ticketId, addMessage]);

  const handleRejectAction = useCallback(async () => {
    if (!pendingAction) return;
    setIsConfirming(true);

    try {
      await fetch('/api/chat/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId: pendingAction.actionId, confirmed: false }),
      });

      addMessage({
        id: crypto.randomUUID(),
        role: 'system',
        content: 'Action was declined.',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setPendingAction(null);
      setIsConfirming(false);
    }
  }, [pendingAction, addMessage, setPendingAction]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-background">
        <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-sm">Aria — AI Support Assistant</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>OrbitStack Support</span>
            {customerEmail && <span className="truncate">{customerEmail}</span>}
          </div>
        </div>
        {messages.length > 0 && !isResolved && (
          <Button
            size="sm"
            variant="outline"
            onClick={resolveTicket}
            disabled={isStreaming}
            className="gap-1.5 text-xs"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            End Chat
          </Button>
        )}
        {isResolved && (
          <span className="text-xs text-green-500 font-medium flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" />
            Resolved
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 px-4 py-6">
        {messages.length === 0 && (
          <div className="flex min-h-[50vh] flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Bot className="w-12 h-12 mb-4 text-violet-300" />
            <h3 className="font-medium text-lg mb-1">Welcome to OrbitStack Support</h3>
            <p className="text-sm max-w-sm">
              Hi! I&apos;m Aria, your AI support assistant. I can help with billing questions,
              account issues, and more. How can I help you today?
            </p>
          </div>
        )}

        {messages
          .filter((m) => m.content || m.role === 'system')
          .map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

        {currentToolUse && <ToolUseIndicator toolName={currentToolUse} />}

        {pendingAction && (
          <ActionConfirmation
            action={pendingAction}
            onConfirm={handleConfirmAction}
            onReject={handleRejectAction}
            isProcessing={isConfirming}
          />
        )}

        {showSatisfaction && !satisfactionSubmitted && ticketId && (
          <SatisfactionRating
            ticketId={ticketId}
            onRated={() => setSatisfactionSubmitted(true)}
          />
        )}

        {isStreaming && !currentToolUse && messages[messages.length - 1]?.content === '' && (
          <div className="flex items-center gap-2 ml-11 mb-3">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 flex items-end gap-2 border-t bg-background p-3">
        <Button
          size="icon"
          variant="ghost"
          onClick={reset}
          className="h-11 w-11 flex-shrink-0 rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Change account"
          title="Change account"
        >
          <LogOut className="h-4 w-4" />
        </Button>
        <ChatInput
          onSend={sendMessage}
          disabled={isStreaming || !!pendingAction}
        />
      </div>
    </div>
  );
}
