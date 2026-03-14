'use client';

import { create } from 'zustand';

export interface ChatMessage {
  readonly id: string;
  readonly role: 'customer' | 'ai' | 'system';
  readonly content: string;
  readonly timestamp: string;
  readonly toolCall?: {
    readonly tool: string;
    readonly input: Record<string, unknown>;
  };
}

export interface PendingAction {
  readonly actionId: number;
  readonly actionType: string;
  readonly description: string;
}

interface ChatState {
  messages: readonly ChatMessage[];
  conversationId: number | null;
  ticketId: number | null;
  customerEmail: string | null;
  isStreaming: boolean;
  isIdentified: boolean;
  pendingAction: PendingAction | null;
  currentToolUse: string | null;
  showSatisfaction: boolean;
  satisfactionSubmitted: boolean;

  setCustomerEmail: (email: string) => void;
  setIdentified: (identified: boolean) => void;
  addMessage: (message: ChatMessage) => void;
  updateLastAiMessage: (content: string) => void;
  setConversationId: (id: number) => void;
  setTicketId: (id: number) => void;
  setStreaming: (streaming: boolean) => void;
  setPendingAction: (action: PendingAction | null) => void;
  setCurrentToolUse: (tool: string | null) => void;
  setShowSatisfaction: (show: boolean) => void;
  setSatisfactionSubmitted: (submitted: boolean) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  conversationId: null,
  ticketId: null,
  customerEmail: null,
  isStreaming: false,
  isIdentified: false,
  pendingAction: null,
  currentToolUse: null,
  showSatisfaction: false,
  satisfactionSubmitted: false,

  setCustomerEmail: (email) => set({ customerEmail: email }),
  setIdentified: (identified) => set({ isIdentified: identified }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateLastAiMessage: (content) =>
    set((state) => {
      const msgs = [...state.messages];
      const lastAi = msgs.findLastIndex((m) => m.role === 'ai');
      if (lastAi >= 0) {
        msgs[lastAi] = { ...msgs[lastAi], content: msgs[lastAi].content + content };
      }
      return { messages: msgs };
    }),

  setConversationId: (id) => set({ conversationId: id }),
  setTicketId: (id) => set({ ticketId: id }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setPendingAction: (action) => set({ pendingAction: action }),
  setCurrentToolUse: (tool) => set({ currentToolUse: tool }),
  setShowSatisfaction: (show) => set({ showSatisfaction: show }),
  setSatisfactionSubmitted: (submitted) => set({ satisfactionSubmitted: submitted }),

  reset: () =>
    set({
      messages: [],
      conversationId: null,
      ticketId: null,
      customerEmail: null,
      isStreaming: false,
      isIdentified: false,
      pendingAction: null,
      currentToolUse: null,
      showSatisfaction: false,
      satisfactionSubmitted: false,
    }),
}));
