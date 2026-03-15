import { NextRequest } from 'next/server';
import { getAnthropicClient, getModelId } from '@/lib/ai/client';
import { AI_TOOLS } from '@/lib/ai/tools';
import { executeTool } from '@/lib/ai/tool-executor';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { assembleCustomerContext, findCustomerByEmail } from '@/lib/ai/context-assembler';
import { ticketRepository } from '@/lib/db/repositories/ticket.repository';
import { conversationRepository } from '@/lib/db/repositories/conversation.repository';
import { messageRepository } from '@/lib/db/repositories/message.repository';
import type Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, message, customerEmail } = body;

    if (!message || !customerEmail) {
      return Response.json({ error: 'message and customerEmail are required' }, { status: 400 });
    }

    // Find customer
    const customer = await findCustomerByEmail(customerEmail);
    if (!customer) {
      return Response.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get or create conversation
    let convId = conversationId;
    let ticketId: number | null = null;

    if (!convId) {
      const ticket = await ticketRepository.create({
        customer_id: customer.id,
        subject: message.slice(0, 100),
      });
      ticketId = ticket.id;
      await ticketRepository.updateStatus(ticketId, 'in_progress');

      const conversation = await conversationRepository.create(ticket.id, customer.id);
      convId = conversation.id;
    } else {
      const conv = await conversationRepository.findById(convId);
      if (conv) {
        ticketId = conv.ticket_id;
        const ticket = await ticketRepository.findById(ticketId);
        if (ticket && ticket.status === 'resolved') {
          await ticketRepository.updateStatus(ticketId, 'in_progress');
        }
      }
    }

    // Save customer message
    await messageRepository.create({
      conversation_id: convId,
      role: 'customer',
      content: message,
    });

    // Build message history from DB
    const dbMessages = await messageRepository.findByConversationId(convId);
    const anthropicMessages: Anthropic.MessageParam[] = dbMessages.map(m => ({
      role: m.role === 'customer' ? 'user' as const : 'assistant' as const,
      content: m.content,
    }));

    // Build context
    const customerContext = await assembleCustomerContext(customer);
    const systemPrompt = buildSystemPrompt(customerContext);

    // Create SSE stream with real token-by-token streaming
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          sendEvent('conversation_created', { conversationId: convId, ticketId });

          const client = getAnthropicClient();
          let messages = [...anthropicMessages];
          let fullResponse = '';
          let continueLoop = true;
          const isFirstMessage = dbMessages.length <= 1;

          while (continueLoop) {
            const streamResponse = client.messages.stream({
              model: getModelId(),
              max_tokens: 4096,
              system: systemPrompt,
              tools: AI_TOOLS,
              messages,
            });

            streamResponse.on('text', (textDelta) => {
              fullResponse += textDelta;
              sendEvent('text', { text: textDelta });
            });

            streamResponse.on('contentBlock', (block) => {
              if (block.type === 'tool_use') {
                sendEvent('tool_use', { tool: block.name, input: block.input });
              }
            });

            const finalMessage = await streamResponse.finalMessage();
            continueLoop = false;

            const toolUseBlocks = finalMessage.content.filter(b => b.type === 'tool_use');

            if (toolUseBlocks.length > 0) {
              const toolResultContents: Anthropic.ToolResultBlockParam[] = [];

              for (const block of toolUseBlocks) {
                if (block.type !== 'tool_use') continue;
                const toolName = block.name;
                const toolInput = block.input as Record<string, unknown>;

                const toolResult = await executeTool(toolName, toolInput, ticketId);

                if (toolResult.requiresConfirmation) {
                  sendEvent('action_confirmation', {
                    actionId: toolResult.actionId,
                    actionType: toolName,
                    description: toolResult.actionDescription,
                  });
                }

                sendEvent('tool_result', {
                  tool: toolName,
                  result: toolResult.result,
                  requiresConfirmation: toolResult.requiresConfirmation,
                });

                toolResultContents.push({
                  type: 'tool_result' as const,
                  tool_use_id: block.id,
                  content: JSON.stringify(toolResult.result),
                });
              }

              messages = [
                ...messages,
                {
                  role: 'assistant' as const,
                  content: finalMessage.content.map(b => {
                    if (b.type === 'text') return { type: 'text' as const, text: b.text };
                    if (b.type === 'tool_use') return { type: 'tool_use' as const, id: b.id, name: b.name, input: b.input };
                    return b;
                  }),
                },
                {
                  role: 'user' as const,
                  content: toolResultContents,
                },
              ];

              if (finalMessage.stop_reason === 'tool_use') {
                continueLoop = true;
              }
            }
          }

          // Save AI response
          if (fullResponse) {
            await messageRepository.create({
              conversation_id: convId,
              role: 'ai',
              content: fullResponse,
            });
          }

          // Classify ticket only on first message (not every turn)
          if (ticketId && fullResponse) {
            if (isFirstMessage) {
              classifyTicketAsync(client, convId, ticketId);
            }
          }

          sendEvent('done', { conversationId: convId });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          sendEvent('error', { error: errorMessage });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}

/** Fire-and-forget ticket classification — runs only on first message */
function classifyTicketAsync(client: Anthropic, convId: number, ticketId: number): void {
  (async () => {
    try {
      const allMessages = await messageRepository.findByConversationId(convId);
      const conversationText = allMessages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      const classificationResponse = await client.messages.create({
        model: getModelId(),
        max_tokens: 400,
        system: 'You are a ticket classifier and sentiment analyzer. Given a support conversation, respond ONLY with valid JSON: {"summary": "1-2 sentence summary", "category": "billing|technical|account|feature_request|bug", "priority": "low|medium|high|critical", "sentiment": "positive|neutral|negative", "frustration_score": 0.0-1.0}. The frustration_score ranges from 0.0 (calm, satisfied) to 1.0 (extremely frustrated, angry). Consider tone, urgency, repeated complaints, and emotional language.',
        messages: [{
          role: 'user',
          content: `Classify and analyze sentiment for this support conversation:\n\n${conversationText}`,
        }],
      });

      const classText = classificationResponse.content[0]?.type === 'text'
        ? classificationResponse.content[0].text
        : '';

      const jsonMatch = classText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const classification = JSON.parse(jsonMatch[0]);
        if (classification.summary) {
          await ticketRepository.updateSummary(ticketId, classification.summary);
        }
        if (classification.category) {
          await ticketRepository.updateCategory(ticketId, classification.category);
        }
        if (classification.priority) {
          await ticketRepository.updatePriority(ticketId, classification.priority);
        }
        if (classification.sentiment && classification.frustration_score !== undefined) {
          await ticketRepository.updateSentiment(ticketId, classification.sentiment, classification.frustration_score);
        }
      }
    } catch {
      // Classification is non-critical — don't break anything
    }
  })();
}
