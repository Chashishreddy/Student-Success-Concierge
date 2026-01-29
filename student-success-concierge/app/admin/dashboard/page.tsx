'use client';

/**
 * Admin Dashboard
 *
 * Shows overview of solutions submitted, progress per case, and student analytics
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CaseStat {
  case_id: number;
  case_name: string;
  case_category: string;
  solution_count: number;
  unique_students: number;
}

interface StudentStat {
  student_id: number;
  student_handle: string;
  solution_count: number;
  cases_solved: number;
}

interface DashboardData {
  totalSolutions: number;
  totalStudents: number;
  totalCases: number;
  caseStats: CaseStat[];
  studentStats: StudentStat[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const dashboardData = await response.json();
      setData(dashboardData);
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
          <p className="text-center text-gray-600">Loading dashboard...</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-lg text-gray-600">
            Student progress and case completion overview
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Solutions</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {data.totalSolutions}
                </p>
              </div>
              <div className="bg-blue-100 p-4 rounded-full">
                <svg
                  className="w-8 h-8 text-blue-600"
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
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Students</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {data.totalStudents}
                </p>
              </div>
              <div className="bg-green-100 p-4 rounded-full">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cases</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">
                  {data.totalCases}
                </p>
              </div>
              <div className="bg-purple-100 p-4 rounded-full">
                <svg
                  className="w-8 h-8 text-purple-600"
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
              </div>
            </div>
          </div>
        </div>

        {/* Cases Progress */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Solutions by Case</h2>
            <Link
              href="/admin/solutions"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              View All Solutions
            </Link>
          </div>

          {data.caseStats.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No solutions submitted yet
            </p>
          ) : (
            <div className="space-y-4">
              {data.caseStats.map((caseStat) => (
                <div
                  key={caseStat.case_id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <Link
                        href={`/cases/${caseStat.case_id}`}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {caseStat.case_name}
                      </Link>
                      <p className="text-sm text-gray-600 capitalize">
                        {caseStat.case_category.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        {caseStat.solution_count}
                      </p>
                      <p className="text-xs text-gray-500">solutions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>👥 {caseStat.unique_students} students</span>
                    <Link
                      href={`/admin/solutions?caseId=${caseStat.case_id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View solutions →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Student Progress */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Progress</h2>

          {data.studentStats.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No student activity yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Student
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">
                      Solutions
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">
                      Cases Solved
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.studentStats.map((student) => (
                    <tr
                      key={student.student_id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">
                          {student.student_handle}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {student.solution_count}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          {student.cases_solved}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/solutions?studentId=${student.student_id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          View solutions →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
