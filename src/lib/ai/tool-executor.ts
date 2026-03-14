import { customerRepository } from '../db/repositories/customer.repository';
import { billingRepository } from '../db/repositories/billing.repository';
import { ticketRepository } from '../db/repositories/ticket.repository';
import { actionLogRepository } from '../db/repositories/action-log.repository';
import { assembleCustomerContext } from './context-assembler';
import { CONFIRMATION_REQUIRED_TOOLS } from './tools';

interface ToolExecutionResult {
  readonly result: unknown;
  readonly requiresConfirmation: boolean;
  readonly actionId?: number;
  readonly actionDescription?: string;
}

export function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  ticketId: number | null
): ToolExecutionResult {
  switch (toolName) {
    case 'lookup_customer': {
      const email = toolInput.email as string | undefined;
      const customerId = toolInput.customer_id as number | undefined;

      const customer = email
        ? customerRepository.findByEmail(email)
        : customerId
        ? customerRepository.findById(customerId)
        : undefined;

      if (!customer) {
        return { result: { error: 'Customer not found' }, requiresConfirmation: false };
      }

      const context = assembleCustomerContext(customer);
      return { result: { customer, context }, requiresConfirmation: false };
    }

    case 'get_billing_history': {
      const customerId = toolInput.customer_id as number;
      const limit = (toolInput.limit as number) || 20;
      const billing = billingRepository.findByCustomerId(customerId, limit);
      return { result: { billing, total: billing.length }, requiresConfirmation: false };
    }

    case 'get_past_tickets': {
      const customerId = toolInput.customer_id as number;
      const limit = (toolInput.limit as number) || 10;
      const tickets = ticketRepository.findByCustomerId(customerId, limit);
      return { result: { tickets, total: tickets.length }, requiresConfirmation: false };
    }

    case 'issue_refund': {
      const customerId = toolInput.customer_id as number;
      const amount = toolInput.amount as number;
      const reason = toolInput.reason as string;

      if (CONFIRMATION_REQUIRED_TOOLS.has(toolName) && ticketId) {
        const action = actionLogRepository.create({
          ticket_id: ticketId,
          action_type: 'refund',
          parameters: { customer_id: customerId, amount, reason },
          status: 'proposed',
          ai_reasoning: `Proposed refund of $${amount.toFixed(2)} for: ${reason}`,
        });

        return {
          result: { status: 'pending_confirmation', message: `Refund of $${amount.toFixed(2)} requires your confirmation.` },
          requiresConfirmation: true,
          actionId: action.id,
          actionDescription: `Issue a refund of $${amount.toFixed(2)} — Reason: ${reason}`,
        };
      }

      const refund = billingRepository.createRefund(customerId, amount, reason);
      if (ticketId) {
        actionLogRepository.create({
          ticket_id: ticketId,
          action_type: 'refund',
          parameters: { customer_id: customerId, amount, reason },
          status: 'executed',
          ai_reasoning: `Refund of $${amount.toFixed(2)} processed for: ${reason}`,
        });
      }
      return { result: { refund, message: `Refund of $${amount.toFixed(2)} has been processed.` }, requiresConfirmation: false };
    }

    case 'reset_password': {
      const customerId = toolInput.customer_id as number;
      const customer = customerRepository.findById(customerId);

      if (!customer) {
        return { result: { error: 'Customer not found' }, requiresConfirmation: false };
      }

      if (CONFIRMATION_REQUIRED_TOOLS.has(toolName) && ticketId) {
        const action = actionLogRepository.create({
          ticket_id: ticketId,
          action_type: 'password_reset',
          parameters: { customer_id: customerId, email: customer.email },
          status: 'proposed',
          ai_reasoning: `Password reset requested for ${customer.email}`,
        });

        return {
          result: { status: 'pending_confirmation', message: `Password reset email will be sent to ${customer.email}.` },
          requiresConfirmation: true,
          actionId: action.id,
          actionDescription: `Send password reset email to ${customer.email}`,
        };
      }

      if (ticketId) {
        actionLogRepository.create({
          ticket_id: ticketId,
          action_type: 'password_reset',
          parameters: { customer_id: customerId, email: customer.email },
          status: 'executed',
          ai_reasoning: `Password reset email sent to ${customer.email}`,
        });
      }
      return { result: { message: `Password reset email sent to ${customer.email}.` }, requiresConfirmation: false };
    }

    case 'change_plan': {
      const customerId = toolInput.customer_id as number;
      const newPlan = toolInput.new_plan as 'free' | 'pro' | 'enterprise';
      const customer = customerRepository.findById(customerId);

      if (!customer) {
        return { result: { error: 'Customer not found' }, requiresConfirmation: false };
      }

      const planPrices: Record<string, string> = { free: '$0', pro: '$9.99/mo', enterprise: '$49.99/mo' };

      if (CONFIRMATION_REQUIRED_TOOLS.has(toolName) && ticketId) {
        const action = actionLogRepository.create({
          ticket_id: ticketId,
          action_type: 'plan_change',
          parameters: { customer_id: customerId, from: customer.plan_tier, to: newPlan },
          status: 'proposed',
          ai_reasoning: `Plan change from ${customer.plan_tier} to ${newPlan} (${planPrices[customer.plan_tier]} → ${planPrices[newPlan]})`,
        });

        return {
          result: { status: 'pending_confirmation', message: `Plan change from ${customer.plan_tier} to ${newPlan} requires confirmation.` },
          requiresConfirmation: true,
          actionId: action.id,
          actionDescription: `Change plan from ${customer.plan_tier} (${planPrices[customer.plan_tier]}) to ${newPlan} (${planPrices[newPlan]})`,
        };
      }

      customerRepository.updatePlan(customerId, newPlan);
      if (ticketId) {
        actionLogRepository.create({
          ticket_id: ticketId,
          action_type: 'plan_change',
          parameters: { customer_id: customerId, from: customer.plan_tier, to: newPlan },
          status: 'executed',
          ai_reasoning: `Plan changed from ${customer.plan_tier} to ${newPlan}`,
        });
      }
      return { result: { message: `Plan changed from ${customer.plan_tier} to ${newPlan} successfully.` }, requiresConfirmation: false };
    }

    case 'create_bug_ticket': {
      const customerId = toolInput.customer_id as number;
      const title = toolInput.title as string;
      const description = toolInput.description as string;
      const severity = toolInput.severity as string;

      const bugTicket = ticketRepository.create({
        customer_id: customerId,
        subject: `[BUG] ${title}`,
        priority: severity as 'low' | 'medium' | 'high' | 'critical',
        category: 'bug',
      });
      // Bug tickets are immediately in progress (filed for engineering)
      ticketRepository.updateStatus(bugTicket.id, 'in_progress');

      if (ticketId) {
        actionLogRepository.create({
          ticket_id: ticketId,
          action_type: 'bug_ticket',
          parameters: { bug_ticket_id: bugTicket.id, title, description, severity },
          status: 'executed',
          ai_reasoning: `Created bug ticket #${bugTicket.id}: ${title} (${severity} severity)`,
        });
      }

      return { result: { bugTicket, message: `Bug ticket #${bugTicket.id} created: ${title}` }, requiresConfirmation: false };
    }

    case 'escalate_to_human': {
      const reason = toolInput.reason as string;
      const contextSummary = toolInput.context_summary as string;

      if (ticketId) {
        ticketRepository.updateStatus(ticketId, 'escalated');
        actionLogRepository.create({
          ticket_id: ticketId,
          action_type: 'escalation',
          parameters: { reason, context_summary: contextSummary },
          status: 'executed',
          ai_reasoning: `Escalated to human agent: ${reason}`,
        });
      }

      return {
        result: { message: 'This conversation has been escalated to a human support agent. They will have full context of our conversation and will be with you shortly.' },
        requiresConfirmation: false,
      };
    }

    default:
      return { result: { error: `Unknown tool: ${toolName}` }, requiresConfirmation: false };
  }
}

export function executeConfirmedAction(actionId: number): { success: boolean; message: string } {
  const action = actionLogRepository.findById(actionId);
  if (!action) {
    return { success: false, message: 'Action not found' };
  }

  if (action.status !== 'proposed') {
    return { success: false, message: `Action already ${action.status}` };
  }

  let params: Record<string, string | number>;
  try {
    params = JSON.parse(action.parameters);
  } catch {
    return { success: false, message: 'Failed to parse action parameters' };
  }

  switch (action.action_type) {
    case 'refund': {
      const amount = Number(params.amount);
      billingRepository.createRefund(Number(params.customer_id), amount, String(params.reason));
      actionLogRepository.updateStatus(actionId, 'executed');
      return { success: true, message: `Refund of $${amount.toFixed(2)} processed successfully.` };
    }

    case 'password_reset': {
      actionLogRepository.updateStatus(actionId, 'executed');
      return { success: true, message: `Password reset email sent to ${params.email}.` };
    }

    case 'plan_change': {
      customerRepository.updatePlan(Number(params.customer_id), String(params.to) as 'free' | 'pro' | 'enterprise');
      actionLogRepository.updateStatus(actionId, 'executed');
      return { success: true, message: `Plan changed from ${params.from} to ${params.to} successfully.` };
    }

    default:
      return { success: false, message: `Cannot execute action type: ${action.action_type}` };
  }
}

export function rejectAction(actionId: number): { success: boolean; message: string } {
  const action = actionLogRepository.findById(actionId);
  if (!action) {
    return { success: false, message: 'Action not found' };
  }
  actionLogRepository.updateStatus(actionId, 'rejected');
  return { success: true, message: 'Action rejected.' };
}
