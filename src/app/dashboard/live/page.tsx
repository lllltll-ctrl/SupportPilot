'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LiveConversationsSkeleton } from '@/components/dashboard/loading-skeletons';
import { PriorityBadge, StatusBadge } from '@/components/dashboard/priority-badge';
import { MarkdownContent } from '@/components/dashboard/markdown-content';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Radio, MessageCircle, Clock, Users, UserCheck, Brain, RefreshCw,
  ArrowLeft, SendHorizontal, CheckCircle, AlertTriangle, Smile, Meh, Frown,
  Lightbulb, Sparkles,
} from 'lucide-react';

interface ActiveConversation {
  id: number;
  ticket_id: number;
  customer_name: string;
  customer_email: string;
  ticket_subject: string;
  ticket_status: string;
  ticket_priority: string;
  ticket_sentiment: 'positive' | 'neutral' | 'negative' | null;
  ticket_frustration_score: number | null;
  message_count: number;
  last_message: string | null;
  started_at: string;
}

interface MessageData {
  id: number;
  role: string;
  content: string;
  created_at: string;
}

interface ActionData {
  id: number;
  action_type: string;
  status: string;
  ai_reasoning: string | null;
  created_at: string;
}

interface TicketDetail {
  ticket: {
    id: number;
    subject: string;
    status: string;
    priority: string;
    customer_name: string;
    customer_email: string;
    customer_plan: string;
    ai_summary: string | null;
    assigned_agent_id: string | null;
    sentiment: 'positive' | 'neutral' | 'negative' | null;
    frustration_score: number | null;
  };
  conversation: {
    id: number;
  } | null;
  messages: MessageData[];
  actions: ActionData[];
}

interface Recommendation {
  action: string;
  reasoning: string;
  urgency: 'low' | 'medium' | 'high';
}

function SentimentBadge({ sentiment, frustrationScore }: { sentiment: 'positive' | 'neutral' | 'negative' | null; frustrationScore: number | null }) {
  if (!sentiment) return null;

  const isFrustrated = sentiment === 'negative' && (frustrationScore ?? 0) >= 0.7;

  if (isFrustrated) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400 border border-red-500/30">
        <AlertTriangle className="h-3 w-3 animate-pulse" />
        Frustrated
      </span>
    );
  }

  const config = {
    negative: { icon: Frown, className: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Negative' },
    neutral: { icon: Meh, className: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: 'Neutral' },
    positive: { icon: Smile, className: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Positive' },
  };

  const { icon: Icon, className, label } = config[sentiment];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

const URGENCY_STYLES: Record<string, string> = {
  high: 'border-red-500/30 bg-red-500/10',
  medium: 'border-yellow-500/30 bg-yellow-500/10',
  low: 'border-gray-700/30 bg-gray-900/40',
};

const URGENCY_BADGE_STYLES: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-gray-700 text-gray-300',
};

export default function LiveConversationsPage() {
  const [conversations, setConversations] = useState<ActiveConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [takingOver, setTakingOver] = useState<number | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<TicketDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [agentMessage, setAgentMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [resolvingTicket, setResolvingTicket] = useState<number | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use a ref to avoid the dependency loop: fetchConversations needs
  // the current selectedConversationId but must not recreate when it changes
  const selectedConvIdRef = useRef<number | null>(null);
  useEffect(() => { selectedConvIdRef.current = selectedConversationId; }, [selectedConversationId]);

  const hasSelectedConversation = selectedConversationId !== null;
  const isTakenOver = selectedDetail?.ticket.assigned_agent_id != null;

  const loadConversationDetail = useCallback(async (ticketId: number) => {
    setLoadingDetail(true);
    setDetailError(null);

    try {
      const res = await fetch(`/api/tickets/${ticketId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Unable to load conversation details');
      }

      setSelectedDetail(data);
    } catch (detailLoadError) {
      const message = detailLoadError instanceof Error ? detailLoadError.message : 'Unable to load conversation details';
      setDetailError(message);
      setSelectedDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const loadRecommendations = useCallback(async (ticketId: number) => {
    setLoadingRecs(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/recommendations`);
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch {
      setRecommendations([]);
    } finally {
      setLoadingRecs(false);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations/active');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Unable to load active conversations');
      }

      const nextConversations: ActiveConversation[] = data.conversations || [];
      setConversations(nextConversations);
      setError(null);

      if (nextConversations.length === 0) {
        setSelectedConversationId(null);
        setSelectedDetail(null);
        setDetailError(null);
        return;
      }

      const currentId = selectedConvIdRef.current;
      const nextSelected = nextConversations.find((c) => c.id === currentId)
        || nextConversations[0];

      setSelectedConversationId(nextSelected.id);
      void loadConversationDetail(nextSelected.ticket_id);
    } catch (listLoadError) {
      const message = listLoadError instanceof Error ? listLoadError.message : 'Unable to load active conversations';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [loadConversationDetail]);

  const handleTakeOver = async (ticketId: number) => {
    setTakingOver(ticketId);
    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigned_agent_id: 'agent-1',
        }),
      });
      await loadConversationDetail(ticketId);
    } finally {
      setTakingOver(null);
    }
  };

  const handleResolveTicket = async (ticketId: number) => {
    setResolvingTicket(ticketId);
    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      });
      await fetchConversations();
    } finally {
      setResolvingTicket(null);
    }
  };

  const handleSendAgentMessage = async () => {
    const trimmed = agentMessage.trim();
    if (!trimmed || !selectedDetail?.conversation?.id) return;

    setSendingMessage(true);
    try {
      const res = await fetch(`/api/conversations/${selectedDetail.conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });

      if (res.ok) {
        setAgentMessage('');
        await loadConversationDetail(selectedDetail.ticket.id);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAgentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendAgentMessage();
    }
  };

  useEffect(() => {
    void fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) || null;

  const handleSelectConversation = (conversation: ActiveConversation) => {
    setSelectedConversationId(conversation.id);
    setAgentMessage('');
    setRecommendations([]);
    void loadConversationDetail(conversation.ticket_id);
    void loadRecommendations(conversation.ticket_id);
    setTimeout(() => {
      if (detailRef.current) detailRef.current.scrollTop = 0;
    }, 0);
  };

  // Load recommendations when detail loads for the first time
  useEffect(() => {
    if (selectedDetail?.ticket.id && recommendations.length === 0 && !loadingRecs) {
      void loadRecommendations(selectedDetail.ticket.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDetail?.ticket.id]);

  if (loading) {
    return <LiveConversationsSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-white/[0.06] flex-shrink-0">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Radio className="h-4 w-4 text-green-400" />
          Live Conversations
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-gray-800/50 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-gray-300">{conversations.length} active</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-700 bg-gray-900/60 text-gray-200 hover:bg-gray-800"
            onClick={() => void fetchConversations()}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mx-6 flex h-64 flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 px-6 text-center">
          <p className="text-sm font-medium text-red-300">Unable to load live conversations</p>
          <p className="mt-2 text-sm text-gray-400">{error}</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-gray-500">
          <Users className="mb-4 h-12 w-12 text-gray-700" />
          <p className="mb-1 text-lg font-medium">No active conversations</p>
          <p className="text-sm">Conversations will appear here when customers start chatting</p>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          {/* Active Queue */}
          <div className={`flex h-full w-full flex-col border-r border-gray-700/50 xl:w-[360px] xl:flex-shrink-0 ${hasSelectedConversation ? 'hidden xl:flex' : 'flex'}`}>
            <div className="flex-shrink-0 border-b border-gray-700/50 px-5 py-4">
              <h2 className="text-sm font-semibold text-white">Active Queue</h2>
              <p className="mt-1 text-xs text-gray-400">Select a conversation to inspect.</p>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="space-y-3 p-4">
                {conversations.map((conversation) => {
                  const isSelected = conversation.id === selectedConversationId;
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => handleSelectConversation(conversation)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors ${
                        isSelected
                          ? 'border-violet-500/40 bg-violet-500/10'
                          : 'border-transparent bg-gray-900/40 hover:border-violet-500/30 hover:bg-gray-900/70'
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{conversation.customer_name}</p>
                          <p className="truncate text-xs text-gray-500">{conversation.customer_email}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <PriorityBadge priority={conversation.ticket_priority} />
                          <SentimentBadge
                            sentiment={conversation.ticket_sentiment}
                            frustrationScore={conversation.ticket_frustration_score}
                          />
                        </div>
                      </div>

                      <p className="mb-2 line-clamp-2 text-sm text-gray-300">{conversation.ticket_subject}</p>

                      <div className="mb-2 rounded-lg bg-gray-950/60 p-2">
                        <p className="line-clamp-2 text-xs text-gray-400">
                          {conversation.last_message || 'No messages yet.'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {conversation.message_count}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(conversation.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detail Panel */}
          <div className={`flex flex-1 min-h-0 flex-col ${hasSelectedConversation ? 'flex' : 'hidden xl:flex'}`}>
            {!selectedConversation || !selectedDetail ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center text-gray-500">
                {loadingDetail ? (
                  <>
                    <RefreshCw className="mb-4 h-8 w-8 animate-spin text-gray-600" />
                    <p className="text-sm">Loading conversation detail...</p>
                  </>
                ) : detailError ? (
                  <>
                    <p className="text-sm font-medium text-red-300">Unable to load</p>
                    <p className="mt-2 text-sm text-gray-400">{detailError}</p>
                  </>
                ) : (
                  <p className="text-sm">Select a conversation to inspect.</p>
                )}
              </div>
            ) : (
              <>
                {/* Sticky Header */}
                <div className="flex-shrink-0 border-b border-gray-700/50 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 xl:hidden">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-700 bg-gray-900/60 text-gray-200"
                          onClick={() => setSelectedConversationId(null)}
                        >
                          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                          Back
                        </Button>
                      </div>
                      <h2 className="truncate text-lg font-semibold text-white">{selectedDetail.ticket.subject}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-400">
                        <span>{selectedDetail.ticket.customer_name}</span>
                        <span className="text-gray-600">{selectedDetail.ticket.customer_email}</span>
                        <Badge variant="outline" className="border-gray-600 text-xs text-gray-300">
                          {selectedDetail.ticket.customer_plan}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <SentimentBadge
                        sentiment={selectedDetail.ticket.sentiment}
                        frustrationScore={selectedDetail.ticket.frustration_score}
                      />
                      <PriorityBadge priority={selectedDetail.ticket.priority} />
                      <StatusBadge status={selectedDetail.ticket.status} />
                      {!isTakenOver ? (
                        <Button
                          size="sm"
                          className="bg-violet-600 text-white hover:bg-violet-500"
                          disabled={takingOver === selectedConversation.ticket_id}
                          onClick={() => handleTakeOver(selectedConversation.ticket_id)}
                        >
                          <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                          {takingOver === selectedConversation.ticket_id ? 'Taking over...' : 'Take Over'}
                        </Button>
                      ) : (
                        <>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            <UserCheck className="mr-1 h-3 w-3" />
                            Agent assigned
                          </Badge>
                          <Button
                            size="sm"
                            className="bg-green-600 text-white hover:bg-green-500"
                            disabled={resolvingTicket === selectedConversation.ticket_id}
                            onClick={() => handleResolveTicket(selectedConversation.ticket_id)}
                          >
                            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                            {resolvingTicket === selectedConversation.ticket_id ? 'Resolving...' : 'Resolve'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {selectedDetail.ticket.ai_summary && (
                    <div className="mt-3 rounded-lg border border-violet-500/20 bg-violet-500/10 p-3">
                      <div className="mb-1 flex items-center gap-2 text-violet-300">
                        <Brain className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">AI Summary</span>
                      </div>
                      <p className="text-sm text-gray-300">{selectedDetail.ticket.ai_summary}</p>
                    </div>
                  )}
                </div>

                {/* Content area */}
                <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
                  {/* Messages column */}
                  <div className="flex flex-1 min-h-0 flex-col border-b border-gray-700/50 lg:border-b-0 lg:border-r lg:border-gray-700/50">
                    <div ref={detailRef} className="flex-1 overflow-y-auto p-5">
                      <div className="flex items-center gap-2 mb-4 text-sm font-medium text-gray-400">
                        <MessageCircle className="h-4 w-4" />
                        Conversation Timeline
                      </div>

                      {selectedDetail.messages.length === 0 ? (
                        <p className="text-sm italic text-gray-600">No messages yet.</p>
                      ) : (
                        <div className="space-y-4">
                          {selectedDetail.messages.map((message) => {
                            // System messages render as centered banners
                            if (message.role === 'system') {
                              return (
                                <div key={message.id} className="flex justify-center">
                                  <div className="inline-flex items-center gap-2 rounded-full bg-gray-800/60 px-4 py-1.5 text-xs text-gray-400">
                                    <Clock className="h-3 w-3" />
                                    {message.content}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div key={message.id} className="flex gap-3">
                                <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                                  message.role === 'customer'
                                    ? 'bg-blue-500/20 text-blue-300'
                                    : message.role === 'ai'
                                    ? 'bg-violet-500/20 text-violet-300'
                                    : 'bg-green-500/20 text-green-300'
                                }`}>
                                  {message.role === 'customer' ? 'C' : message.role === 'ai' ? 'AI' : 'AG'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="mb-0.5 flex items-center gap-2 text-xs text-gray-500">
                                    <span className="font-medium uppercase tracking-wide text-gray-400">{message.role}</span>
                                    <span>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  {message.role === 'ai' ? (
                                    <MarkdownContent content={message.content} className="text-sm text-gray-300" />
                                  ) : (
                                    <p className="whitespace-pre-wrap text-sm text-gray-300">{message.content}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Agent Reply Input */}
                    {isTakenOver && selectedDetail.conversation && (
                      <div className="flex-shrink-0 border-t border-gray-700/50 p-3">
                        <div className="flex items-end gap-2">
                          <textarea
                            value={agentMessage}
                            onChange={(e) => setAgentMessage(e.target.value)}
                            onKeyDown={handleAgentKeyDown}
                            placeholder="Reply as support agent..."
                            rows={1}
                            className="flex-1 resize-none rounded-lg border border-gray-600 bg-gray-900/60 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                          />
                          <Button
                            size="icon"
                            onClick={handleSendAgentMessage}
                            disabled={sendingMessage || !agentMessage.trim()}
                            className="h-9 w-9 bg-violet-600 hover:bg-violet-500"
                          >
                            <SendHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions + Recommendations sidebar */}
                  <div className="lg:w-80 lg:flex-shrink-0 overflow-y-auto p-5 space-y-6">
                    {/* AI Recommendations */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
                          <Lightbulb className="h-4 w-4" />
                          AI Recommendations
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-gray-400 hover:text-white"
                          onClick={() => void loadRecommendations(selectedDetail.ticket.id)}
                          disabled={loadingRecs}
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${loadingRecs ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      </div>

                      {loadingRecs ? (
                        <div className="space-y-2">
                          <Skeleton className="h-16 w-full bg-gray-800" />
                          <Skeleton className="h-16 w-full bg-gray-800" />
                        </div>
                      ) : recommendations.length === 0 ? (
                        <p className="text-sm italic text-gray-600">No recommendations yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {recommendations.map((rec, i) => (
                            <div key={i} className={`rounded-lg border p-3 ${URGENCY_STYLES[rec.urgency] || URGENCY_STYLES.low}`}>
                              <div className="mb-1.5 flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 text-xs font-medium text-amber-300">
                                  <Sparkles className="h-3 w-3" />
                                  {rec.action}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${URGENCY_BADGE_STYLES[rec.urgency] || URGENCY_BADGE_STYLES.low}`}>
                                  {rec.urgency}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400">{rec.reasoning}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* AI Reasoning & Actions */}
                    <div>
                      <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-400">
                        <Brain className="h-4 w-4 text-violet-400" />
                        AI Reasoning & Actions
                      </div>

                      {selectedDetail.actions.length === 0 ? (
                        <p className="text-sm italic text-gray-600">No actions logged yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {selectedDetail.actions.map((action) => (
                            <div key={action.id} className="rounded-lg border border-gray-700/30 bg-gray-900/40 p-3">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="text-xs font-medium capitalize text-violet-300">
                                  {action.action_type.replace('_', ' ')}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  action.status === 'executed'
                                    ? 'bg-green-500/20 text-green-400'
                                    : action.status === 'proposed'
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : action.status === 'rejected'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-gray-700 text-gray-300'
                                }`}>
                                  {action.status}
                                </span>
                              </div>
                              {action.ai_reasoning && (
                                <p className="mb-2 text-xs text-gray-400">{action.ai_reasoning}</p>
                              )}
                              <div className="text-xs text-gray-600">
                                {new Date(action.created_at).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
