# SupportPilot — Technical Documentation

## 1. Overview

SupportPilot is an AI-powered customer support operations center built as a Next.js application. It provides two interfaces:
- **Customer Chat** — AI agent with tool execution capabilities
- **Agent Dashboard** — real-time operations center with AI-assisted ticket management

## 2. Technology Stack

### Core
- **Runtime**: Node.js 18+
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5.x (strict mode)
- **UI**: React 19, Tailwind CSS 4, shadcn/ui components
- **Database**: Supabase (PostgreSQL) with views and RPC functions
- **AI**: Anthropic Claude API with tool_use + `messages.stream()` for token-by-token delivery
- **Testing**: Vitest 4 (unit/integration), Playwright (E2E)

### Libraries
| Package | Version | Purpose |
|---------|---------|---------|
| `@anthropic-ai/sdk` | latest | Claude API client |
| `@supabase/supabase-js` | latest | Supabase PostgreSQL client |
| `zustand` | latest | Client state management |
| `recharts` | latest | Analytics charts |
| `zod` | latest | Runtime type validation |
| `lucide-react` | latest | Icon library |

## 3. Project Structure

```
support-pilot/
├── src/
│   ├── app/                        # Next.js App Router pages
│   │   ├── page.tsx                # Landing page (entry point)
│   │   ├── layout.tsx              # Root layout
│   │   ├── globals.css             # Global styles + Tailwind
│   │   ├── chat/
│   │   │   └── page.tsx            # Customer chat interface
│   │   ├── dashboard/
│   │   │   ├── layout.tsx          # Dashboard shell (sidebar + header)
│   │   │   ├── page.tsx            # Dashboard overview
│   │   │   ├── tickets/
│   │   │   │   └── page.tsx        # Ticket queue
│   │   │   ├── live/
│   │   │   │   └── page.tsx        # Live AI conversations
│   │   │   └── analytics/
│   │   │       └── page.tsx        # Analytics & KPIs
│   │   └── api/
│   │       ├── chat/
│   │       │   └── route.ts        # POST: Chat with AI (SSE streaming)
│   │       ├── tickets/
│   │       │   ├── route.ts        # GET: List tickets
│   │       │   └── [id]/
│   │       │       └── route.ts    # GET: Single ticket detail
│   │       ├── conversations/
│   │       │   └── active/
│   │       │       └── route.ts    # GET: Active conversations
│   │       ├── actions/
│   │       │   └── route.ts        # POST: Approve/reject actions
│   │       ├── analytics/
│   │       │   └── route.ts        # GET: Aggregated statistics
│   │       └── customers/
│   │           └── route.ts        # GET: Customer lookup
│   ├── components/
│   │   ├── chat/                   # Customer chat components
│   │   │   ├── chat-container.tsx
│   │   │   ├── message-bubble.tsx
│   │   │   ├── chat-input.tsx
│   │   │   ├── tool-use-indicator.tsx
│   │   │   ├── action-confirmation.tsx
│   │   │   └── satisfaction-rating.tsx
│   │   ├── dashboard/              # Agent dashboard components
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── ticket-card.tsx
│   │   │   ├── ticket-detail.tsx
│   │   │   ├── priority-badge.tsx
│   │   │   ├── live-conversation-card.tsx
│   │   │   ├── conversation-viewer.tsx
│   │   │   ├── action-recommendations.tsx
│   │   │   ├── reasoning-chain.tsx
│   │   │   ├── stats-card.tsx
│   │   │   └── charts/
│   │   │       ├── tickets-by-category.tsx
│   │   │       ├── resolution-time.tsx
│   │   │       └── autonomy-rate.tsx
│   │   └── ui/                     # shadcn/ui base components
│   ├── lib/
│   │   ├── ai/                     # AI engine
│   │   │   ├── client.ts           # Anthropic SDK initialization
│   │   │   ├── tools.ts            # Tool definitions (JSON schemas)
│   │   │   ├── tool-executor.ts    # Maps tool calls → DB operations
│   │   │   ├── system-prompt.ts    # System prompt template
│   │   │   ├── context-assembler.ts # Builds context from customer data
│   │   │   ├── reasoning-logger.ts # Logs AI reasoning to actions_log
│   │   │   └── types.ts            # AI-related TypeScript types
│   │   └── db/
│   │       ├── connection.ts       # Supabase client singleton
│   │       ├── schema.ts           # Schema reference (managed in Supabase)
│   │       ├── seed.ts             # No-op (seed via Supabase SQL Editor)
│   │       └── repositories/
│   │           ├── customer.repository.ts
│   │           ├── ticket.repository.ts
│   │           ├── conversation.repository.ts
│   │           ├── billing.repository.ts
│   │           ├── message.repository.ts
│   │           └── action-log.repository.ts
│   └── stores/
│       ├── chat.store.ts           # Customer chat state
│       └── dashboard.store.ts      # Dashboard state
├── docs/
│   ├── PRD.md                      # Product requirements
│   ├── ARCHITECTURE.md             # System architecture
│   ├── TECHNICAL_DOC.md            # This file
│   └── TASK_LIST.md                # Implementation tasks
├── .env                             # Environment variables (not committed)
├── package.json
├── tsconfig.json
├── next.config.ts
└── tailwind.config.ts
```

## 4. Database Schema

### Entity Relationship

```
customers 1──N billing_history
customers 1──N tickets
tickets   1──1 conversations
conversations 1──N messages
tickets   1──N actions_log
```

### Tables

#### customers
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | Auto-increment |
| name | TEXT NOT NULL | Full name |
| email | TEXT UNIQUE | Email address |
| plan_tier | TEXT | 'free' / 'pro' / 'enterprise' |
| created_at | TIMESTAMPTZ | ISO timestamp |
| account_status | TEXT | 'active' / 'suspended' / 'trial' |

#### billing_history
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| customer_id | INTEGER FK | → customers.id |
| amount | REAL | Dollar amount |
| description | TEXT | Charge description |
| type | TEXT | 'charge' / 'refund' |
| created_at | TEXT | ISO timestamp |

#### tickets
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| customer_id | INTEGER FK | → customers.id |
| subject | TEXT | Ticket subject |
| status | TEXT | 'open' / 'in_progress' / 'resolved' / 'escalated' |
| priority | TEXT | 'low' / 'medium' / 'high' / 'critical' |
| category | TEXT | 'billing' / 'technical' / 'account' / 'feature_request' / 'bug' |
| ai_summary | TEXT | AI-generated summary |
| assigned_agent_id | TEXT | Agent handling ticket (nullable) |
| satisfaction_rating | INTEGER | CSAT rating 1-5 (nullable, collected after action) |
| sentiment | TEXT | 'positive' / 'neutral' / 'negative' (AI-analyzed) |
| frustration_score | DOUBLE PRECISION | 0.0-1.0 frustration level (AI-analyzed) |
| created_at | TIMESTAMPTZ | ISO timestamp |
| resolved_at | TIMESTAMPTZ | ISO timestamp (nullable) |

#### conversations
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| ticket_id | INTEGER FK | → tickets.id |
| customer_id | INTEGER FK | → customers.id |
| started_at | TEXT | ISO timestamp |
| ended_at | TEXT | ISO timestamp (nullable) |

#### messages
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| conversation_id | INTEGER FK | → conversations.id |
| role | TEXT | 'customer' / 'ai' / 'agent' / 'system' |
| content | TEXT | Message text |
| tool_call | TEXT | JSON of tool call details (nullable) |
| created_at | TEXT | ISO timestamp |

#### actions_log
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| ticket_id | INTEGER FK | → tickets.id |
| action_type | TEXT | 'refund' / 'password_reset' / 'plan_change' / 'bug_ticket' / 'escalation' |
| parameters | TEXT | JSON parameters |
| status | TEXT | 'proposed' / 'approved' / 'executed' / 'rejected' |
| ai_reasoning | TEXT | Why AI proposed this action |
| created_at | TEXT | ISO timestamp |

## 5. AI Engine

### System Prompt Strategy
The AI receives a system prompt that defines:
1. **Persona**: OrbitStack support assistant named "Aria"
2. **Behavior rules**: Always identify customer first, pull context before answering, explain reasoning, confirm before destructive actions
3. **Tool usage guidelines**: When and how to use each tool
4. **Escalation criteria**: When to transfer to human agent

### Tool Execution Flow
```
Customer message
    ↓
Claude API call via messages.stream() (with tools + context)
    ↓
Tokens stream to client in real-time via SSE
    ↓
Response contains tool_use?
    ├── YES → Execute tool → Get result → Feed back to Claude → Loop
    └── NO  → Final text delivered, save to DB
    ↓
First message? → Fire-and-forget AI classification (category, priority, summary)
    ↓
Action confirmed? → Show CSAT rating widget → Save to tickets.satisfaction_rating
```

### Tools Detail

#### lookup_customer
- **Input**: `{ email: string }` or `{ customer_id: number }`
- **Output**: Customer profile (name, plan, status, created_at)
- **DB**: `customerRepository.findByEmail()` or `findById()`

#### get_billing_history
- **Input**: `{ customer_id: number, limit?: number }`
- **Output**: Array of billing records
- **DB**: `billingRepository.findByCustomerId()`

#### get_past_tickets
- **Input**: `{ customer_id: number, limit?: number }`
- **Output**: Array of past tickets with status
- **DB**: `ticketRepository.findByCustomerId()`

#### issue_refund
- **Input**: `{ customer_id: number, amount: number, reason: string, original_charge_id: number }`
- **Output**: Confirmation of refund processed
- **DB**: Insert refund into billing_history, log action
- **Requires confirmation**: YES

#### reset_password
- **Input**: `{ customer_id: number }`
- **Output**: Confirmation that reset email was sent
- **DB**: Log action (simulated email send)
- **Requires confirmation**: YES

#### change_plan
- **Input**: `{ customer_id: number, new_plan: 'free' | 'pro' | 'enterprise' }`
- **Output**: Confirmation of plan change
- **DB**: Update customer plan_tier, log action
- **Requires confirmation**: YES

#### create_bug_ticket
- **Input**: `{ customer_id: number, title: string, description: string, severity: string }`
- **Output**: Bug ticket ID
- **DB**: Create internal ticket with category='bug'

#### escalate_to_human
- **Input**: `{ customer_id: number, reason: string, context_summary: string }`
- **Output**: Confirmation of escalation
- **DB**: Update ticket status to 'escalated', log action

## 6. API Endpoints

### POST /api/chat
Chat with AI agent. Uses SSE for streaming.

**Request body:**
```json
{
  "conversationId": "number | null",
  "message": "string",
  "customerEmail": "string"
}
```

**Response:** SSE stream with token-by-token events:
- `event: conversation_created` — Returns `conversationId` and `ticketId`
- `event: text` — Single AI text token (streamed in real-time via `messages.stream()`)
- `event: tool_use` — AI is calling a tool (shows indicator in UI)
- `event: tool_result` — Tool execution result
- `event: action_confirmation` — Requires user confirmation (includes `actionId`)
- `event: done` — Stream complete
- `event: error` — Error occurred

### GET /api/tickets
List tickets with optional filters.

**Query params:** `status`, `priority`, `category`, `limit`, `offset`

**Response:**
```json
{
  "tickets": [...],
  "total": "number"
}
```

### GET /api/tickets/[id]
Get ticket detail with conversation, messages, and actions.

### GET /api/conversations/active
Get all active (non-resolved) conversations with latest messages.

### POST /api/actions
Approve or reject an AI-proposed action.

**Request body:**
```json
{
  "actionId": "number",
  "decision": "approved" | "rejected"
}
```

### PATCH /api/tickets/[id]
Update ticket fields including CSAT rating.

**Request body (all fields optional):**
```json
{
  "status": "open | in_progress | resolved | escalated",
  "priority": "low | medium | high | critical",
  "assigned_agent_id": "string | null",
  "satisfaction_rating": "1-5"
}
```

### GET /api/analytics
Aggregated statistics for dashboard.

**Response:**
```json
{
  "totalTickets": "number",
  "aiResolutionRate": "number",
  "avgResolutionTimeMinutes": "number",
  "customerSatisfaction": "number (uses real CSAT ratings when ≥3 available)",
  "trends": {
    "ticketsTrend": "number (week-over-week %)",
    "resolutionRateTrend": "number",
    "resolutionTimeTrend": "number",
    "satisfactionTrend": "number"
  },
  "byStatus": [...],
  "byCategory": [...],
  "byPriority": [...],
  "recentTrend": [...]
}
```

## 7. State Management

### Chat Store (Zustand)
```typescript
interface ChatState {
  messages: Message[]
  conversationId: number | null
  ticketId: number | null
  customerEmail: string | null
  isStreaming: boolean
  isIdentified: boolean
  pendingAction: PendingAction | null
  currentToolUse: string | null
  showSatisfaction: boolean
  satisfactionSubmitted: boolean
}
```

### Dashboard Store (Zustand)
```typescript
interface DashboardState {
  tickets: Ticket[]
  activeConversations: Conversation[]
  selectedTicketId: number | null
  filters: TicketFilters
}
```

### Database Views

| View | Purpose |
|------|---------|
| `tickets_with_customer` | Tickets joined with customer details + priority ordering |
| `active_conversations` | Active conversations with customer, ticket, and message details |

### RPC Functions

| Function | Purpose |
|----------|---------|
| `get_avg_resolution_time()` | Average ticket resolution time in minutes |
| `get_recent_trend(p_days)` | Tickets created/resolved per day |
| `get_week_over_week_trends()` | Week-over-week trend comparison (JSON) |
| `get_satisfaction_score()` | CSAT score (real ratings or estimated) |

## 8. Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...                          # Required: Claude API key
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co      # Required: Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...                 # Required: Supabase service role key
```

## 9. Running the Application

```bash
# Install dependencies
npm install

# Set up Supabase database
# 1. Create project at supabase.com
# 2. Run supabase-schema.sql in Supabase SQL Editor

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev

# Open http://localhost:3000
```

## 10. Demo Credentials

| Role | Email | Description |
|------|-------|-------------|
| Customer (billing issue) | sarah.johnson@email.com | Has duplicate charge, Pro plan |
| Customer (technical) | mike.chen@email.com | Enterprise plan, frequent user |
| Customer (new user) | emma.wilson@email.com | Free trial expiring |
| Agent | — | No auth needed for MVP, access /dashboard directly |

## 11. Testing

### Test Suites (45 tests, 4 suites)

| Suite | File | Coverage |
|-------|------|----------|
| Tool definitions | `src/lib/ai/__tests__/tools.test.ts` | Schema validation, confirmation flags |
| System prompt | `src/lib/ai/__tests__/system-prompt.test.ts` | Context injection, persona |
| Tool executor | `src/lib/ai/__tests__/tool-executor.test.ts` | **Business logic**: refund, plan change, escalation, confirm/reject flow |
| Repositories | `src/lib/db/__tests__/repositories.test.ts` | CRUD, analytics, trend calculations |

Run: `npm run test`

### E2E Tests (Playwright)

| Spec | Coverage |
|------|----------|
| `tests/e2e/chat-demo-flows.spec.ts` | Customer chat flows |
| `tests/e2e/dashboard-operator.spec.ts` | Dashboard operations |

Run: `npm run e2e`

## 12. CSAT (Customer Satisfaction)

### Flow
1. User sends a message → AI proposes an action (e.g. refund)
2. User confirms the action → action is executed
3. A star-based rating widget (1-5) appears in the chat
4. Rating is saved to `tickets.satisfaction_rating` via `PATCH /api/tickets/[id]`

### Score Calculation (`getSatisfactionScore()`)
- **When ≥3 real ratings exist**: returns the average of `satisfaction_rating` values
- **Fallback**: estimates from resolution rate + speed metrics (base 3.0 + bonuses)

## 13. Analytics Trends

Dashboard KPI cards show real week-over-week trends:
- `getWeekOverWeekTrends()` compares this week vs last week
- Metrics: ticket volume, resolution rate, resolution time, satisfaction
- Positive/negative indicators with percentage change
