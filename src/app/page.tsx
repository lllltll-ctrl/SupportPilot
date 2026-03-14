import Link from 'next/link';
import { Bot, LayoutDashboard, MessageCircle, Zap, Shield, BarChart3 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <ThemeToggle />
      {/* Hero */}
      <div className="flex flex-col items-center justify-center min-h-[55vh] px-4 pt-16 text-center">
        <div className="w-20 h-20 rounded-2xl bg-violet-500 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/25">
          <Bot className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
          SupportPilot
        </h1>
        <p className="text-lg text-muted-foreground max-w-lg mb-8">
          AI-powered operations center for customer support. Not just a chatbot — an operational assistant that resolves issues.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-8 py-4 bg-violet-500 text-white rounded-xl hover:bg-violet-600 transition-colors shadow-lg shadow-violet-500/25 font-medium"
          >
            <MessageCircle className="w-5 h-5" />
            I&apos;m a Customer
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors shadow-lg font-medium dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          >
            <LayoutDashboard className="w-5 h-5" />
            I&apos;m a Support Agent
          </Link>
        </div>
      </div>


      {/* Feature Cards */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="group bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border hover:shadow-lg hover:shadow-violet-500/5 hover:border-violet-200 dark:hover:border-violet-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-5 shadow-md shadow-violet-500/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-2">AI Actions</h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              AI doesn&apos;t just answer — it executes refunds, resets passwords, changes plans, and creates bug tickets autonomously.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">Refunds</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">Password Reset</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">Plan Changes</span>
            </div>
          </div>

          <div className="group bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border hover:shadow-lg hover:shadow-blue-500/5 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-5 shadow-md shadow-blue-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Human in the Loop</h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Sensitive actions require customer confirmation before execution. Support agents can take over any conversation in real-time.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">Confirmation Flow</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">Agent Takeover</span>
            </div>
          </div>

          <div className="group bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border hover:shadow-lg hover:shadow-green-500/5 hover:border-green-200 dark:hover:border-green-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-5 shadow-md shadow-green-500/20">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Operations Center</h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Real-time dashboard with AI reasoning chains, automatic ticket prioritization, live monitoring, and analytics.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300">Live Monitor</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300">Analytics</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300">AI Reasoning</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
