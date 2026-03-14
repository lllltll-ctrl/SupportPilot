import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function openChatWithDemoAccount(page: Page, accountName: string) {
  await page.goto('/chat');
  await page.getByRole('button', { name: new RegExp(accountName) }).click();
  await expect(page.getByText('Welcome to OrbitStack Support')).toBeVisible();
}

test('demo scenario: duplicate charge refund confirmation', async ({ page }) => {
  await page.route('**/api/chat', async (route) => {
    const sseBody = [
      'event: conversation_created',
      'data: {"conversationId":101,"ticketId":501}',
      '',
      'event: tool_use',
      'data: {"tool":"lookup_customer","input":{"email":"sarah.johnson@email.com"}}',
      '',
      'event: tool_result',
      'data: {"tool":"lookup_customer","result":{"customer":{"id":1}},"requiresConfirmation":false}',
      '',
      'event: tool_use',
      'data: {"tool":"get_billing_history","input":{"customer_id":1}}',
      '',
      'event: tool_result',
      'data: {"tool":"get_billing_history","result":{"billing":[{"amount":9.99},{"amount":9.99}],"total":2},"requiresConfirmation":false}',
      '',
      'event: text',
      'data: {"text":"I found a duplicate $9.99 charge on your March billing history. I can issue a refund for that duplicate charge now."}',
      '',
      'event: action_confirmation',
      'data: {"actionId":901,"actionType":"issue_refund","description":"Issue a refund of $9.99 for the duplicate March charge"}',
      '',
      'event: done',
      'data: {"conversationId":101}',
      '',
    ].join('\n');

    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
      body: sseBody,
    });
  });

  await page.route('**/api/chat/confirm', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Refund of $9.99 processed successfully.' }),
    });
  });

  await openChatWithDemoAccount(page, 'Sarah Johnson');

  await page.getByPlaceholder('Type your message...').fill('I think I was charged twice this month.');
  await page.getByPlaceholder('Type your message...').press('Enter');

  await expect(page.getByText('I found a duplicate $9.99 charge on your March billing history.')).toBeVisible();
  await expect(page.getByText('Action requires your confirmation')).toBeVisible();

  await page.getByRole('button', { name: 'Confirm' }).click();

  await expect(page.getByText('Refund of $9.99 processed successfully.')).toBeVisible();
});

test('demo scenario: smart escalation to human support', async ({ page }) => {
  await page.route('**/api/chat', async (route) => {
    const sseBody = [
      'event: conversation_created',
      'data: {"conversationId":202,"ticketId":601}',
      '',
      'event: tool_use',
      'data: {"tool":"lookup_customer","input":{"email":"mike.chen@email.com"}}',
      '',
      'event: tool_result',
      'data: {"tool":"lookup_customer","result":{"customer":{"id":2}},"requiresConfirmation":false}',
      '',
      'event: tool_use',
      'data: {"tool":"escalate_to_human","input":{"customer_id":2,"reason":"complex compliance investigation","context_summary":"Enterprise customer needs a human review for a compliance export request."}}',
      '',
      'event: tool_result',
      'data: {"tool":"escalate_to_human","result":{"message":"This conversation has been escalated to a human support agent. They will have full context of our conversation and will be with you shortly."},"requiresConfirmation":false}',
      '',
      'event: text',
      'data: {"text":"I have gathered the context and escalated this case to a human support specialist so they can continue with full background."}',
      '',
      'event: done',
      'data: {"conversationId":202}',
      '',
    ].join('\n');

    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
      body: sseBody,
    });
  });

  await openChatWithDemoAccount(page, 'Mike Chen');

  await page.getByPlaceholder('Type your message...').fill('I need help with a compliance export and want a human involved.');
  await page.getByPlaceholder('Type your message...').press('Enter');

  await expect(page.getByText('I have gathered the context and escalated this case to a human support specialist')).toBeVisible();
});
