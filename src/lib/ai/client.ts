import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (client) return client;

  // Support multiple providers:
  // 1. ANTHROPIC_API_KEY — direct Anthropic API
  // 2. OPENROUTER_API_KEY — via OpenRouter (supports Claude, GPT, etc.)
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (openRouterKey) {
    client = new Anthropic({
      apiKey: openRouterKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });
    return client;
  }

  if (anthropicKey) {
    client = new Anthropic({ apiKey: anthropicKey });
    return client;
  }

  throw new Error(
    'API key required. Set either ANTHROPIC_API_KEY or OPENROUTER_API_KEY in .env.local'
  );
}

export function getModelId(): string {
  // OpenRouter uses full model paths, Anthropic uses short names
  if (process.env.OPENROUTER_API_KEY) {
    return process.env.AI_MODEL || 'anthropic/claude-sonnet-4-6';
  }
  return process.env.AI_MODEL || 'claude-sonnet-4-6';
}
