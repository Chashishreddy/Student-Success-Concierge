import Link from 'next/link';

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
        <h2 className="text-3xl font-bold mb-4">Welcome to Student Success Concierge</h2>
        <p className="text-gray-600 mb-6">
          A teaching platform for learning AI agent evaluation, tracing, and analysis.
          This app mirrors Nurture Boss-style workflows with full conversation tracing,
          teaching loop features, and comprehensive evaluation tools.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="border-2 border-blue-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3 text-blue-600">🤖 Chat Interface</h3>
            <p className="text-gray-600 mb-4">
              Interact with the AI assistant. Test different scenarios including SMS and webchat channels.
            </p>
            <Link href="/chat" className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Start Chatting
            </Link>
          </div>

          <div className="border-2 border-green-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3 text-green-600">📊 Conversations</h3>
            <p className="text-gray-600 mb-4">
              View conversation history with full tracing: messages, tool calls, and outputs.
            </p>
            <Link href="/admin/traces" className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              View History
            </Link>
          </div>

          <div className="border-2 border-purple-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3 text-purple-600">🏷️ Teaching Loop</h3>
            <p className="text-gray-600 mb-4">
              Open coding (notes), axial coding (tags), and frequency analysis dashboard.
            </p>
            <Link href="/admin/analysis" className="inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
              Analyze Patterns
            </Link>
          </div>

          <div className="border-2 border-orange-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3 text-orange-600">🧪 Evaluations</h3>
            <p className="text-gray-600 mb-4">
              Run code-based checks and LLM-as-judge evaluations with validation metrics.
            </p>
            <Link href="/admin/evals" className="inline-block bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700">
              Run Evals
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded">
        <h3 className="font-semibold mb-2">📚 Setup Instructions</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Initialize databases & seed data: <code className="bg-gray-200 px-2 py-1 rounded">npm run init:db</code></li>
          <li>Start the dev server: <code className="bg-gray-200 px-2 py-1 rounded">npm run dev</code></li>
          <li>Start exploring the chat interface and evaluation tools!</li>
        </ol>
        <p className="mt-4 text-sm text-gray-600">
          <strong>Note:</strong> This app runs in mock LLM mode by default. To use a real LLM,
          set <code className="bg-gray-200 px-1">OPENAI_API_KEY</code> or <code className="bg-gray-200 px-1">ANTHROPIC_API_KEY</code> in your environment.
        </p>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold mb-3">🎯 Test Cases Coverage</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-medium text-red-600 mb-2">Policy Drift</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Incorrect booking hours</li>
              <li>• Hallucinated services</li>
              <li>• Wrong cancellation policy</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-yellow-600 mb-2">Handoff Failure</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Emergency not escalated</li>
              <li>• Complex issues not escalated</li>
              <li>• Out-of-scope requests</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-purple-600 mb-2">Scheduling Violation</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Double booking</li>
              <li>• Outside business hours</li>
              <li>• Exceeds weekly limit</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
