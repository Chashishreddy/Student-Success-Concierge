'use client';

/**
 * Case Detail Page
 *
 * Teaching-first interface with learning outcomes and step-by-step guidance
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { TestCase, Trace } from '@/lib/db/appDb';

interface CaseWithTraces extends TestCase {
  traces: Trace[];
  trace_count: number;
  learning_objectives?: string[];
  guidance_checklist?: string[];
}

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.caseId as string;

  const [testCase, setTestCase] = useState<CaseWithTraces | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [showSolutionForm, setShowSolutionForm] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [proposedFix, setProposedFix] = useState('');
  const [evidenceTraceIds, setEvidenceTraceIds] = useState('');
  const [submittingSolution, setSubmittingSolution] = useState(false);
  const [solutionSuccess, setSolutionSuccess] = useState(false);

  useEffect(() => {
    fetchCase();
    loadCheckedSteps();
  }, [caseId]);

  async function fetchCase() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cases/${caseId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch case');
      }

      const data = await response.json();

      // Parse JSON fields
      if (data.learning_objectives_json) {
        data.learning_objectives = JSON.parse(data.learning_objectives_json);
      }
      if (data.guidance_checklist_json) {
        data.guidance_checklist = JSON.parse(data.guidance_checklist_json);
      }

      setTestCase(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function loadCheckedSteps() {
    const saved = localStorage.getItem(`case_${caseId}_checklist`);
    if (saved) {
      setCheckedSteps(new Set(JSON.parse(saved)));
    }
  }

  function toggleStep(index: number) {
    const newChecked = new Set(checkedSteps);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedSteps(newChecked);
    localStorage.setItem(`case_${caseId}_checklist`, JSON.stringify(Array.from(newChecked)));
  }

  async function handleSubmitSolution(e: React.FormEvent) {
    e.preventDefault();

    if (!diagnosis.trim() || !proposedFix.trim()) {
      alert('Please fill in both diagnosis and proposed fix');
      return;
    }

    setSubmittingSolution(true);

    try {
      // Parse evidence trace IDs
      const traceIds = evidenceTraceIds
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id && !isNaN(parseInt(id)))
        .map((id) => parseInt(id));

      const response = await fetch('/api/solutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: parseInt(caseId),
          studentHandle: prompt('Enter your student handle:') || 'anonymous',
          diagnosis: diagnosis.trim(),
          proposedFix: proposedFix.trim(),
          evidenceTraceIds: traceIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit solution');
      }

      setSolutionSuccess(true);
      setDiagnosis('');
      setProposedFix('');
      setEvidenceTraceIds('');
      setShowSolutionForm(false);

      setTimeout(() => setSolutionSuccess(false), 5000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit solution');
    } finally {
      setSubmittingSolution(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-gray-600">Loading case...</p>
        </div>
      </div>
    );
  }

  if (error || !testCase) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error || 'Case not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const isFrozen = testCase.frozen === 1;
  const completedSteps = checkedSteps.size;
  const totalSteps = testCase.guidance_checklist?.length || 0;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-900">{testCase.name}</h1>
            <span
              className={`px-4 py-2 rounded-full text-sm font-bold ${
                isFrozen
                  ? 'bg-purple-100 text-purple-800 border-2 border-purple-300'
                  : 'bg-green-100 text-green-800 border-2 border-green-300'
              }`}
            >
              {isFrozen ? '❄️ Investigation Mode' : '🟢 Playground Mode'}
            </span>
          </div>
          <p className="text-lg text-gray-600">{testCase.description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Learning Outcomes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Learning Objectives */}
            {testCase.learning_objectives && testCase.learning_objectives.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border-2 border-blue-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  <h2 className="text-2xl font-bold text-white flex items-center">
                    <svg
                      className="w-8 h-8 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Learning Objectives
                  </h2>
                  <p className="text-blue-100 mt-1">By the end of this case, you will be able to:</p>
                </div>
                <div className="p-6">
                  <ul className="space-y-4">
                    {testCase.learning_objectives.map((objective, index) => (
                      <li key={index} className="flex items-start">
                        <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold mr-3 mt-0.5">
                          {index + 1}
                        </span>
                        <span className="text-gray-700 text-base leading-relaxed pt-1">
                          {objective}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Step-by-Step Guidance */}
            {testCase.guidance_checklist && testCase.guidance_checklist.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border-2 border-green-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white flex items-center">
                        <svg
                          className="w-8 h-8 mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        Step-by-Step Guidance
                      </h2>
                      <p className="text-green-100 mt-1">
                        Follow these steps to complete the investigation
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-white">
                        {completedSteps}/{totalSteps}
                      </div>
                      <div className="text-green-100 text-sm">completed</div>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-3 bg-green-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-white h-full transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="p-6">
                  <ul className="space-y-3">
                    {testCase.guidance_checklist.map((step, index) => {
                      const isChecked = checkedSteps.has(index);
                      return (
                        <li key={index} className="group">
                          <label className="flex items-start cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleStep(index)}
                              className="w-6 h-6 text-green-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-green-500 mt-0.5 flex-shrink-0"
                            />
                            <span
                              className={`ml-3 text-base leading-relaxed ${
                                isChecked
                                  ? 'text-gray-400 line-through'
                                  : 'text-gray-700'
                              }`}
                            >
                              {step}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Actions & Info */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="text-lg font-semibold text-gray-900 capitalize mt-1">
                    {testCase.category.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Dataset Size</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">
                    {testCase.trace_count}
                    <span className="text-lg text-gray-500 ml-2">traces</span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Your Progress</p>
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {completedSteps} of {totalSteps} steps
                      </span>
                      <span className="text-sm font-semibold text-green-600">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Action */}
            {isFrozen && (
              <Link
                href={`/admin/traces?caseId=${caseId}`}
                className="block w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-purple-300 font-bold text-center shadow-lg hover:shadow-xl transition-all text-lg"
              >
                🔍 Investigate {testCase.trace_count} Traces
              </Link>
            )}

            {!isFrozen && (
              <div className="space-y-3">
                <button
                  onClick={() => alert('Chat interface coming soon!')}
                  className="block w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-300 font-bold text-center shadow-lg hover:shadow-xl transition-all text-lg"
                >
                  🎮 Start Playground
                </button>
                <Link
                  href={`/admin/traces?caseId=${caseId}`}
                  className="block w-full px-6 py-4 bg-white text-green-700 border-2 border-green-600 rounded-xl hover:bg-green-50 focus:outline-none focus:ring-4 focus:ring-green-300 font-bold text-center transition-all"
                >
                  View Existing Traces
                </Link>
              </div>
            )}

            {/* Expected Behavior */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-amber-900 mb-2 flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                Expected Behavior
              </h3>
              <p className="text-amber-800 text-sm leading-relaxed">
                {testCase.expected_behavior}
              </p>
            </div>

            {/* Recent Traces Preview */}
            {testCase.traces && testCase.traces.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Traces</h3>
                <div className="space-y-2">
                  {testCase.traces.slice(0, 3).map((trace) => (
                    <Link
                      key={trace.id}
                      href={`/admin/traces/${trace.id}`}
                      className="block p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          Trace #{trace.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            trace.channel === 'sms'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {trace.channel}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Solution Button */}
            {isFrozen && (
              <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Solution Submission</h3>
                {solutionSuccess && (
                  <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">✅ Solution submitted successfully!</p>
                  </div>
                )}
                {!showSolutionForm ? (
                  <button
                    onClick={() => setShowSolutionForm(true)}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
                  >
                    📝 Submit Your Solution
                  </button>
                ) : (
                  <form onSubmit={handleSubmitSolution} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Diagnosis
                      </label>
                      <textarea
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        placeholder="What pattern did you identify? What's causing the failures?"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        rows={4}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Evidence Trace IDs
                      </label>
                      <input
                        type="text"
                        value={evidenceTraceIds}
                        onChange={(e) => setEvidenceTraceIds(e.target.value)}
                        placeholder="e.g., 1, 5, 12 (comma-separated)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter trace IDs that demonstrate the problem
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Proposed Fix
                      </label>
                      <textarea
                        value={proposedFix}
                        onChange={(e) => setProposedFix(e.target.value)}
                        placeholder="What changes would fix this? (prompt change, tool change, eval change, etc.)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        rows={4}
                        required
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={submittingSolution}
                        className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition-colors"
                      >
                        {submittingSolution ? 'Submitting...' : 'Submit Solution'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSolutionForm(false)}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
