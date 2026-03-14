import { describe, it, expect } from 'vitest';
import { AI_TOOLS, CONFIRMATION_REQUIRED_TOOLS } from '../tools';

describe('AI Tools Definition', () => {
  it('should define exactly 8 tools', () => {
    expect(AI_TOOLS).toHaveLength(8);
  });

  it('should have required fields for each tool', () => {
    for (const tool of AI_TOOLS) {
      expect(tool.name).toBeDefined();
      expect(tool.name.length).toBeGreaterThan(0);
      expect(tool.description).toBeDefined();
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.input_schema).toBeDefined();
      expect(tool.input_schema.type).toBe('object');
    }
  });

  it('should include all expected tool names', () => {
    const toolNames = AI_TOOLS.map(t => t.name);
    expect(toolNames).toContain('lookup_customer');
    expect(toolNames).toContain('get_billing_history');
    expect(toolNames).toContain('get_past_tickets');
    expect(toolNames).toContain('issue_refund');
    expect(toolNames).toContain('reset_password');
    expect(toolNames).toContain('change_plan');
    expect(toolNames).toContain('create_bug_ticket');
    expect(toolNames).toContain('escalate_to_human');
  });

  it('should have unique tool names', () => {
    const toolNames = AI_TOOLS.map(t => t.name);
    const uniqueNames = new Set(toolNames);
    expect(uniqueNames.size).toBe(toolNames.length);
  });

  it('should require customer_id for billing and ticket tools', () => {
    const billingTool = AI_TOOLS.find(t => t.name === 'get_billing_history');
    expect(billingTool?.input_schema.required).toContain('customer_id');

    const ticketTool = AI_TOOLS.find(t => t.name === 'get_past_tickets');
    expect(ticketTool?.input_schema.required).toContain('customer_id');
  });

  it('should require amount and reason for refund tool', () => {
    const refundTool = AI_TOOLS.find(t => t.name === 'issue_refund');
    expect(refundTool?.input_schema.required).toContain('customer_id');
    expect(refundTool?.input_schema.required).toContain('amount');
    expect(refundTool?.input_schema.required).toContain('reason');
  });

  it('should define valid plan options for change_plan', () => {
    const planTool = AI_TOOLS.find(t => t.name === 'change_plan');
    const newPlanProp = (planTool?.input_schema.properties as Record<string, { enum?: string[] }>)?.new_plan;
    expect(newPlanProp?.enum).toEqual(['free', 'pro', 'enterprise']);
  });
});

describe('Confirmation Required Tools', () => {
  it('should require confirmation for destructive tools', () => {
    expect(CONFIRMATION_REQUIRED_TOOLS.has('issue_refund')).toBe(true);
    expect(CONFIRMATION_REQUIRED_TOOLS.has('reset_password')).toBe(true);
    expect(CONFIRMATION_REQUIRED_TOOLS.has('change_plan')).toBe(true);
  });

  it('should NOT require confirmation for read-only tools', () => {
    expect(CONFIRMATION_REQUIRED_TOOLS.has('lookup_customer')).toBe(false);
    expect(CONFIRMATION_REQUIRED_TOOLS.has('get_billing_history')).toBe(false);
    expect(CONFIRMATION_REQUIRED_TOOLS.has('get_past_tickets')).toBe(false);
  });

  it('should NOT require confirmation for bug ticket and escalation', () => {
    expect(CONFIRMATION_REQUIRED_TOOLS.has('create_bug_ticket')).toBe(false);
    expect(CONFIRMATION_REQUIRED_TOOLS.has('escalate_to_human')).toBe(false);
  });
});
