'use client';

/**
 * Analysis Dashboard
 *
 * Shows tag frequency across all traces, grouped by test case
 * Helps instructors identify common failure patterns
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TagCount {
  tag: string;
  count: number;
}

interface CaseAnalysis {
  case_id: number;
  case_name: string;
  case_category: string;
  total_traces: number;
  tag_counts: TagCount[];
}

interface AnalysisData {
  overall: TagCount[];
  by_case: CaseAnalysis[];
}

const TAG_LABELS: Record<string, string> = {
  formatting_error: 'Formatting Error',
  policy_violation: 'Policy Violation',
  tool_misuse: 'Tool Misuse',
  missed_handoff: 'Missed Handoff',
  hallucination_or_drift: 'Hallucination/Drift',
  scheduling_error: 'Scheduling Error',
};

const TAG_COLORS: Record<string, string> = {
  formatting_error: 'bg-red-100 text-red-800 border-red-300',
  policy_violation: 'bg-orange-100 text-orange-800 border-orange-300',
  tool_misuse: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  missed_handoff: 'bg-blue-100 text-blue-800 border-blue-300',
  hallucination_or_drift: 'bg-purple-100 text-purple-800 border-purple-300',
  scheduling_error: 'bg-pink-100 text-pink-800 border-pink-300',
};

export default function AnalysisPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalysis();
  }, []);

  async function fetchAnalysis() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analysis');
      if (!response.ok) {
        throw new Error('Failed to fetch analysis data');
      }

      const analysisData = await response.json();
      setData(analysisData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-gray-600">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error || 'Failed to load data'}</p>
          </div>
        </div>
      </div>
    );
  }

  const totalTags = data.overall.reduce((sum, t) => sum + t.count, 0);
  const maxCount = Math.max(...data.overall.map((t) => t.count), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Analysis Dashboard</h1>
          <p className="text-lg text-gray-600">
            Tag frequency across all traces - identify common failure patterns
          </p>
        </div>

        {/* Overall Statistics */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-2 border-blue-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <svg
              className="w-7 h-7 mr-3 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Overall Tag Frequency
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.overall.map((tagData) => {
              const percentage = maxCount > 0 ? (tagData.count / maxCount) * 100 : 0;
              return (
                <div
                  key={tagData.tag}
                  className={`rounded-lg p-4 border-2 ${TAG_COLORS[tagData.tag] || 'bg-gray-100 text-gray-800 border-gray-300'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">
                      {TAG_LABELS[tagData.tag] || tagData.tag}
                    </span>
                    <span className="text-2xl font-bold">{tagData.count}</span>
                  </div>
                  <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                    <div
                      className="bg-current h-full rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-lg text-gray-700">
              <span className="font-bold text-2xl text-blue-600">{totalTags}</span> total
              tags applied across all traces
            </p>
          </div>
        </div>

        {/* By Case Analysis */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <svg
              className="w-7 h-7 mr-3 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            Analysis by Test Case
          </h2>

          {data.by_case.length === 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-center">
                No test cases with traces found. Start by tagging some traces!
              </p>
            </div>
          )}

          {data.by_case.map((caseData) => {
            const caseTotalTags = caseData.tag_counts.reduce((sum, t) => sum + t.count, 0);
            return (
              <div
                key={caseData.case_id}
                className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {caseData.case_name}
                    </h3>
                    <p className="text-sm text-gray-600 capitalize mt-1">
                      {caseData.case_category.replace('_', ' ')} •{' '}
                      {caseData.total_traces} traces
                    </p>
                  </div>
                  <Link
                    href={`/admin/traces?caseId=${caseData.case_id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    View Traces
                  </Link>
                </div>

                {caseData.tag_counts.length === 0 ? (
                  <p className="text-gray-500 italic">No tags applied to traces in this case</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {caseData.tag_counts.map((tagData) => (
                      <div
                        key={tagData.tag}
                        className={`rounded-lg p-3 border ${TAG_COLORS[tagData.tag] || 'bg-gray-100 text-gray-800 border-gray-300'}`}
                      >
                        <p className="text-xs font-medium mb-1">
                          {TAG_LABELS[tagData.tag] || tagData.tag}
                        </p>
                        <p className="text-xl font-bold">{tagData.count}</p>
                      </div>
                    ))}
                  </div>
                )}

                {caseTotalTags > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold text-lg text-gray-900">
                        {caseTotalTags}
                      </span>{' '}
                      total tags in this case
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
