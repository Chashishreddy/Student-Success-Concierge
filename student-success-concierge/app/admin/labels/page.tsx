'use client';

/**
 * Admin Labels Page
 *
 * Quick labeling screen for ground truth labels on traces
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TraceWithDetails {
  id: number;
  case_id: number | null;
  case_name: string | null;
  student_id: number | null;
  channel: string;
  created_at: string;
  messages: Array<{
    id: number;
    role: string;
    content: string;
  }>;
  toolCalls: Array<{
    id: number;
    tool_name: string;
    input_json: string;
    output_json: string;
  }>;
  labels: Record<string, string>;
}

type LabelType = 'handoff_required' | 'policy_adherence' | 'overall_pass';

const LABEL_TYPES: { type: LabelType; name: string; description: string }[] = [
  {
    type: 'handoff_required',
    name: 'Handoff Required',
    description: 'Did the agent properly handle handoff requests?',
  },
  {
    type: 'policy_adherence',
    name: 'Policy Adherence',
    description: 'Did the agent follow all policies (formatting, booking, etc.)?',
  },
  {
    type: 'overall_pass',
    name: 'Overall Pass',
    description: 'Overall quality assessment of the trace',
  },
];

export default function LabelsPage() {
  const [traces, setTraces] = useState<TraceWithDetails[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, labeled: 0 });

  useEffect(() => {
    fetchTraces();
  }, []);

  async function fetchTraces() {
    setLoading(true);
    setError(null);

    try {
      // Fetch traces with their messages, tool calls, and existing labels
      const response = await fetch('/api/admin/traces-for-labeling?limit=30');
      if (!response.ok) {
        throw new Error('Failed to fetch traces');
      }

      const data = await response.json();
      setTraces(data.traces);
      setStats({ total: data.total, labeled: data.labeled });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleLabel(traceId: number, labelType: LabelType, labelValue: 'PASS' | 'FAIL') {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traceId, labelType, labelValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to save label');
      }

      // Update local state
      setTraces((prev) =>
        prev.map((trace) => {
          if (trace.id === traceId) {
            return {
              ...trace,
              labels: {
                ...trace.labels,
                [labelType]: labelValue,
              },
            };
          }
          return trace;
        })
      );

      // Update stats
      setStats((prev) => ({
        ...prev,
        labeled: prev.labeled + 1,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  function nextTrace() {
    if (currentIndex < traces.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }

  function prevTrace() {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-gray-600">Loading traces...</p>
        </div>
      </div>
    );
  }

  const currentTrace = traces[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Ground Truth Labeling</h1>
              <p className="text-lg text-gray-600 mt-1">
                Label traces for judge validation
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin/judge-validation"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
              >
                View Validation
              </Link>
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Labeling Progress</span>
              <span className="text-sm text-gray-600">
                {stats.labeled} of {stats.total} traces labeled
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${stats.total > 0 ? (stats.labeled / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">Error: {error}</p>
            </div>
          )}
        </div>

        {traces.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-xl text-gray-600">No traces available for labeling.</p>
            <p className="text-gray-500 mt-2">Run some chats first to create traces.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Navigation */}
            <div className="bg-white rounded-xl shadow-lg p-4 flex items-center justify-between">
              <button
                onClick={prevTrace}
                disabled={currentIndex === 0}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-lg font-medium text-gray-700">
                Trace {currentIndex + 1} of {traces.length}
              </span>
              <button
                onClick={nextTrace}
                disabled={currentIndex === traces.length - 1}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>

            {currentTrace && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Trace Details */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Trace Header */}
                  <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-900">
                        <Link
                          href={`/admin/traces/${currentTrace.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Trace #{currentTrace.id}
                        </Link>
                      </h2>
                      <div className="flex gap-2">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs capitalize">
                          {currentTrace.channel}
                        </span>
                        {currentTrace.case_name && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                            {currentTrace.case_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      Created: {new Date(currentTrace.created_at).toLocaleString()}
                    </p>
                  </div>

                  {/* Messages */}
                  <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Messages</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {currentTrace.messages.length === 0 ? (
                        <p className="text-gray-500 text-center">No messages</p>
                      ) : (
                        currentTrace.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`p-3 rounded-lg ${
                              msg.role === 'user'
                                ? 'bg-blue-50 border-l-4 border-blue-500'
                                : msg.role === 'assistant'
                                ? 'bg-green-50 border-l-4 border-green-500'
                                : 'bg-gray-50 border-l-4 border-gray-400'
                            }`}
                          >
                            <p className="text-xs font-semibold text-gray-600 mb-1 uppercase">
                              {msg.role}
                            </p>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">
                              {msg.content}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Tool Calls */}
                  {currentTrace.toolCalls.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Tool Calls</h3>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {currentTrace.toolCalls.map((tc) => (
                          <div key={tc.id} className="p-3 bg-purple-50 rounded-lg">
                            <p className="text-sm font-semibold text-purple-800 mb-1">
                              {tc.tool_name}
                            </p>
                            <details className="text-xs">
                              <summary className="cursor-pointer text-purple-600">
                                View input/output
                              </summary>
                              <div className="mt-2 space-y-2">
                                <div>
                                  <span className="font-semibold text-gray-600">Input:</span>
                                  <pre className="bg-white p-2 rounded mt-1 overflow-x-auto">
                                    {JSON.stringify(JSON.parse(tc.input_json), null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <span className="font-semibold text-gray-600">Output:</span>
                                  <pre className="bg-white p-2 rounded mt-1 overflow-x-auto">
                                    {JSON.stringify(JSON.parse(tc.output_json), null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </details>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Labeling Panel */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-yellow-200 sticky top-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Labels</h2>

                    <div className="space-y-6">
                      {LABEL_TYPES.map(({ type, name, description }) => (
                        <div key={type} className="border-b border-gray-200 pb-4 last:border-0">
                          <p className="font-semibold text-gray-800 mb-1">{name}</p>
                          <p className="text-xs text-gray-500 mb-3">{description}</p>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleLabel(currentTrace.id, type, 'PASS')}
                              disabled={saving}
                              className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                                currentTrace.labels[type] === 'PASS'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-green-100 text-green-800 hover:bg-green-200'
                              } disabled:opacity-50`}
                            >
                              PASS
                            </button>
                            <button
                              onClick={() => handleLabel(currentTrace.id, type, 'FAIL')}
                              disabled={saving}
                              className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                                currentTrace.labels[type] === 'FAIL'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-red-100 text-red-800 hover:bg-red-200'
                              } disabled:opacity-50`}
                            >
                              FAIL
                            </button>
                          </div>

                          {currentTrace.labels[type] && (
                            <p className="text-xs text-gray-500 mt-2 text-center">
                              Current: {currentTrace.labels[type]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-3">Quick Actions</p>
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            handleLabel(currentTrace.id, 'handoff_required', 'PASS');
                            handleLabel(currentTrace.id, 'policy_adherence', 'PASS');
                            handleLabel(currentTrace.id, 'overall_pass', 'PASS');
                          }}
                          disabled={saving}
                          className="w-full py-2 px-3 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          Mark All PASS
                        </button>
                        <button
                          onClick={() => {
                            handleLabel(currentTrace.id, 'handoff_required', 'FAIL');
                            handleLabel(currentTrace.id, 'policy_adherence', 'FAIL');
                            handleLabel(currentTrace.id, 'overall_pass', 'FAIL');
                          }}
                          disabled={saving}
                          className="w-full py-2 px-3 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          Mark All FAIL
                        </button>
                        <button
                          onClick={nextTrace}
                          disabled={currentIndex === traces.length - 1}
                          className="w-full py-2 px-3 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          Next Trace →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
