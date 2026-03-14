'use client';

import { create } from 'zustand';

export interface DashboardTicket {
    readonly id: number;
    readonly customer_id: number;
    readonly subject: string;
    readonly status: string;
    readonly priority: string;
    readonly category: string | null;
    readonly ai_summary: string | null;
    readonly customer_name: string;
    readonly customer_email: string;
    readonly customer_plan: string;
    readonly created_at: string;
    readonly resolved_at: string | null;
}

export interface ActiveConversation {
    readonly id: number;
    readonly ticket_id: number;
    readonly customer_name: string;
    readonly customer_email: string;
    readonly ticket_subject: string;
    readonly ticket_status: string;
    readonly ticket_priority: string;
    readonly message_count: number;
    readonly last_message: string | null;
    readonly started_at: string;
}

export interface TicketFilters {
    status?: string;
    priority?: string;
    category?: string;
}

interface DashboardState {
    tickets: readonly DashboardTicket[];
    activeConversations: readonly ActiveConversation[];
    selectedTicketId: number | null;
    filters: TicketFilters;
    loading: boolean;

    setTickets: (tickets: DashboardTicket[]) => void;
    setActiveConversations: (conversations: ActiveConversation[]) => void;
    setSelectedTicketId: (id: number | null) => void;
    setFilters: (filters: TicketFilters) => void;
    setLoading: (loading: boolean) => void;

    fetchTickets: () => Promise<void>;
    fetchActiveConversations: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
    tickets: [],
    activeConversations: [],
    selectedTicketId: null,
    filters: {},
    loading: false,

    setTickets: (tickets) => set({ tickets }),
    setActiveConversations: (conversations) => set({ activeConversations: conversations }),
    setSelectedTicketId: (id) => set({ selectedTicketId: id }),
    setFilters: (filters) => set({ filters }),
    setLoading: (loading) => set({ loading }),

    fetchTickets: async () => {
        set({ loading: true });
        try {
            const { filters } = get();
            const params = new URLSearchParams();
            if (filters.status) params.set('status', filters.status);
            if (filters.priority) params.set('priority', filters.priority);
            if (filters.category) params.set('category', filters.category);

            const res = await fetch(`/api/tickets?${params.toString()}`);
            const data = await res.json();
            set({ tickets: data.tickets || [] });
        } finally {
            set({ loading: false });
        }
    },

    fetchActiveConversations: async () => {
        try {
            const res = await fetch('/api/conversations/active');
            const data = await res.json();
            set({ activeConversations: data.conversations || [] });
        } catch {
            // Non-critical — dashboard still works
        }
    },
}));
