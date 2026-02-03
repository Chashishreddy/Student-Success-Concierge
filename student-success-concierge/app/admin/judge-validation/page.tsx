'use client';

/**
 * Admin Judge Validation Page
 *
 * Compare judge outputs vs human labels
 * Show confusion matrix, TPR, TNR, precision
 */

import { useState } from 'react';
import Link from 'next/link';

interface ConfusionMatrix {
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
}

interface Metrics {
  truePositiveRate: number;
  trueNegativeRate: number;
  precision: number;
  accuracy: number;
}

interface ValidationResult {
  traceId: number;
  labelType: string;
  humanLabel: 'PASS' | 'FAIL';
  judgeLabel: 'PASS' | 'FAIL';
  match: boolean;
  judgeReasoning: string;
  judgeConfidence: number;
}

interface ValidationData {
  totalLabels: number;
  totalMatches: number;
  overallConfusionMatrix: ConfusionMatrix;
  overallMetrics: Metrics;
  metricsByLabelType: Record<string, {
    confusionMatrix: ConfusionMatrix;
    metrics: Metrics;
    results: ValidationResult[];
  }>;
  results: ValidationResult[];
}

export default function JudgeValidationPage() {
  const [validationData, setValidationData] = useState<ValidationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLabelType, setSelectedLabelType] = useState<string | null>(null);

  async function runValidation() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/judge/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to run validation');
      }

      const data = await response.json();
      setValidationData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function formatPercent(value: number): string {
    return (value * 100).toFixed(1) + '%';
  }

  function getMetricColor(value: number): string {
    if (value >= 0.8) return 'text-green-600';
    if (value >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Judge Validation</h1>
              <p className="text-lg text-gray-600 mt-1">
                Compare judge outputs vs human ground truth labels
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin/labels"
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium transition-colors"
              >
                Label Traces
              </Link>
              <button
                onClick={runValidation}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Running...' : 'Run Validation'}
              </button>
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Error: {error}</p>
            </div>
          )}
        </div>

        {!validationData ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-purple-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Get Started</h2>
            <p className="text-gray-600 mb-6">
              First, label some traces using the{' '}
              <Link href="/admin/labels" className="text-purple-600 hover:underline">
                labeling tool
              </Link>
              , then run validation to compare judge outputs.
            </p>
            <button
              onClick={runValidation}
              disabled={loading}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Running Validation...' : 'Run Validation'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overall Summary */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Overall Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Labels</p>
                  <p className="text-3xl font-bold text-gray-900">{validationData.totalLabels}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Matches</p>
                  <p className="text-3xl font-bold text-green-600">{validationData.totalMatches}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Mismatches</p>
                  <p className="text-3xl font-bold text-red-600">
                    {validationData.totalLabels - validationData.totalMatches}
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Accuracy</p>
                  <p className={`text-3xl font-bold ${getMetricColor(validationData.overallMetrics.accuracy)}`}>
                    {formatPercent(validationData.overallMetrics.accuracy)}
                  </p>
                </div>
              </div>
            </div>

            {/* Overall Confusion Matrix and Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Confusion Matrix */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Overall Confusion Matrix</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="p-3"></th>
                        <th className="p-3 text-center border-b-2 border-gray-200" colSpan={2}>
                          Judge Prediction
                        </th>
                      </tr>
                      <tr>
                        <th className="p-3"></th>
                        <th className="p-3 text-center text-green-700 bg-green-50">PASS</th>
                        <th className="p-3 text-center text-red-700 bg-red-50">FAIL</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-3 font-semibold text-green-700 bg-green-50 border-r-2 border-gray-200">
                          Human: PASS
                        </td>
                        <td className="p-3 text-center bg-green-100 font-bold text-lg">
                          {validationData.overallConfusionMatrix.truePositives}
                          <br />
                          <span className="text-xs text-green-700">True Positive</span>
                        </td>
                        <td className="p-3 text-center bg-red-100 font-bold text-lg">
                          {validationData.overallConfusionMatrix.falseNegatives}
                          <br />
                          <span className="text-xs text-red-700">False Negative</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-red-700 bg-red-50 border-r-2 border-gray-200">
                          Human: FAIL
                        </td>
                        <td className="p-3 text-center bg-yellow-100 font-bold text-lg">
                          {validationData.overallConfusionMatrix.falsePositives}
                          <br />
                          <span className="text-xs text-yellow-700">False Positive</span>
                        </td>
                        <td className="p-3 text-center bg-green-100 font-bold text-lg">
                          {validationData.overallConfusionMatrix.trueNegatives}
                          <br />
                          <span className="text-xs text-green-700">True Negative</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Metrics */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Overall Metrics</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-800">True Positive Rate (TPR)</p>
                      <p className="text-xs text-gray-500">Sensitivity / Recall</p>
                    </div>
                    <p className={`text-2xl font-bold ${getMetricColor(validationData.overallMetrics.truePositiveRate)}`}>
                      {formatPercent(validationData.overallMetrics.truePositiveRate)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-800">True Negative Rate (TNR)</p>
                      <p className="text-xs text-gray-500">Specificity</p>
                    </div>
                    <p className={`text-2xl font-bold ${getMetricColor(validationData.overallMetrics.trueNegativeRate)}`}>
                      {formatPercent(validationData.overallMetrics.trueNegativeRate)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-800">Precision</p>
                      <p className="text-xs text-gray-500">Positive Predictive Value</p>
                    </div>
                    <p className={`text-2xl font-bold ${getMetricColor(validationData.overallMetrics.precision)}`}>
                      {formatPercent(validationData.overallMetrics.precision)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-800">Accuracy</p>
                      <p className="text-xs text-gray-500">Overall Correctness</p>
                    </div>
                    <p className={`text-2xl font-bold ${getMetricColor(validationData.overallMetrics.accuracy)}`}>
                      {formatPercent(validationData.overallMetrics.accuracy)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics by Label Type */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-yellow-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Metrics by Label Type</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(validationData.metricsByLabelType).map(([type, data]) => (
                  <div
                    key={type}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedLabelType === type
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                    onClick={() => setSelectedLabelType(selectedLabelType === type ? null : type)}
                  >
                    <p className="font-semibold text-gray-800 mb-2 capitalize">
                      {type.replace(/_/g, ' ')}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">TPR:</span>{' '}
                        <span className={`font-bold ${getMetricColor(data.metrics.truePositiveRate)}`}>
                          {formatPercent(data.metrics.truePositiveRate)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">TNR:</span>{' '}
                        <span className={`font-bold ${getMetricColor(data.metrics.trueNegativeRate)}`}>
                          {formatPercent(data.metrics.trueNegativeRate)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Precision:</span>{' '}
                        <span className={`font-bold ${getMetricColor(data.metrics.precision)}`}>
                          {formatPercent(data.metrics.precision)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Accuracy:</span>{' '}
                        <span className={`font-bold ${getMetricColor(data.metrics.accuracy)}`}>
                          {formatPercent(data.metrics.accuracy)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {data.results.length} labels • Click to view details
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Results */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedLabelType
                    ? `Results: ${selectedLabelType.replace(/_/g, ' ')}`
                    : 'All Results'}
                </h2>
                {selectedLabelType && (
                  <button
                    onClick={() => setSelectedLabelType(null)}
                    className="text-sm text-purple-600 hover:underline"
                  >
                    Show all
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(selectedLabelType
                  ? validationData.metricsByLabelType[selectedLabelType]?.results || []
                  : validationData.results
                ).map((result, index) => (
                  <div
                    key={`${result.traceId}-${result.labelType}-${index}`}
                    className={`p-4 rounded-lg border-2 ${
                      result.match
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/admin/traces/${result.traceId}`}
                            className="font-semibold text-blue-600 hover:text-blue-800"
                          >
                            Trace #{result.traceId}
                          </Link>
                          <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full capitalize">
                            {result.labelType.replace(/_/g, ' ')}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              result.match
                                ? 'bg-green-200 text-green-800'
                                : 'bg-red-200 text-red-800'
                            }`}
                          >
                            {result.match ? 'MATCH' : 'MISMATCH'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm mt-2">
                          <span>
                            Human:{' '}
                            <span
                              className={`font-semibold ${
                                result.humanLabel === 'PASS' ? 'text-green-700' : 'text-red-700'
                              }`}
                            >
                              {result.humanLabel}
                            </span>
                          </span>
                          <span>→</span>
                          <span>
                            Judge:{' '}
                            <span
                              className={`font-semibold ${
                                result.judgeLabel === 'PASS' ? 'text-green-700' : 'text-red-700'
                              }`}
                            >
                              {result.judgeLabel}
                            </span>
                          </span>
                          <span className="text-gray-500">
                            ({(result.judgeConfidence * 100).toFixed(0)}% confidence)
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      <span className="font-medium">Reasoning:</span> {result.judgeReasoning}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
