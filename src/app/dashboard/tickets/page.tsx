'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { PriorityBadge, StatusBadge } from '@/components/dashboard/priority-badge';
import { MarkdownContent } from '@/components/dashboard/markdown-content';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Clock, Brain, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

interface TicketData {
  id: number;
  customer_id: number;
  subject: string;
  status: string;
  priority: string;
  category: string | null;
  ai_summary: string | null;
  customer_name: string;
  customer_email: string;
  customer_plan: string;
  created_at: string;
  resolved_at: string | null;
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
  parameters: string;
  status: string;
  ai_reasoning: string | null;
  created_at: string;
}

interface TicketDetail {
  ticket: TicketData;
  messages: MessageData[];
  actions: ActionData[];
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const detailRef = useRef<HTMLDivElement>(null);

  const hasSelectedTicket = selectedTicket !== null;

  useEffect(() => {
    const params = filter !== 'all' ? `?status=${filter}` : '';
    fetch(`/api/tickets${params}`).then(r => r.json()).then(d => setTickets(d.tickets || []));
  }, [filter]);

  const loadTicketDetail = useCallback(async (id: number) => {
    const res = await fetch(`/api/tickets/${id}`);
    const data = await res.json();
    setSelectedTicket(data);
    setTimeout(() => {
      if (detailRef.current) {
        detailRef.current.scrollTop = 0;
      }
    }, 0);
  }, []);

  const handleActionDecision = async (actionId: number, decision: 'approved' | 'rejected') => {
    await fetch('/api/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId, decision }),
    });
    if (selectedTicket) {
      loadTicketDetail(selectedTicket.ticket.id);
    }
  };

  return (
    <div className="flex h-full">
      {/* Ticket List */}
      <div className={`flex h-full flex-col border-gray-700/50 lg:w-96 lg:flex-shrink-0 lg:border-r ${hasSelectedTicket ? 'hidden lg:flex' : 'flex w-full'}`}>
        <div className="flex-shrink-0">
          <div className="flex items-center h-16 px-4 border-b border-white/[0.06]">
            <h2 className="font-semibold text-lg">Tickets</h2>
          </div>
          <div className="flex gap-1.5 flex-wrap px-4 py-3 border-b border-gray-700/50">
            {['all', 'open', 'in_progress', 'escalated', 'resolved'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  filter === s
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-gray-700/30">
            {tickets.map(ticket => (
              <button
                key={ticket.id}
                onClick={() => loadTicketDetail(ticket.id)}
                className={`w-full text-left p-4 hover:bg-gray-800/50 transition-colors ${
                  selectedTicket?.ticket.id === ticket.id ? 'bg-gray-800/70' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium truncate flex-1">{ticket.subject}</p>
                  <PriorityBadge priority={ticket.priority} />
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-gray-500">{ticket.customer_name}</span>
                  <StatusBadge status={ticket.status} />
                </div>
                {ticket.ai_summary && (
                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{ticket.ai_summary}</p>
                )}
                <p className="text-xs text-gray-600 mt-1">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ticket Detail */}
      <div ref={detailRef} className={`flex-1 h-full overflow-y-auto ${hasSelectedTicket ? 'block' : 'hidden lg:block'}`}>
        {selectedTicket ? (
          <>
            {/* Detail Header */}
            <div className="sticky top-0 z-10 bg-gray-950 p-5 border-b border-gray-700/50">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-3 flex items-center gap-2 lg:hidden">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-700 bg-gray-900/60 text-gray-200"
                      onClick={() => setSelectedTicket(null)}
                    >
                      <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                      Back to tickets
                    </Button>
                  </div>
                  <h2 className="text-lg font-semibold">{selectedTicket.ticket.subject}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="text-sm text-gray-400">{selectedTicket.ticket.customer_name}</span>
                    <span className="text-sm text-gray-600">{selectedTicket.ticket.customer_email}</span>
                    <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                      {selectedTicket.ticket.customer_plan}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={selectedTicket.ticket.priority} />
                  <StatusBadge status={selectedTicket.ticket.status} />
                </div>
              </div>
              {selectedTicket.ticket.ai_summary && (
                <div className="mt-3 bg-violet-500/10 border border-violet-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-xs font-medium text-violet-300">AI Summary</span>
                  </div>
                  <p className="text-sm text-gray-300">{selectedTicket.ticket.ai_summary}</p>
                </div>
              )}
            </div>

            {/* Conversation + Actions side by side on xl */}
            <div className="flex flex-col xl:flex-row">
              {/* Conversation */}
              <div className="flex-1 p-5 border-b border-gray-700/50 xl:border-b-0 xl:border-r xl:border-gray-700/50">
                <div className="flex items-center gap-2 mb-4">
                  <MessageCircle className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-medium text-gray-400">Conversation</h3>
                </div>

                {selectedTicket.messages.length === 0 ? (
                  <p className="text-sm text-gray-600 italic">No messages yet</p>
                ) : (
                  <div className="space-y-3">
                    {selectedTicket.messages.map(msg => (
                      <div key={msg.id} className="flex gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium ${
                          msg.role === 'customer' ? 'bg-blue-500/20 text-blue-400' :
                          msg.role === 'ai' ? 'bg-violet-500/20 text-violet-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {msg.role === 'customer' ? 'C' : msg.role === 'ai' ? 'AI' : 'AG'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium text-gray-300 capitalize">{msg.role}</span>
                            <span className="text-xs text-gray-600">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {msg.role === 'ai' ? (
                            <MarkdownContent content={msg.content} className="text-sm text-gray-300" />
                          ) : (
                            <p className="text-sm text-gray-300 whitespace-pre-wrap">{msg.content}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions & Reasoning */}
              <div className="p-5 xl:w-80 xl:flex-shrink-0">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-4 h-4 text-violet-400" />
                  <h3 className="text-sm font-medium text-gray-400">AI Reasoning & Actions</h3>
                </div>

                {selectedTicket.actions.length === 0 ? (
                  <p className="text-sm text-gray-600 italic">No actions taken yet</p>
                ) : (
                  <div className="space-y-3">
                    {selectedTicket.actions.map(action => (
                      <div key={action.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-violet-300 capitalize">
                            {action.action_type.replace('_', ' ')}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            action.status === 'executed' ? 'bg-green-500/20 text-green-400' :
                            action.status === 'proposed' ? 'bg-yellow-500/20 text-yellow-400' :
                            action.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-700 text-gray-400'
                          }`}>
                            {action.status}
                          </span>
                        </div>

                        {action.ai_reasoning && (
                          <p className="text-xs text-gray-400 mb-2">{action.ai_reasoning}</p>
                        )}

                        <div className="text-xs text-gray-600">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(action.created_at).toLocaleString()}
                        </div>

                        {action.status === 'proposed' && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-green-600 hover:bg-green-700"
                              onClick={() => handleActionDecision(action.id, 'approved')}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-gray-600"
                              onClick={() => handleActionDecision(action.id, 'rejected')}
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-600">
            <p>Select a ticket to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
