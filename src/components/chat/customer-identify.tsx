'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Bot, Mail, ArrowLeft } from 'lucide-react';
import { useChatStore } from '@/stores/chat.store';

const DEMO_EMAILS = [
  { email: 'sarah.johnson@email.com', name: 'Sarah Johnson', plan: 'Pro', issue: 'Duplicate billing charge' },
  { email: 'emma.wilson@email.com', name: 'Emma Wilson', plan: 'Free Trial', issue: 'Trial expiring → upgrade' },
  { email: 'james.rodriguez@email.com', name: 'James Rodriguez', plan: 'Pro', issue: 'Bug report → escalation' },
];

export function CustomerIdentify() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setCustomerEmail, setIdentified } = useChatStore();

  const handleSubmit = async (emailToUse: string) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/customers?email=${encodeURIComponent(emailToUse)}`);
      if (!res.ok) {
        setError('Customer not found. Please check your email.');
        return;
      }

      setCustomerEmail(emailToUse);
      setIdentified(true);
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-blue-50 dark:from-gray-950 dark:to-gray-900 p-4">
      <Link
        href="/"
        className="fixed top-4 left-4 flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors shadow-sm"
        title="Back to home"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-violet-500 flex items-center justify-center mb-4">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">OrbitStack Support</h1>
          <p className="text-muted-foreground text-sm">
            Enter your email to connect with Aria, our AI support assistant
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && email && handleSubmit(email)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => handleSubmit(email)} disabled={!email || loading}>
              {loading ? 'Connecting...' : 'Start Chat'}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-3">Quick demo accounts:</p>
            <div className="space-y-2">
              {DEMO_EMAILS.map((demo) => (
                <button
                  key={demo.email}
                  onClick={() => handleSubmit(demo.email)}
                  disabled={loading}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{demo.name}</p>
                      <p className="text-xs text-muted-foreground">{demo.email}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full">
                        {demo.plan}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">{demo.issue}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
