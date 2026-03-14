'use client';

import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-headings:text-sm prose-h2:text-base prose-hr:my-2 prose-strong:text-gray-200 prose-a:text-violet-400 ${className}`}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
