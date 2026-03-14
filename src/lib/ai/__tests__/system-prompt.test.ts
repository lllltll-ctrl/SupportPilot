import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../system-prompt';

describe('System Prompt Builder', () => {
  it('should return a non-empty system prompt', () => {
    const prompt = buildSystemPrompt();
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('should include the AI persona name', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('Aria');
  });

  it('should include OrbitStack context', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('OrbitStack');
  });

  it('should include behavioral rules', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('customer\'s context');
    expect(prompt).toContain('Confirm before destructive actions');
    expect(prompt).toContain('Escalate proactively');
  });

  it('should include plan information', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('Free');
    expect(prompt).toContain('Pro');
    expect(prompt).toContain('Enterprise');
    expect(prompt).toContain('$9.99');
    expect(prompt).toContain('$49.99');
  });

  it('should append customer context when provided', () => {
    const context = '**Customer Profile:**\n- Name: Test User\n- Email: test@example.com';
    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('Current Customer Context');
    expect(prompt).toContain('Test User');
    expect(prompt).toContain('test@example.com');
  });

  it('should NOT include customer context section when not provided', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).not.toContain('Current Customer Context');
  });

  it('should include capability descriptions', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('refund');
    expect(prompt).toContain('password');
    expect(prompt).toContain('subscription');
    expect(prompt).toContain('bug');
    expect(prompt).toContain('escalat');
  });
});
