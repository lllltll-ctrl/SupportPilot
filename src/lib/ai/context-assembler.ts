import { customerRepository } from '../db/repositories/customer.repository';
import { billingRepository } from '../db/repositories/billing.repository';
import { ticketRepository } from '../db/repositories/ticket.repository';
import type { Customer } from '../db/repositories/customer.repository';

export async function assembleCustomerContext(customer: Customer): Promise<string> {
  const billing = await billingRepository.findByCustomerId(customer.id, 10);
  const tickets = await ticketRepository.findByCustomerId(customer.id, 5);

  const billingLines = billing.map(b =>
    `  - ${b.created_at.split('T')[0]}: ${b.type === 'refund' ? 'REFUND' : 'CHARGE'} $${b.amount.toFixed(2)} — ${b.description}`
  ).join('\n');

  const ticketLines = tickets.map(t =>
    `  - [${t.status.toUpperCase()}] ${t.subject} (${t.priority} priority, ${t.created_at.split('T')[0]})`
  ).join('\n');

  return `**Customer Profile:**
- Customer ID: ${customer.id}
- Name: ${customer.name}
- Email: ${customer.email}
- Plan: ${customer.plan_tier.charAt(0).toUpperCase() + customer.plan_tier.slice(1)}
- Account Status: ${customer.account_status}
- Member Since: ${customer.created_at.split('T')[0]}

**Recent Billing (last 10):**
${billingLines || '  No billing records found.'}

**Recent Support Tickets (last 5):**
${ticketLines || '  No previous tickets.'}`;
}

export async function findCustomerByEmail(email: string) {
  return customerRepository.findByEmail(email);
}
