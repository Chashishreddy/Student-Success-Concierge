import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Student Success Concierge',
  description: 'Teaching app for AI agent evaluation and analysis',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <nav className="bg-blue-600 text-white shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">🎓 Student Success Concierge</h1>
            <p className="text-blue-100 text-sm">Teaching Platform for AI Agent Evaluation</p>
          </div>
        </nav>
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
