import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/Card';
import { 
  Users, 
  Briefcase, 
  Tag, 
  Flag, 
  Wallet,
  ArrowUpRight,
  Clock
} from 'lucide-react';
import { formatImageUrl } from '@/lib/image-utils';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Query counts in parallel
  const [
    userCount,
    taskCount,
    pendingPayoutCount,
    openReportCount,
    categoryCount,
    recentTasks,
    recentPayouts
  ] = await Promise.all([
    prisma.user.count(),
    prisma.task.count(),
    prisma.withdrawRequest.count({ where: { status: 'PENDING' } }),
    prisma.report.count({ where: { status: 'PENDING' } }),
    prisma.category.count(),
    prisma.task.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { 
        poster: { select: { fullName: true } }, 
        category: { select: { name: true } } 
      }
    }),
    prisma.withdrawRequest.findMany({
      take: 5,
      orderBy: { status: 'asc' }, // Order by pending first
      include: { 
        user: { select: { fullName: true } } 
      }
    })
  ]);

  const stats = [
    { label: 'Total Registered Users', value: userCount, icon: Users, href: '/users', color: 'text-blue-500' },
    { label: 'Total Posted Tasks', value: taskCount, icon: Briefcase, href: '/tasks', color: 'text-indigo-500' },
    { label: 'Total Categories', value: categoryCount, icon: Tag, href: '/categories', color: 'text-amber-500' },
    { label: 'Pending Withdrawals', value: pendingPayoutCount, icon: Wallet, href: '/withdraws', color: 'text-emerald-500', alert: pendingPayoutCount > 0 },
    { label: 'Pending Reports', value: openReportCount, icon: Flag, href: '/reports', color: 'text-rose-500', alert: openReportCount > 0 },
  ];

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Console Overview</h2>
        <p className="text-zinc-400 mt-1">Platform overview metrics and pending actions.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400">{stat.label}</p>
                  <h3 className="text-3xl font-bold mt-2 text-white">{stat.value}</h3>
                </div>
                <div className={`rounded-xl bg-zinc-900/80 p-3 ${stat.color} transition-all group-hover:scale-110`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              
              {stat.alert && (
                <div className="absolute top-0 right-0 h-2.5 w-2.5 bg-red-500 rounded-bl" />
              )}

              <div className="mt-4 flex items-center justify-between border-t border-zinc-900 pt-4 text-xs">
                <span className="text-zinc-500">System generated</span>
                <Link href={stat.href} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors">
                  Manage <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Activity Tables */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Tasks */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-500" />
              <span>Recent Tasks</span>
            </h3>
            <Link href="/tasks" className="text-xs text-indigo-400 hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="bg-zinc-900/50 text-xs uppercase text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3 font-semibold w-[60px]">Image</th>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Poster</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {recentTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-zinc-500">No tasks created recently</td>
                  </tr>
                ) : (
                  recentTasks.map((task: any) => (
                    <tr key={task.id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="px-4 py-3">
                        {task.images && task.images.length > 0 ? (
                          <Image
                            src={formatImageUrl(task.images[0])}
                            width={36}
                            height={36}
                            alt={task.title}
                            className="rounded-md object-cover w-[36px] h-[36px] border border-zinc-850 bg-zinc-900"
                          />
                        ) : (
                          <div className="w-[36px] h-[36px] rounded-md bg-zinc-900 border border-zinc-850 flex items-center justify-center text-[8px] text-zinc-500 font-medium">
                            No Img
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white font-medium truncate max-w-[150px]">{task.title}</td>
                      <td className="px-4 py-3">{task.category?.name || 'N/A'}</td>
                      <td className="px-4 py-3 truncate max-w-[100px]">{task.poster.fullName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                          task.status === 'OPEN' ? 'bg-blue-950/40 text-blue-300 border-blue-800/40' :
                          task.status === 'IN_PROGRESS' ? 'bg-amber-950/40 text-amber-300 border-amber-800/40' :
                          task.status === 'COMPLETED' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' :
                          'bg-zinc-900 text-zinc-450 border-zinc-800'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent Withdrawal Requests */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-500" />
              <span>Pending & Recent Payouts</span>
            </h3>
            <Link href="/withdraws" className="text-xs text-indigo-400 hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="bg-zinc-900/50 text-xs uppercase text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Bank</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {recentPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-zinc-500">No payout requests</td>
                  </tr>
                ) : (
                  recentPayouts.map((req: any) => (
                    <tr key={req.id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="px-4 py-3 text-white font-medium truncate max-w-[120px]">{req.user.fullName}</td>
                      <td className="px-4 py-3 text-emerald-450 font-semibold">{Number(req.amount).toLocaleString('vi-VN')} VND</td>
                      <td className="px-4 py-3 truncate max-w-[100px]">{req.bankName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                          req.status === 'PENDING' ? 'bg-amber-950/40 text-amber-300 border-amber-800/40' :
                          req.status === 'APPROVED' || req.status === 'PAID' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' :
                          'bg-red-950/40 text-red-300 border-red-850/40'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
