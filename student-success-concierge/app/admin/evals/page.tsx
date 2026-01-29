'use client';

/**
 * Admin Evals Page
 *
 * Run evals and view pass/fail results by case and trace
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface EvalRun {
  id: number;
  cohort_id: number | null;
  case_id: number | null;
  case_name: string | null;
  created_at: string;
  total_evals: number;
  passed_evals: number;
  passRate: number;
}

interface EvalStat {
  evalName: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}

interface CaseStat {
  caseId: number;
  caseName: string;
  caseCategory: string;
  evalName: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}

interface EvalResult {
  id: number;
  eval_run_id: number;
  trace_id: number;
  eval_name: string;
  pass: number;
  details: any;
  case_id: number;
  case_name: string;
  case_category: string;
  channel: string;
  created_at: string;
}

export default function EvalsPage() {
  const searchParams = useSearchParams();
  const runIdParam = searchParams?.get('runId');

  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(
    runIdParam ? parseInt(runIdParam) : null
  );
  const [runDetails, setRunDetails] = useState<{
    run: any;
    stats: EvalStat[];
    caseStats: CaseStat[];
    results: EvalResult[];
  } | null>(null);
  const [showFailuresOnly, setShowFailuresOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [runningEval, setRunningEval] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRuns();
  }, []);

  useEffect(() => {
    if (selectedRunId) {
      fetchRunDetails(selectedRunId);
    }
  }, [selectedRunId, showFailuresOnly]);

  async function fetchRuns() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/evals');
      if (!response.ok) {
        throw new Error('Failed to fetch eval runs');
      }

      const data = await response.json();
      setRuns(data.runs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchRunDetails(runId: number) {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/evals?runId=${runId}&failuresOnly=${showFailuresOnly}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch run details');
      }

      const data = await response.json();
      setRunDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRunEvals() {
    setRunningEval(true);
    setError(null);

    try {
      const response = await fetch('/api/evals/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to run evals');
      }

      const result = await response.json();

      // Refresh runs list
      await fetchRuns();

      // Select the new run
      setSelectedRunId(result.evalRunId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRunningEval(false);
    }
  }

  if (loading && !runDetails) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-gray-600">Loading evals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Evals</h1>
              <p className="text-lg text-gray-600 mt-1">
                Code-based evaluations with binary pass/fail
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={handleRunEvals}
                disabled={runningEval}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {runningEval ? 'Running Evals...' : 'Run Evals'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">Error: {error}</p>
            </div>
          )}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Eval Runs List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Eval Runs</h2>

              {runs.length === 0 ? (
                <p className="text-gray-600 text-center py-4">
                  No eval runs yet. Click "Run Evals" to start.
                </p>
              ) : (
                <div className="space-y-3">
                  {runs.map((run) => (
                    <button
                      key={run.id}
                      onClick={() => setSelectedRunId(run.id)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                        selectedRunId === run.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900">
                          Run #{run.id}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            run.passRate >= 80
                              ? 'bg-green-100 text-green-800'
                              : run.passRate >= 50
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {run.passRate.toFixed(0)}% pass
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(run.created_at).toLocaleString()}
                      </p>
                      {run.case_name && (
                        <p className="text-xs text-gray-600 mt-1">
                          Case: {run.case_name}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Run Details */}
          <div className="lg:col-span-2">
            {!selectedRunId ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-gray-200">
                <p className="text-xl text-gray-600">
                  Select an eval run to view details
                </p>
              </div>
            ) : !runDetails ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-gray-200">
                <p className="text-gray-600">Loading run details...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Summary Statistics
                  </h2>
                  <div className="grid grid-cols-3 gap-4">
                    {runDetails.stats.map((stat) => (
                      <div
                        key={stat.evalName}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <p className="text-xs font-medium text-gray-600 mb-1">
                          {stat.evalName.replace(/_/g, ' ')}
                        </p>
                        <p className="text-2xl font-bold text-blue-600">
                          {stat.passRate.toFixed(0)}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {stat.passed}/{stat.total} passed
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pass Rates by Case */}
                <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Pass Rates by Case
                  </h2>

                  {runDetails.caseStats.length === 0 ? (
                    <p className="text-gray-600 text-center py-4">
                      No case-specific results
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {/* Group by case */}
                      {Object.entries(
                        runDetails.caseStats.reduce((acc, stat) => {
                          if (!acc[stat.caseId]) {
                            acc[stat.caseId] = {
                              caseName: stat.caseName,
                              caseCategory: stat.caseCategory,
                              stats: [],
                            };
                          }
                          acc[stat.caseId].stats.push(stat);
                          return acc;
                        }, {} as any)
                      ).map(([caseId, caseData]: any) => (
                        <div
                          key={caseId}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <Link
                              href={`/cases/${caseId}`}
                              className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                            >
                              {caseData.caseName}
                            </Link>
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full capitalize">
                              {caseData.caseCategory?.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {caseData.stats.map((stat: CaseStat) => (
                              <div key={stat.evalName} className="text-center">
                                <p className="text-xs text-gray-600 mb-1">
                                  {stat.evalName.replace(/_/g, ' ')}
                                </p>
                                <p
                                  className={`text-lg font-bold ${
                                    stat.passRate >= 80
                                      ? 'text-green-600'
                                      : stat.passRate >= 50
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                  }`}
                                >
                                  {stat.passRate.toFixed(0)}%
                                </p>
                                <p className="text-xs text-gray-500">
                                  {stat.passed}/{stat.total}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Failing Traces */}
                <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      Results
                    </h2>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={showFailuresOnly}
                        onChange={(e) => setShowFailuresOnly(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-gray-700">Failures only</span>
                    </label>
                  </div>

                  {runDetails.results.length === 0 ? (
                    <p className="text-gray-600 text-center py-4">
                      {showFailuresOnly
                        ? 'No failures found!'
                        : 'No results found'}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {runDetails.results.map((result) => (
                        <div
                          key={result.id}
                          className={`border-2 rounded-lg p-4 ${
                            result.pass
                              ? 'border-green-200 bg-green-50'
                              : 'border-red-200 bg-red-50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Link
                                  href={`/admin/traces/${result.trace_id}`}
                                  className="font-semibold text-blue-600 hover:text-blue-800"
                                >
                                  Trace #{result.trace_id}
                                </Link>
                                <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full">
                                  {result.eval_name.replace(/_/g, ' ')}
                                </span>
                                <span
                                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    result.pass
                                      ? 'bg-green-200 text-green-800'
                                      : 'bg-red-200 text-red-800'
                                  }`}
                                >
                                  {result.pass ? 'PASS' : 'FAIL'}
                                </span>
                              </div>
                              {result.case_name && (
                                <p className="text-sm text-gray-600">
                                  Case: {result.case_name} • {result.channel}
                                </p>
                              )}
                            </div>
                          </div>
                          {result.details && (
                            <div className="mt-2 text-sm">
                              <p className="text-gray-700">
                                <span className="font-medium">Reason:</span>{' '}
                                {result.details.reason}
                              </p>
                              {result.details.user_message && (
                                <p className="text-gray-600 mt-1 italic">
                                  "{result.details.user_message}"
                                </p>
                              )}
                              {result.details.content && (
                                <p className="text-gray-600 mt-1 font-mono text-xs">
                                  {result.details.content}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
