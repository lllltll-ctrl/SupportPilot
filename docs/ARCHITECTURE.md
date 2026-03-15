# SupportPilot — Architecture

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui | Fast DX, polished components |
| Backend | Next.js API Routes | Single repo, no separate server |
| AI | Claude API (Anthropic SDK) with tool_use + `messages.stream()` | Best reasoning + native tool execution + real-time streaming |
| Database | Supabase (PostgreSQL) | Managed cloud DB, Vercel-compatible |
| Real-time | Server-Sent Events (SSE) with token-by-token streaming | Simpler than WebSockets, true streaming UX |
| State | Zustand | Lightweight, immutable-friendly |
| Charts | Recharts | Simple React charts |
| Testing | Vitest (unit/integration) + Playwright (E2E) | Fast, native ESM support |

## System Architecture

```
┌─────────────────────────────────────────────────┐
│                  NEXT.JS APP                     │
│                                                  │
│  ┌──────────────┐    ┌───────────────────────┐  │
│  │ Customer Chat │    │ Agent Dashboard       │  │
│  │ /chat         │    │ /dashboard/*          │  │
│  └──────┬───────┘    └──────────┬────────────┘  │
│         │                       │                │
│  ┌──────▼───────────────────────▼────────────┐  │
│  │           API ROUTES                       │  │
│  │  /api/chat  /api/tickets  /api/analytics   │  │
│  └──────────────────┬────────────────────────┘  │
│                     │                            │
│  ┌──────────────────▼────────────────────────┐  │
│  │           AI ENGINE                        │  │
│  │  ┌─────────────┐  ┌──────────────────┐    │  │
│  │  │ Context      │  │ Tool Executor    │    │  │
│  │  │ Assembler    │  │ (8 tools)        │    │  │
│  │  └─────────────┘  └──────────────────┘    │  │
│  │  ┌─────────────┐  ┌──────────────────┐    │  │
│  │  │ System       │  │ Reasoning        │    │  │
│  │  │ Prompt       │  │ Logger           │    │  │
│  │  └─────────────┘  └──────────────────┘    │  │
│  └──────────────────┬────────────────────────┘  │
│                     │                            │
│  ┌──────────────────▼────────────────────────┐  │
│  │           DATA LAYER                       │  │
│  │  Supabase (PostgreSQL) + Repository Pattern│  │
│  │  Tables: customers, billing, tickets,      │  │
│  │    conversations, messages, actions_log     │  │
│  │  Views: tickets_with_customer,             │  │
│  │    active_conversations                    │  │
│  │  RPC: analytics, trends, satisfaction      │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## AI Tools (Claude tool_use)

| Tool | Action | Confirmation Required |
|------|--------|----------------------|
| lookup_customer | Find customer by email/ID | No |
| get_billing_history | Fetch invoices & charges | No |
| get_past_tickets | Retrieve previous interactions | No |
| issue_refund | Process refund | Yes |
| reset_password | Trigger password reset | Yes |
| change_plan | Upgrade/downgrade subscription | Yes |
| create_bug_ticket | File internal bug report | No |
| escalate_to_human | Transfer to live agent | No |

## Database Schema

```sql
customers (id, name, email, plan_tier, created_at, account_status)
billing_history (id, customer_id, amount, description, type, created_at)
tickets (id, customer_id, subject, status, priority, category, ai_summary,
         assigned_agent_id, satisfaction_rating, sentiment, frustration_score,
         created_at, resolved_at)
conversations (id, ticket_id, customer_id, started_at, ended_at)
messages (id, conversation_id, role, content, tool_call, created_at)
actions_log (id, ticket_id, action_type, parameters, status, ai_reasoning, created_at)
```

## File Structure

```
src/
  app/
    page.tsx                    # Landing page
    layout.tsx                  # Root layout
    globals.css
    chat/page.tsx               # Customer chat
    dashboard/
      layout.tsx                # Dashboard shell
      page.tsx                  # Overview
      tickets/page.tsx          # Ticket queue
      live/page.tsx             # Live conversations
      analytics/page.tsx        # Analytics
    api/
      chat/route.ts             # Chat endpoint (SSE)
      tickets/route.ts          # Tickets CRUD
      tickets/[id]/route.ts     # Single ticket
      conversations/active/route.ts
      actions/route.ts          # Action management
      analytics/route.ts        # Stats
  components/
    chat/                       # Chat UI components
    dashboard/                  # Dashboard components
    ui/                         # shadcn/ui
  lib/
    ai/                         # AI engine
    db/                         # Database + repositories
  stores/                       # Zustand stores
```

## Key Design Decisions
1. **Supabase (PostgreSQL)** — managed cloud DB, Vercel-compatible, views and RPC functions for complex queries
2. **SSE over WebSockets** — simpler, sufficient for streaming
3. **Token-by-token streaming** — `messages.stream()` with `text` events for real-time UX
4. **Repository pattern** — clean data access, easy to swap DB later
5. **Immutable data patterns** — all functions return new objects
6. **Pre-seeded demo data** — realistic scenarios ready for demo
7. **Smart classification** — AI classifies tickets only on first message (not every turn), fire-and-forget
8. **CSAT collection** — star-based rating after action confirmation feeds into real satisfaction scores
9. **Dynamic analytics** — week-over-week trends computed from DB, no hardcoded values
