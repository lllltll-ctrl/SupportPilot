# SupportPilot — Product Requirements Document

## Vision
AI-powered operations center for customer support where AI acts as an operational assistant, not just a chatbot.

## Problem
Current support systems work linearly: user explains → agent clarifies → manual action → resolution depends on human time. Chat-bots only answer questions — they explain but don't act.

## Solution
**SupportPilot** — dual-interface AI system:
1. **Customer Chat** — AI agent that understands intent, pulls context, and executes real actions (refunds, password resets, plan changes)
2. **Agent Dashboard** — operations center with AI-prioritized tickets, reasoning chains, and one-click action approval

## Simulated Domain: OrbitStack
Fictional cloud storage SaaS with:
- Subscription tiers: Free, Pro ($9.99/mo), Enterprise ($49.99/mo)
- Billing history (invoices, charges, refunds)
- Common support scenarios: billing disputes, password resets, plan changes, bug reports

## MVP Features (20h Hackathon)

### F1: Customer AI Chat
- Customer identification by email
- Multi-turn conversation with streaming
- AI pulls account context automatically (profile, billing, past tickets)
- AI executes actions via tool_use: refund, password reset, plan change, create bug ticket
- Confirmation step before financial/destructive actions
- Escalation to human when AI can't resolve

### F2: Agent Dashboard
- Ticket queue with AI-assigned priority (critical/high/medium/low) and category
- Real-time view of active AI conversations
- Per-ticket: AI summary, reasoning chain, suggested actions
- One-click action approval/rejection

### F3: Analytics (Pre-seeded + Live)
- KPI cards: total tickets, AI resolution rate, avg resolution time, satisfaction
- Charts: tickets by category, resolution time comparison, autonomy rate

## Demo Scenarios
1. **Autonomous Resolution**: Duplicate charge → AI finds it → proposes refund → executes
2. **Smart Escalation**: Complex issue → AI gathers context → transfers to agent with full summary
3. **Dashboard Overview**: Agent views prioritized queue, analytics, reasoning chains

## Success Criteria
- [ ] Customer chat works end-to-end with tool execution
- [ ] At least 3 different AI actions work (refund, password reset, plan change)
- [ ] Destructive actions require confirmation
- [ ] Agent dashboard shows tickets with AI reasoning
- [ ] Analytics display meaningful KPIs
- [ ] Demo runs smoothly without errors
