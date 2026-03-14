import type Anthropic from '@anthropic-ai/sdk';

export const AI_TOOLS: Anthropic.Tool[] = [
  {
    name: 'lookup_customer',
    description: 'Look up a customer by their email address or customer ID. Use this first to identify the customer before helping them.',
    input_schema: {
      type: 'object' as const,
      properties: {
        email: { type: 'string', description: 'Customer email address' },
        customer_id: { type: 'number', description: 'Customer ID' },
      },
      required: [],
    },
  },
  {
    name: 'get_billing_history',
    description: 'Get the billing history for a customer including charges and refunds. Use this when a customer has billing questions or disputes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_id: { type: 'number', description: 'Customer ID' },
        limit: { type: 'number', description: 'Max number of records to return (default 20)' },
      },
      required: ['customer_id'],
    },
  },
  {
    name: 'get_past_tickets',
    description: 'Get previous support tickets for a customer. Use this to understand their history and recurring issues.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_id: { type: 'number', description: 'Customer ID' },
        limit: { type: 'number', description: 'Max number of tickets to return (default 10)' },
      },
      required: ['customer_id'],
    },
  },
  {
    name: 'issue_refund',
    description: 'Issue a refund to a customer. Only use when there is a clear reason for a refund (duplicate charge, service issue, etc). This action requires customer confirmation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_id: { type: 'number', description: 'Customer ID' },
        amount: { type: 'number', description: 'Refund amount in dollars' },
        reason: { type: 'string', description: 'Reason for the refund' },
        original_charge_id: { type: 'number', description: 'ID of the original charge being refunded' },
      },
      required: ['customer_id', 'amount', 'reason'],
    },
  },
  {
    name: 'reset_password',
    description: 'Trigger a password reset email for a customer. Use when a customer cannot access their account.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_id: { type: 'number', description: 'Customer ID' },
      },
      required: ['customer_id'],
    },
  },
  {
    name: 'change_plan',
    description: 'Change a customer subscription plan (upgrade or downgrade). This action requires customer confirmation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_id: { type: 'number', description: 'Customer ID' },
        new_plan: {
          type: 'string',
          enum: ['free', 'pro', 'enterprise'],
          description: 'The new plan tier',
        },
      },
      required: ['customer_id', 'new_plan'],
    },
  },
  {
    name: 'create_bug_ticket',
    description: 'Create an internal bug report ticket when a customer reports a software issue.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_id: { type: 'number', description: 'Customer ID' },
        title: { type: 'string', description: 'Bug title' },
        description: { type: 'string', description: 'Detailed bug description' },
        severity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Bug severity',
        },
      },
      required: ['customer_id', 'title', 'description', 'severity'],
    },
  },
  {
    name: 'escalate_to_human',
    description: 'Escalate the conversation to a human support agent. Use when you cannot resolve the issue, the customer explicitly asks for a human, or the issue requires manual intervention.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_id: { type: 'number', description: 'Customer ID' },
        reason: { type: 'string', description: 'Why this needs human attention' },
        context_summary: { type: 'string', description: 'Summary of the conversation and issue for the agent' },
      },
      required: ['customer_id', 'reason', 'context_summary'],
    },
  },
];

export const CONFIRMATION_REQUIRED_TOOLS = new Set([
  'issue_refund',
  'reset_password',
  'change_plan',
]);
