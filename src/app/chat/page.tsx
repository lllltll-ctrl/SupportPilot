'use client';

import { useChatStore } from '@/stores/chat.store';
import { ChatContainer } from '@/components/chat/chat-container';
import { CustomerIdentify } from '@/components/chat/customer-identify';

export default function ChatPage() {
  const isIdentified = useChatStore((s) => s.isIdentified);

  if (!isIdentified) {
    return <CustomerIdentify />;
  }

  return (
    <div className="min-h-screen bg-background">
      <ChatContainer />
    </div>
  );
}
