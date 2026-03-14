# SupportPilot — AI Customer Support Automation

AI-powered customer support operations center where AI acts as an operational assistant — not just a chatbot. It understands intent, executes real actions, and helps support teams make better decisions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, Recharts |
| Backend | Next.js API Routes, better-sqlite3 (SQLite) |
| AI | Claude (Anthropic API) with tool_use, token-by-token streaming |
| State | Zustand (immutable patterns) |
| Testing | Vitest (unit/integration), Playwright (E2E) |

## Features

### Customer Chat (`/chat`)
- AI-powered chat with automatic customer identification
- **Token-by-token streaming** — real-time response delivery via `messages.stream()`
- Real-time tool execution for billing, account, and support actions
- Action confirmations for sensitive operations (refunds, password resets, plan changes)
- **CSAT rating** — star-based satisfaction survey after action completion
- AI-powered ticket classification on first message (category, priority, summary)

### Agent Dashboard (`/dashboard`)
- **Overview** — live KPIs with **dynamic week-over-week trends** (calculated from real data, not hardcoded)
- **Tickets** — queue with AI-assigned priority, filtering, status management
- **Live** — monitor active AI conversations in real-time with AI reasoning chain and take-over capability
- **Sentiment Analysis** — real-time customer sentiment badges (Positive/Neutral/Negative/Frustrated) with frustration scoring
- **AI Recommendations** — per-conversation action suggestions for agents ("Offer discount", "Escalate immediately") with urgency levels
- **Auto Follow-Up** — automatic follow-up scheduling when tickets are resolved
- **Analytics** — resolution rates, response times, category breakdown, trend charts

### AI Capabilities (8 Tools)
| Tool | Action | Confirmation |
|------|--------|:------------:|
| `lookup_customer` | Find customer by email or ID | No |
| `get_billing_history` | Retrieve charges and refunds | No |
| `get_past_tickets` | Review previous support interactions | No |
| `issue_refund` | Issue refunds | **Yes** |
| `reset_password` | Send password reset flow | **Yes** |
| `change_plan` | Upgrade or downgrade subscription | **Yes** |
| `create_bug_ticket` | Create an internal engineering bug report | No |
| `escalate_to_human` | Hand off complex cases to a human agent | No |

## Quick Start

### Prerequisites
- Node.js 18+
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### 1. Install dependencies

```bash
cd support-pilot
npm install
```

### 2. Configure API key

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your key:

```
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_PATH=./data/support.db
```

### 3. Start development server

```bash
npm run dev
```

The database is auto-seeded on first request — no manual seed step required.

### 4. Open in browser

| Page | URL |
|------|-----|
| Home | http://localhost:3000 |
| Customer Chat | http://localhost:3000/chat |
| Agent Dashboard | http://localhost:3000/dashboard |
| Analytics | http://localhost:3000/dashboard/analytics |
| Live Conversations | http://localhost:3000/dashboard/live |
| Ticket Queue | http://localhost:3000/dashboard/tickets |

## Demo Scenarios (3 prepared flows)

Each scenario shows a different AI capability. Select the demo account in the chat to start.

### 1. Autonomous Refund — Sarah Johnson (`sarah.johnson@email.com`)
**Prompt:** "I think I was charged twice this month"
- AI calls `lookup_customer` → `get_billing_history` → finds duplicate $9.99 charge
- Proposes `issue_refund` → user confirms → refund executed
- CSAT rating appears → user rates the experience
- **Shows:** Full autonomous resolution cycle with confirmation gate

### 2. Plan Upgrade — Emma Wilson (`emma.wilson@email.com`)
**Prompt:** "My trial is ending soon, what are my options?"
- AI calls `lookup_customer` → sees free trial status
- Explains plan tiers → proposes `change_plan` to Pro → user confirms
- **Shows:** AI as a sales-assist tool that converts trial users

### 3. Bug + Escalation — James Rodriguez (`james.rodriguez@email.com`)
**Prompt:** "Files over 100MB keep failing to upload"
- AI calls `lookup_customer` → `get_past_tickets` → sees related history
- Creates `bug_ticket` → then `escalate_to_human` with context summary
- **Shows:** AI filing internal tickets and smart handoff to human agents

After the AI resolves an action and the user confirms it, a **CSAT rating widget** appears to collect feedback.

## Project Structure

```
src/
├── app/
│   ├── api/             # API routes (chat, tickets, analytics, customers, actions)
│   ├── chat/            # Customer chat page
│   └── dashboard/       # Agent dashboard (overview, tickets, live, analytics)
├── components/
│   ├── chat/            # Chat UI (messages, input, tool indicator, action confirm, CSAT)
│   ├── dashboard/       # Dashboard (sidebar, stats cards, priority badges, skeletons)
│   └── ui/              # shadcn/ui primitives
├── lib/
│   ├── ai/              # AI engine (tools, prompts, executor, client, context assembler)
│   │   └── __tests__/   # Unit tests for AI tools and executor
│   └── db/              # SQLite schema, connection, repositories, seed data
│       └── __tests__/   # Repository integration tests
└── stores/              # Zustand state management (chat, dashboard)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run test` | Run unit & integration tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run e2e` | Run E2E tests (Playwright) |
| `npm run e2e:ui` | Run E2E tests with UI |
| `npm run db:seed` | Seed database with demo data |
| `npm run lint` | Lint code |

## Testing

48 tests across 4 test suites:

- **AI tool definitions** — schema validation, confirmation flags
- **System prompt** — context injection, persona consistency
- **Tool executor** — business logic: refunds, plan changes, escalation, confirmation flow
- **Repositories** — CRUD operations, analytics queries, trend calculations

Run all tests:

```bash
npm run test
```
