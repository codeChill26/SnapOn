import React from 'react';
import { prisma } from '@/lib/prisma';
import KpiOverviewGrid, { KpiData } from '@/components/dashboard/KpiOverviewGrid';
import GrowthAnalyticsCharts, { RawRecord } from '@/components/dashboard/GrowthAnalyticsCharts';
import FinancialLedgerPanel from '@/components/dashboard/FinancialLedgerPanel';
import WalletLedgerPanel, { UserWalletLedgerItem } from '@/components/dashboard/WalletLedgerPanel';
import { RawEscrowItem } from '@/lib/financial-math';
import PlatformHealthPanel from '@/components/dashboard/PlatformHealthPanel';
import RecentActivityTables from '@/components/dashboard/RecentActivityTables';
import TopStatisticsPanel from '@/components/dashboard/TopStatisticsPanel';
import QuickActionsGrid from '@/components/dashboard/QuickActionsGrid';
import SystemAlertsPanel from '@/components/dashboard/SystemAlertsPanel';
import { ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Fallback defaults
  let kpiData: KpiData = {
    userCount: 0,
    activeUserCount: 0,
    bannedUserCount: 0,
    newUsersTodayCount: 0,
    taskCount: 0,
    openTaskCount: 0,
    inProgressTaskCount: 0,
    completedTaskCount: 0,
    categoryCount: 0,
    pendingPayoutCount: 0,
    approvedPayoutCount: 0,
    openReportCount: 0,
    pendingDeletionCount: 0,
    totalEscrowAmount: 0,
    totalPaidOutAmount: 0,
  };

  let recentTasks: any[] = [];
  let recentPayouts: any[] = [];
  let recentUsers: any[] = [];
  let topPosters: any[] = [];
  let topCategories: any[] = [];
  let newestMembers: any[] = [];
  let rawUserRecords: RawRecord[] = [];
  let rawTaskRecords: RawRecord[] = [];
  let rawWithdrawRecords: RawRecord[] = [];
  let escrowLedger: RawEscrowItem[] = [];
  let userWalletLedger: UserWalletLedgerItem[] = [];

  let dbStatus: 'connected' | 'error' = 'connected';
  let dbErrorMessage: string | null = null;

  try {
    const [
      userCount,
      activeUserCount,
      bannedUserCount,
      newUsersTodayCount,
      taskCount,
      openTaskCount,
      inProgressTaskCount,
      completedTaskCount,
      categoryCount,
      pendingPayoutCount,
      approvedPayoutCount,
      openReportCount,
      pendingDeletionCount,
      escrowSum,
      withdrawSum,
      fetchedRecentTasks,
      fetchedRecentPayouts,
      fetchedRecentUsers,
      fetchedTopPosters,
      fetchedTopCategories,
      fetchedNewestMembers,
      fetchedRawUsers,
      fetchedRawTasks,
      fetchedRawWithdraws,
      fetchedEscrows,
      fetchedUserWallets,
    ] = await Promise.all([
      // 1. KPI Counts
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'BANNED' } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),

      prisma.task.count(),
      prisma.task.count({ where: { status: 'OPEN' } }),
      prisma.task.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { status: 'COMPLETED' } }),

      prisma.category.count(),
      prisma.withdrawRequest.count({ where: { status: 'PENDING' } }),
      prisma.withdrawRequest.count({ where: { status: { in: ['APPROVED', 'PAID'] } } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.accountDeletionRequest.count({ where: { status: 'PENDING' } }),

      // 2. Financial Volume Aggregations
      prisma.escrow.aggregate({ _sum: { amount: true } }),
      prisma.withdrawRequest.aggregate({
        where: { status: { in: ['APPROVED', 'PAID'] } },
        _sum: { amount: true },
      }),

      // 3. Recent Activity Feeds
      prisma.task.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          poster: { select: { fullName: true } },
          category: { select: { name: true } },
        },
      }),
      prisma.withdrawRequest.findMany({
        take: 5,
        orderBy: { status: 'asc' },
        include: {
          user: { select: { fullName: true } },
        },
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          status: true,
          role: true,
          createdAt: true,
        },
      }),

      // 4. Top Statistics
      prisma.user.findMany({
        take: 5,
        orderBy: {
          postedTasks: { _count: 'desc' },
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          _count: { select: { postedTasks: true } },
        },
      }),
      prisma.category.findMany({
        take: 5,
        orderBy: {
          tasks: { _count: 'desc' },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { tasks: true } },
        },
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),

      // 5. Raw Timestamp Records for Time-Series Analytics & Comparisons
      prisma.user.findMany({
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
      prisma.task.findMany({
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
      prisma.withdrawRequest.findMany({
        select: { id: true, user: { select: { createdAt: true } } },
        take: 2000,
      }),

      // 6. Full Escrow Ledger Records for Cash Flow & 8% Revenue Schema Table
      prisma.escrow.findMany({
        take: 200,
        orderBy: { id: 'desc' },
        include: {
          poster: { select: { fullName: true, email: true } },
          tasker: { select: { fullName: true, email: true } },
          task: { select: { title: true, createdAt: true, updatedAt: true } },
        },
      }),

      // 7. User Wallets & PayOS Deposits Ledger Table
      prisma.wallet.findMany({
        take: 200,
        orderBy: { balance: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, role: true } },
          transactions: {
            orderBy: { created_at: 'desc' },
            take: 50,
          },
        },
      }),
    ]);

    // Populate KPI Data
    kpiData = {
      userCount,
      activeUserCount,
      bannedUserCount,
      newUsersTodayCount,
      taskCount,
      openTaskCount,
      inProgressTaskCount,
      completedTaskCount,
      categoryCount,
      pendingPayoutCount,
      approvedPayoutCount,
      openReportCount,
      pendingDeletionCount,
      totalEscrowAmount: Number(escrowSum._sum.amount || 0),
      totalPaidOutAmount: Number(withdrawSum._sum.amount || 0),
    };

    recentTasks = fetchedRecentTasks;
    recentPayouts = fetchedRecentPayouts;
    recentUsers = fetchedRecentUsers;

    topPosters = fetchedTopPosters.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      email: p.email,
      taskCount: p._count.postedTasks,
    }));

    topCategories = fetchedTopCategories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      taskCount: c._count.tasks,
    }));

    newestMembers = fetchedNewestMembers;

    rawUserRecords = fetchedRawUsers;
    rawTaskRecords = fetchedRawTasks;
    rawWithdrawRecords = fetchedRawWithdraws.map((w) => ({
      createdAt: w.user?.createdAt || now,
    }));

    escrowLedger = fetchedEscrows.map((e) => ({
      id: e.id,
      taskId: e.taskId,
      posterName: e.poster?.fullName || 'N/A',
      posterEmail: e.poster?.email || 'N/A',
      taskerName: e.tasker?.fullName || 'N/A',
      taskerEmail: e.tasker?.email || 'N/A',
      taskTitle: e.task?.title || 'Công việc không tên',
      amount: Number(e.amount || 0),
      platformFeeAmount: Number(e.platformFeeAmount || 0),
      insuranceFeeAmount: Number(e.insuranceFeeAmount || 0),
      status: e.status as 'HOLDING' | 'RELEASED' | 'REFUNDED',
      createdAt: e.task?.createdAt,
      updatedAt: e.task?.updatedAt,
    }));

    userWalletLedger = fetchedUserWallets.map((w) => {
      const depositTx = w.transactions.find((tx) => tx.type === 'DEPOSIT') || w.transactions[0];
      return {
        userId: w.userId,
        fullName: w.user?.fullName || 'N/A',
        email: w.user?.email || 'N/A',
        phone: w.user?.phone || null,
        avatarUrl: w.user?.avatarUrl || null,
        role: w.user?.role || 'USER',
        balance: Number(w.balance || 0),
        availableBalance: Number(w.availableBalance || 0),
        lockedBalance: Number(w.lockedBalance || 0),
        lastDepositAmount: Number(depositTx?.amount || 0),
        lastDepositOrderCode: depositTx?.order_code ? depositTx.order_code.toString() : null,
        lastDepositAt: depositTx?.created_at || null,
        transactions: w.transactions.map((tx) => ({
          id: tx.id,
          type: tx.type,
          amount: Number(tx.amount || 0),
          status: tx.status,
          order_code: tx.order_code ? tx.order_code.toString() : null,
          created_at: tx.created_at,
        })),
      };
    });

  } catch (error: any) {
    console.error('Failed to load dashboard data:', error);
    dbStatus = 'error';
    dbErrorMessage = error?.message || 'Database connection error';
  }

  return (
    <div className="space-y-8 bg-[#FAFAFA] text-[#18181B] min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E4E7] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#18181B]">Management Console</h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#312F2C] text-white shadow-xs">
              <ShieldCheck className="h-3.5 w-3.5" /> Live Production
            </span>
          </div>
          <p className="text-[#71717A] text-sm mt-1 font-medium">
            Real-time platform statistics, nested growth analytics, and system health status.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#71717A]">
          <span className="bg-white border border-[#E4E4E7] px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-2xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Last synced: {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Database Error Banner */}
      {dbStatus === 'error' && (
        <div className="rounded-2xl border border-rose-800/60 bg-rose-950/40 p-5 text-rose-300 text-sm space-y-2 shadow-xl">
          <p className="font-bold flex items-center gap-2 text-base text-rose-200">
            ⚠️ Database Connection Warning
          </p>
          <p className="text-xs text-rose-300/90 leading-relaxed">
            Could not fetch dynamic metrics from PostgreSQL database. Details: <code className="bg-rose-900/60 px-1.5 py-0.5 rounded text-rose-100 font-mono text-[11px]">{dbErrorMessage}</code>.
            Please ensure <code className="bg-rose-900/60 px-1 py-0.5 rounded text-rose-200">DATABASE_URL</code> is properly configured in Vercel Environment Variables.
          </p>
        </div>
      )}

      {/* Action Alerts */}
      <SystemAlertsPanel
        pendingPayouts={kpiData.pendingPayoutCount}
        pendingReports={kpiData.openReportCount}
        pendingDeletions={kpiData.pendingDeletionCount}
      />

      {/* SECTION 1: KPI Overview Grid */}
      <KpiOverviewGrid data={kpiData} />

      {/* SECTION 2: Full-Width Nested Growth Analytics Chart */}
      <GrowthAnalyticsCharts
        userRecords={rawUserRecords}
        taskRecords={rawTaskRecords}
        withdrawRecords={rawWithdrawRecords}
      />

      {/* SECTION 3: Excel Schema Cash Flow & 8% Platform Revenue Financial Ledger Table */}
      <FinancialLedgerPanel escrows={escrowLedger} />

      {/* SECTION 4: Excel Schema User Wallets & PayOS Deposits Ledger Table */}
      <WalletLedgerPanel walletItems={userWalletLedger} />

      {/* SECTION 5: Health Status & Top Statistics */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <PlatformHealthPanel
            pendingPayouts={kpiData.pendingPayoutCount}
            pendingReports={kpiData.openReportCount}
            pendingDeletions={kpiData.pendingDeletionCount}
            dbStatus={dbStatus}
          />
        </div>
        <div className="lg:col-span-2">
          <TopStatisticsPanel
            topPosters={topPosters}
            topCategories={topCategories}
            newestMembers={newestMembers}
          />
        </div>
      </div>

      {/* SECTION 6: Recent Activity Tables */}
      <RecentActivityTables
        recentTasks={recentTasks}
        recentPayouts={recentPayouts}
        recentUsers={recentUsers}
      />

      {/* SECTION 7: Quick Management Console Cards */}
      <QuickActionsGrid />
    </div>
  );
}
