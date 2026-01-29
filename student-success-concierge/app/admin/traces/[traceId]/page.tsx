'use client';

/**
 * Trace Detail Page
 *
 * Shows a complete trace with messages and tool calls in chronological order
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Trace, TraceMessage, TraceToolCall, TraceNote, TraceTag } from '@/lib/db/appDb';

interface CompleteTrace {
  trace: Trace;
  messages: TraceMessage[];
  toolCalls: TraceToolCall[];
  student_handle?: string;
  cohort_name?: string;
  case_name?: string;
}

interface TimelineItem {
  type: 'message' | 'tool_call';
  timestamp: string;
  data: TraceMessage | TraceToolCall;
}

const TAG_OPTIONS = [
  { value: 'formatting_error', label: 'Formatting Error', color: 'bg-red-100 text-red-800' },
  { value: 'policy_violation', label: 'Policy Violation', color: 'bg-orange-100 text-orange-800' },
  { value: 'tool_misuse', label: 'Tool Misuse', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'missed_handoff', label: 'Missed Handoff', color: 'bg-blue-100 text-blue-800' },
  { value: 'hallucination_or_drift', label: 'Hallucination/Drift', color: 'bg-purple-100 text-purple-800' },
  { value: 'scheduling_error', label: 'Scheduling Error', color: 'bg-pink-100 text-pink-800' },
] as const;

export default function TraceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const traceId = params.traceId as string;

  const [trace, setTrace] = useState<CompleteTrace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState<TraceNote[]>([]);
  const [tags, setTags] = useState<TraceTag[]>([]);
  const [newNote, setNewNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [submittingNote, setSubmittingNote] = useState(false);
  const [submittingTag, setSubmittingTag] = useState(false);

  useEffect(() => {
    fetchTrace();
    fetchNotes();
    fetchTags();
  }, [traceId]);

  async function fetchTrace() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/traces/${traceId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trace');
      }

      const data = await response.json();
      setTrace(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchNotes() {
    try {
      const response = await fetch(`/api/traces/${traceId}/notes`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    }
  }

  async function fetchTags() {
    try {
      const response = await fetch(`/api/traces/${traceId}/tags`);
      if (response.ok) {
        const data = await response.json();
        setTags(data);
        setSelectedTags(new Set(data.map((t: TraceTag) => t.tag)));
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmittingNote(true);
    try {
      const response = await fetch(`/api/traces/${traceId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_text: newNote }),
      });

      if (response.ok) {
        setNewNote('');
        fetchNotes();
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setSubmittingNote(false);
    }
  }

  async function handleToggleTag(tagValue: string) {
    setSubmittingTag(true);
    const newSelected = new Set(selectedTags);
    const isAdding = !newSelected.has(tagValue);

    try {
      if (isAdding) {
        const response = await fetch(`/api/traces/${traceId}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: tagValue }),
        });

        if (response.ok) {
          newSelected.add(tagValue);
          setSelectedTags(newSelected);
          fetchTags();
        }
      } else {
        const tagToRemove = tags.find((t) => t.tag === tagValue);
        if (tagToRemove) {
          const response = await fetch(`/api/traces/${traceId}/tags/${tagToRemove.id}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            newSelected.delete(tagValue);
            setSelectedTags(newSelected);
            fetchTags();
          }
        }
      }
    } catch (err) {
      console.error('Failed to toggle tag:', err);
    } finally {
      setSubmittingTag(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-gray-600">Loading trace...</p>
        </div>
      </div>
    );
  }

  if (error || !trace) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error || 'Trace not found'}</p>
          </div>
          <Link
            href="/admin/traces"
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            ← Back to traces
          </Link>
        </div>
      </div>
    );
  }

  // Combine messages and tool calls into timeline
  const timeline: TimelineItem[] = [
    ...trace.messages.map((msg) => ({
      type: 'message' as const,
      timestamp: msg.created_at,
      data: msg,
    })),
    ...trace.toolCalls.map((call) => ({
      type: 'tool_call' as const,
      timestamp: call.created_at,
      data: call,
    })),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/traces"
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to traces
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Trace #{trace.trace.id}
          </h1>
        </div>

        {/* Trace Metadata */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Trace Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Channel</p>
              <p className="mt-1">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    trace.trace.channel === 'sms'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {trace.trace.channel}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Created</p>
              <p className="mt-1 text-gray-900">
                {new Date(trace.trace.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Student</p>
              <p className="mt-1 text-gray-900">
                {trace.student_handle || trace.trace.student_id || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Cohort</p>
              <p className="mt-1 text-gray-900">
                {trace.cohort_name || trace.trace.cohort_id || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Test Case</p>
              <p className="mt-1 text-gray-900">
                {trace.case_name || trace.trace.case_id || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className="mt-1">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    trace.trace.archived
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {trace.trace.archived ? 'Archived' : 'Active'}
                </span>
              </p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-600">Messages</p>
              <p className="text-2xl font-bold text-blue-900">
                {trace.messages.length}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm font-medium text-purple-600">Tool Calls</p>
              <p className="text-2xl font-bold text-purple-900">
                {trace.toolCalls.length}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Timeline</h2>

          {timeline.length === 0 && (
            <p className="text-gray-600 text-center py-8">
              No messages or tool calls in this trace
            </p>
          )}

          <div className="space-y-4">
            {timeline.map((item, index) => (
              <div key={`${item.type}-${index}`} className="relative">
                {/* Connector line */}
                {index < timeline.length - 1 && (
                  <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-gray-200" />
                )}

                {item.type === 'message' ? (
                  <MessageItem message={item.data as TraceMessage} />
                ) : (
                  <ToolCallItem toolCall={item.data as TraceToolCall} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Analysis Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tags */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              Tags
            </h2>

            <div className="space-y-2">
              {TAG_OPTIONS.map((option) => {
                const isSelected = selectedTags.has(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => handleToggleTag(option.value)}
                    disabled={submittingTag}
                    className={`w-full text-left px-4 py-2 rounded-lg border-2 transition-all ${
                      isSelected
                        ? `${option.color} border-current font-medium`
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      <span>{option.label}</span>
                      {isSelected && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {tags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Applied tags:</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const option = TAG_OPTIONS.find((o) => o.value === tag.tag);
                    return (
                      <span
                        key={tag.id}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${option?.color || 'bg-gray-100 text-gray-800'}`}
                      >
                        {option?.label || tag.tag}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Notes
            </h2>

            {/* Add Note Form */}
            <form onSubmit={handleAddNote} className="mb-4">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note about this trace..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
              />
              <button
                type="submit"
                disabled={submittingNote || !newNote.trim()}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {submittingNote ? 'Adding...' : 'Add Note'}
              </button>
            </form>

            {/* Notes List */}
            {notes.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No notes yet</p>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                  >
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {note.note_text}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageItem({ message }: { message: TraceMessage }) {
  const roleColors = {
    user: 'bg-blue-100 text-blue-800 border-blue-300',
    assistant: 'bg-green-100 text-green-800 border-green-300',
    system: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  return (
    <div className="flex items-start space-x-4">
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full border-2 ${
          roleColors[message.role]
        } flex items-center justify-center text-xs font-bold z-10`}
      >
        {message.role[0].toUpperCase()}
      </div>
      <div className="flex-1 bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-900 capitalize">
            {message.role}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(message.created_at).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

function ToolCallItem({ toolCall }: { toolCall: TraceToolCall }) {
  const [showInput, setShowInput] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  let input, output;
  try {
    input = JSON.parse(toolCall.input_json);
    output = JSON.parse(toolCall.output_json);
  } catch (e) {
    input = toolCall.input_json;
    output = toolCall.output_json;
  }

  return (
    <div className="flex items-start space-x-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 bg-purple-100 text-purple-800 border-purple-300 flex items-center justify-center text-xs font-bold z-10">
        T
      </div>
      <div className="flex-1 bg-purple-50 rounded-lg p-4 border border-purple-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-purple-900">
            Tool Call: {toolCall.tool_name}
          </span>
          <span className="text-xs text-purple-600">
            {new Date(toolCall.created_at).toLocaleTimeString()}
          </span>
        </div>

        {/* Input */}
        <div className="mb-3">
          <button
            onClick={() => setShowInput(!showInput)}
            className="text-xs font-medium text-purple-700 hover:text-purple-900 mb-1"
          >
            {showInput ? '▼' : '▶'} Input
          </button>
          {showInput && (
            <pre className="mt-2 p-3 bg-white rounded border border-purple-200 text-xs overflow-x-auto">
              {JSON.stringify(input, null, 2)}
            </pre>
          )}
        </div>

        {/* Output */}
        <div>
          <button
            onClick={() => setShowOutput(!showOutput)}
            className="text-xs font-medium text-purple-700 hover:text-purple-900 mb-1"
          >
            {showOutput ? '▼' : '▶'} Output
          </button>
          {showOutput && (
            <pre className="mt-2 p-3 bg-white rounded border border-purple-200 text-xs overflow-x-auto">
              {JSON.stringify(output, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
