'use client';

/**
 * Help Page
 *
 * Renders quickstart guides for students and instructors
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Tab = 'student' | 'instructor';

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<Tab>('student');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDoc(activeTab === 'student' ? 'student-quickstart' : 'instructor-quickstart');
  }, [activeTab]);

  async function fetchDoc(doc: string) {
    setLoading(true);
    try {
      const response = await fetch(`/api/docs?doc=${doc}`);
      if (response.ok) {
        const data = await response.json();
        setContent(data.content);
      } else {
        setContent('# Error\n\nFailed to load documentation.');
      }
    } catch (error) {
      setContent('# Error\n\nFailed to load documentation.');
    } finally {
      setLoading(false);
    }
  }

  // Simple markdown to HTML converter
  function renderMarkdown(md: string): string {
    let html = md
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Headers
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-bold mt-6 mb-3 text-gray-800">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-8 mb-4 text-gray-900 border-b pb-2">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-8 mb-4 text-gray-900">$1</h1>')
      // Bold and italic
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code blocks
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto my-4 text-sm"><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline">$1</a>')
      // Horizontal rules
      .replace(/^---$/gm, '<hr class="my-6 border-gray-300" />')
      // Checkboxes
      .replace(/- \[x\] (.*$)/gm, '<div class="flex items-center gap-2 my-1"><input type="checkbox" checked disabled class="w-4 h-4" /><span>$1</span></div>')
      .replace(/- \[ \] (.*$)/gm, '<div class="flex items-center gap-2 my-1"><input type="checkbox" disabled class="w-4 h-4" /><span>$1</span></div>')
      // Unordered lists
      .replace(/^\* (.*$)/gm, '<li class="ml-6 list-disc">$1</li>')
      .replace(/^- (.*$)/gm, '<li class="ml-6 list-disc">$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-6 list-decimal">$1</li>')
      // Tables
      .replace(/^\|(.+)\|$/gm, (match, content) => {
        const cells = content.split('|').map((cell: string) => cell.trim());
        const cellHtml = cells.map((cell: string) => `<td class="border border-gray-300 px-4 py-2">${cell}</td>`).join('');
        return `<tr>${cellHtml}</tr>`;
      })
      // Blockquotes
      .replace(/^&gt; (.*$)/gm, '<blockquote class="border-l-4 border-blue-500 pl-4 my-4 italic text-gray-700">$1</blockquote>')
      // Paragraphs (must be last)
      .replace(/^(?!<[h|p|l|d|u|o|t|b|c|a|hr|pre])(.*[^\n])$/gm, '<p class="my-3 text-gray-700 leading-relaxed">$1</p>');

    // Wrap consecutive list items in ul/ol
    html = html
      .replace(/(<li class="ml-6 list-disc">[\s\S]*?<\/li>)(?=\n*<li class="ml-6 list-disc">|$)/g, '<ul class="my-3">$1</ul>')
      .replace(/(<li class="ml-6 list-decimal">[\s\S]*?<\/li>)(?=\n*<li class="ml-6 list-decimal">|$)/g, '<ol class="my-3">$1</ol>')
      // Clean up nested ul/ol
      .replace(/<\/ul>\n*<ul class="my-3">/g, '')
      .replace(/<\/ol>\n*<ol class="my-3">/g, '');

    // Wrap table rows in table
    html = html.replace(/(<tr>[\s\S]*?<\/tr>)+/g, '<table class="w-full border-collapse my-4">$&</table>');

    return html;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Help & Documentation</h1>
              <p className="text-sm text-gray-600">Get started with the Student Success Concierge</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors text-sm"
              >
                Home
              </Link>
              <Link
                href="/chat"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm"
              >
                Start Chatting
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Links */}
      <div className="bg-blue-600 text-white py-4">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="font-medium">Quick Links:</span>
            <Link href="/chat" className="hover:underline">Chat</Link>
            <Link href="/cases" className="hover:underline">Test Cases</Link>
            <Link href="/admin/traces" className="hover:underline">Traces</Link>
            <Link href="/admin/evals" className="hover:underline">Evals</Link>
            <Link href="/admin/labels" className="hover:underline">Labels</Link>
            <Link href="/admin/dashboard" className="hover:underline">Dashboard</Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('student')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'student'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            Student Guide
          </button>
          <button
            onClick={() => setActiveTab('instructor')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'instructor'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            Instructor Guide
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg p-8 border">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading documentation...</span>
            </div>
          ) : (
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          )}
        </div>

        {/* Footer Help */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Need More Help?</h3>
          <ul className="space-y-2 text-yellow-700">
            <li>
              <strong>Full Documentation:</strong> See <code className="bg-yellow-100 px-1 rounded">README.md</code> in the project root
            </li>
            <li>
              <strong>Project Details:</strong> See <code className="bg-yellow-100 px-1 rounded">PROJECT_MASTER.md</code> for complete reference
            </li>
            <li>
              <strong>Step Reports:</strong> Check <code className="bg-yellow-100 px-1 rounded">STEP*_COMPLETE.md</code> files for implementation details
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
