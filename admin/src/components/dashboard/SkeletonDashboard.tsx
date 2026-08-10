import React from 'react';
import { Card } from '@/components/ui/Card';

export default function SkeletonDashboard() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Title skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-zinc-850 rounded-lg" />
        <div className="h-4 w-96 bg-zinc-900 rounded" />
      </div>

      {/* KPI Grid Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="p-5 space-y-3 border-zinc-850">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-3 w-24 bg-zinc-850 rounded" />
                <div className="h-7 w-20 bg-zinc-800 rounded-lg" />
              </div>
              <div className="h-10 w-10 bg-zinc-850 rounded-xl" />
            </div>
            <div className="h-3 w-32 bg-zinc-900 rounded pt-2" />
          </Card>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2 space-y-4">
          <div className="h-6 w-48 bg-zinc-850 rounded" />
          <div className="h-48 w-full bg-zinc-900 rounded-xl" />
        </Card>
        <Card className="p-6 space-y-4">
          <div className="h-6 w-36 bg-zinc-850 rounded" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 w-full bg-zinc-900 rounded-xl" />
            ))}
          </div>
        </Card>
      </div>

      {/* Tables Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div className="h-6 w-40 bg-zinc-850 rounded" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 w-full bg-zinc-900 rounded" />
            ))}
          </div>
        </Card>
        <Card className="p-6 space-y-4">
          <div className="h-6 w-40 bg-zinc-850 rounded" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 w-full bg-zinc-900 rounded" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
