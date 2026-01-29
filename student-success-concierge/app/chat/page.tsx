'use client';

/**
 * Student Chat Interface
 *
 * Interactive chat UI for students to communicate with the AI concierge
 * Supports case selection, channel switching, and trace investigation
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TestCase {
  id: number;
  name: string;
  description: string;
  category: string;
  frozen: number;
}

export default function ChatPage() {
  const [studentHandle, setStudentHandle] = useState('');
  const [caseId, setCaseId] = useState<number | null>(null);
  const [channel, setChannel] = useState<'sms' | 'webchat'>('webchat');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [traceId, setTraceId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);

  useEffect(() => {
    fetchTestCases();
  }, []);

  async function fetchTestCases() {
    try {
      const response = await fetch('/api/cases');
      if (response.ok) {
        const data = await response.json();
        setTestCases(data);
      }
    } catch (err) {
      console.error('Failed to fetch test cases:', err);
    }
  }

  function handleCaseChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = parseInt(e.target.value);
    setCaseId(id || null);

    if (id) {
      const testCase = testCases.find((tc) => tc.id === id);
      setSelectedCase(testCase || null);
    } else {
      setSelectedCase(null);
    }
  }

  function handleStartSession() {
    if (!studentHandle.trim()) {
      setError('Please enter your student handle');
      return;
    }

    // Check if case is frozen
    if (selectedCase && selectedCase.frozen === 1) {
      setError('This case is frozen for investigation. Please view the existing traces instead.');
      return;
    }

    setSessionStarted(true);
    setError(null);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();

    if (!message.trim()) return;
    if (!studentHandle.trim()) {
      setError('Please enter your student handle');
      return;
    }

    setSending(true);
    setError(null);

    // Add user message to UI
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const currentMessage = message;
    setMessage('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentHandle,
          caseId,
          cohortId: null,
          channel,
          message: currentMessage,
          traceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.frozen) {
          setError('This case is frozen. Please view the existing trace dataset.');
          return;
        }
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();

      // Add assistant message to UI
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.assistantMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Store trace ID
      if (data.traceId && !traceId) {
        setTraceId(data.traceId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      console.error('Chat error:', err);
    } finally {
      setSending(false);
    }
  }

  function handleResetSession() {
    setMessages([]);
    setTraceId(null);
    setSessionStarted(false);
    setError(null);
  }

  // Session setup screen
  if (!sessionStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Student Success Concierge</h1>

          <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-blue-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Start a Chat Session</h2>

            <div className="space-y-6">
              {/* Student Handle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Handle
                </label>
                <input
                  type="text"
                  value={studentHandle}
                  onChange={(e) => setStudentHandle(e.target.value)}
                  placeholder="e.g., alex_chen"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your unique identifier for the session
                </p>
              </div>

              {/* Test Case Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Case (Optional)
                </label>
                <select
                  value={caseId || ''}
                  onChange={handleCaseChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No specific case</option>
                  {testCases.map((tc) => (
                    <option key={tc.id} value={tc.id}>
                      {tc.name} {tc.frozen === 1 ? '(Frozen)' : ''}
                    </option>
                  ))}
                </select>
                {selectedCase && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">{selectedCase.description}</p>
                    {selectedCase.frozen === 1 && (
                      <p className="text-sm text-orange-600 mt-1">
                        ⚠️ This case is frozen for investigation. Chat is disabled.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Channel Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Channel
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="webchat"
                      checked={channel === 'webchat'}
                      onChange={(e) => setChannel(e.target.value as 'webchat')}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Webchat (Markdown allowed)
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="sms"
                      checked={channel === 'sms'}
                      onChange={(e) => setChannel(e.target.value as 'sms')}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      SMS (Plain text only)
                    </span>
                  </label>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <button
                onClick={handleStartSession}
                disabled={!studentHandle.trim() || (selectedCase?.frozen === 1)}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                Start Chat
              </button>

              {selectedCase?.frozen === 1 && (
                <Link
                  href={`/admin/traces?caseId=${selectedCase.id}`}
                  className="block w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-center font-semibold transition-colors"
                >
                  View Frozen Trace Dataset
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chat interface
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Success Concierge</h1>
            <p className="text-sm text-gray-600">
              {studentHandle} • {channel === 'sms' ? '📱 SMS' : '💬 Webchat'}
              {selectedCase && ` • ${selectedCase.name}`}
            </p>
          </div>
          <button
            onClick={handleResetSession}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            New Session
          </button>
        </div>
      </div>

      {/* Trace Link */}
      {traceId && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm text-blue-800">
              📊 Trace ID: <Link
                href={`/admin/traces/${traceId}`}
                className="font-mono font-semibold underline hover:text-blue-900"
              >
                #{traceId}
              </Link>
              {' '}(Click to view full conversation trace)
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <p className="text-lg">👋 Welcome! Send a message to get started.</p>
              <p className="text-sm mt-2">
                Try asking about office hours, scheduling an appointment, or requesting help.
              </p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-lg px-4 py-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold opacity-75">
                    {msg.role === 'user' ? 'You' : 'Concierge'}
                  </span>
                  <span className="text-xs opacity-50">
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="max-w-lg px-4 py-3 rounded-lg bg-white border border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="animate-pulse">Thinking...</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-t border-red-200">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={sending}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
