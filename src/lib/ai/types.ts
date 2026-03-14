export interface ChatRequest {
  readonly conversationId: number | null;
  readonly message: string;
  readonly customerEmail: string;
}

export interface ToolCallInfo {
  readonly toolName: string;
  readonly toolInput: Record<string, unknown>;
  readonly result: unknown;
}

export interface StreamEvent {
  readonly type: 'text' | 'tool_use' | 'tool_result' | 'action_confirmation' | 'done' | 'error' | 'conversation_created';
  readonly data: unknown;
}

export interface ActionConfirmation {
  readonly actionId: number;
  readonly actionType: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
}
