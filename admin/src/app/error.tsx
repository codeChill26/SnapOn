'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-800/60 text-red-400 flex items-center justify-center mx-auto text-xl font-bold">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-white">Application Render Error</h2>
        <p className="text-sm text-zinc-400">
          An error occurred while rendering the page on the server.
        </p>

        {error.digest && (
          <p className="text-xs font-mono bg-zinc-950 p-2 rounded text-zinc-500 border border-zinc-800 break-all">
            Digest: {error.digest}
          </p>
        )}

        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={() => reset()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
          >
            Reload Page
          </button>
          <a
            href="/login"
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-xl font-semibold text-sm transition-colors block"
          >
            Back to Sign In
          </a>
        </div>
      </div>
    </div>
  );
}
