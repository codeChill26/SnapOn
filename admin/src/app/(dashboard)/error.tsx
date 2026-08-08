'use client';

import { useEffect } from 'react';
import { Card } from '@/components/ui/Card';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Server Component Error:', error);
  }, [error]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <Card className="border-red-900/50 bg-red-950/20 p-6">
        <h2 className="text-xl font-bold text-red-400 mb-2">An error occurred in Server Components render</h2>
        <p className="text-zinc-300 text-sm mb-4">
          {error.message || 'The server component failed to render on production.'}
        </p>
        {error.digest && (
          <p className="text-xs text-zinc-500 font-mono mb-4">Error Digest: {error.digest}</p>
        )}
        <div className="p-4 bg-zinc-900 rounded-lg text-xs text-zinc-400 space-y-2 mb-4">
          <p className="font-semibold text-amber-400">Common causes on Vercel deployment:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Missing Environment Variables in Vercel Dashboard (e.g. <code>DATABASE_URL</code>, <code>DIRECT_URL</code>, <code>JWT_SECRET</code>).</li>
            <li>Supabase database connection pool exhaustion or IP/SSL configuration issues.</li>
          </ul>
        </div>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm font-medium transition-colors"
        >
          Retry Loading
        </button>
      </Card>
    </div>
  );
}
