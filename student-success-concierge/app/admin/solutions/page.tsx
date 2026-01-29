'use client';

/**
 * Solutions List Page
 *
 * Browse all submitted solutions with filtering and evidence links
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Solution {
  id: number;
  case_id: number;
  student_id: number;
  case_name: string;
  case_category: string;
  student_handle: string;
  diagnosis_text: string;
  proposed_fix_text: string;
  created_at: string;
  evidence: Array<{
    id: number;
    type: string;
    value: string;
  }>;
}

export default function SolutionsPage() {
  const searchParams = useSearchParams();
  const caseId = searchParams?.get('caseId');
  const studentId = searchParams?.get('studentId');

  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSolutions();
  }, [caseId, studentId]);

  async function fetchSolutions() {
    setLoading(true);
    setError(null);

    try {
      let url = '/api/solutions';
      const params = [];
      if (caseId) params.push(`caseId=${caseId}`);
      if (studentId) params.push(`studentId=${studentId}`);
      if (params.length > 0) url += '?' + params.join('&');

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch solutions');
      }

      const data = await response.json();
      setSolutions(data);
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
          <p className="text-center text-gray-600">Loading solutions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  const filterLabel = caseId
    ? `Case #${caseId}`
    : studentId
    ? `Student #${studentId}`
    : 'All Solutions';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Solutions</h1>
              <p className="text-lg text-gray-600 mt-1">{filterLabel}</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Dashboard
              </Link>
              {(caseId || studentId) && (
                <Link
                  href="/admin/solutions"
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                >
                  Clear Filters
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Solutions List */}
        {solutions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-gray-200">
            <p className="text-xl text-gray-600 mb-4">No solutions found</p>
            <p className="text-gray-500">
              Solutions will appear here as students submit them
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {solutions.map((solution) => (
              <div
                key={solution.id}
                className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200 hover:border-green-300 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      Solution #{solution.id}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Link
                        href={`/cases/${solution.case_id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {solution.case_name}
                      </Link>
                      <span>•</span>
                      <span>by {solution.student_handle}</span>
                      <span>•</span>
                      <span>{new Date(solution.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                      solution.case_category === 'policy_drift'
                        ? 'bg-red-100 text-red-800'
                        : solution.case_category === 'handoff_failure'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {solution.case_category.replace('_', ' ')}
                  </span>
                </div>

                {/* Diagnosis */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Diagnosis
                  </h4>
                  <p className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-200">
                    {solution.diagnosis_text}
                  </p>
                </div>

                {/* Proposed Fix */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Proposed Fix
                  </h4>
                  <p className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-200">
                    {solution.proposed_fix_text}
                  </p>
                </div>

                {/* Evidence */}
                {solution.evidence && solution.evidence.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Evidence ({solution.evidence.length} trace
                      {solution.evidence.length !== 1 ? 's' : ''})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {solution.evidence.map((evidence) => (
                        <Link
                          key={evidence.id}
                          href={`/admin/traces/${evidence.value}`}
                          className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium hover:bg-purple-200 transition-colors"
                        >
                          Trace #{evidence.value}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
