import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import {
  Briefcase, Clock, CheckCircle2, Users, TrendingUp,
  MapPin, Star, Zap, CircleDollarSign, AlertCircle,
  Activity as ActivityIcon, XCircle, Search, RefreshCw,
  Check, X, ArrowRight, Sparkles, Filter, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { activityService } from '../../services/activityService';
import { applicationService } from '../../services/applicationService';
import { ActivityItem, ActivitySummary } from '../../types/activity';

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + '₫';
}

const POSTED_FILTERS = [
  { key: 'ALL', label: 'Tất cả', icon: '⚡' },
  { key: 'OPEN', label: '🟢 Đang tuyển', icon: '🟢' },
  { key: 'IN_PROGRESS', label: '🔵 Đang làm', icon: '🔵' },
  { key: 'COMPLETED', label: '🟣 Hoàn thành', icon: '🟣' },
  { key: 'CANCELLED', label: '🔴 Đã hủy', icon: '🔴' },
];

const PARTICIPATING_FILTERS = [
  { key: 'ALL', label: 'Tất cả', icon: '⚡' },
  { key: 'PENDING', label: '⏳ Chờ duyệt', icon: '⏳' },
  { key: 'ACCEPTED', label: '✅ Đã chọn', icon: '✅' },
  { key: 'IN_PROGRESS', label: '🔵 Đang làm', icon: '🔵' },
  { key: 'COMPLETED', label: '🟣 Hoàn thành', icon: '🟣' },
  { key: 'ENDED', label: '🔴 Kết thúc', icon: '🔴' },
];

export default function Activity() {
  const { currentUser, firebaseUser } = useApp();
  const [view, setView] = useState<'POSTED' | 'PARTICIPATING'>(
    currentUser.role === 'worker' ? 'PARTICIPATING' : 'POSTED'
  );
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadActivities = useCallback(async () => {
    if (!firebaseUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [actRes, sumRes] = await Promise.all([
        activityService.getActivities({
          view,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          search: searchTerm ? searchTerm : undefined,
          limit: 30,
        }),
        activityService.getActivitySummary().catch(() => null),
      ]);

      setActivities(actRes.data || []);
      if (sumRes) setSummary(sumRes);
    } catch (err: any) {
      console.error('Error loading activities:', err);
      setError(err.response?.data?.message || 'Không thể tải lịch sử hoạt động.');
    } finally {
      setLoading(false);
    }
  }, [view, statusFilter, searchTerm, firebaseUser]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleAcceptAssignment = async (assignmentId: string) => {
    setActionLoading(assignmentId);
    try {
      await applicationService.acceptAssignment(assignmentId);
      await loadActivities();
    } catch (err) {
      console.error('Error accepting assignment:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineAssignment = async (assignmentId: string) => {
    setActionLoading(assignmentId);
    try {
      await applicationService.declineAssignment(assignmentId);
      await loadActivities();
    } catch (err) {
      console.error('Error declining assignment:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteAssignment = async (assignmentId: string) => {
    setActionLoading(assignmentId);
    try {
      await applicationService.completeAssignment(assignmentId);
      await loadActivities();
    } catch (err) {
      console.error('Error completing assignment:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const activeFilters = view === 'POSTED' ? POSTED_FILTERS : PARTICIPATING_FILTERS;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8 pb-28 min-h-screen">
      {/* ── HEADER TITLE & STATS SUMMARY ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-extrabold mb-2">
            <ActivityIcon className="w-3.5 h-3.5" />
            <span>Theo dõi tiến độ</span>
          </div>
          <h1 className="text-gray-950 font-black text-2xl md:text-3xl">Lịch sử & Hoạt động</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5">Quản lý các công việc bạn đã đăng hoặc đang tham gia ứng tuyển</p>
        </div>

        {/* View Switcher: POSTED vs PARTICIPATING (Matching Mobile) */}
        <div className="flex items-center bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm self-start md:self-auto">
          <button
            onClick={() => { setView('POSTED'); setStatusFilter('ALL'); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              view === 'POSTED'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            💼 Việc đã đăng {summary?.posted?.total ? `(${summary.posted.total})` : ''}
          </button>
          <button
            onClick={() => { setView('PARTICIPATING'); setStatusFilter('ALL'); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              view === 'PARTICIPATING'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🛠️ Việc đang làm {summary?.participating?.total ? `(${summary.participating.total})` : ''}
          </button>
        </div>
      </div>

      {/* ── KPI STATS CARDS ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-8">
          <div className="bg-white p-4 rounded-3xl border border-gray-200/80 shadow-sm">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">TỔNG CÔNG VIỆC</p>
            <p className="text-2xl font-black text-gray-950">
              {view === 'POSTED' ? summary.posted.total : summary.participating.total}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">Trong toàn bộ lịch sử</p>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-200/80 shadow-sm">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">ĐANG DIỄN RA</p>
            <p className="text-2xl font-black text-blue-600">
              {view === 'POSTED' ? summary.posted.inProgress : summary.participating.inProgress}
            </p>
            <p className="text-[11px] text-blue-600 font-semibold mt-0.5">Đang làm việc</p>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-200/80 shadow-sm">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">HOÀN TẤT</p>
            <p className="text-2xl font-black text-emerald-600">
              {view === 'POSTED' ? summary.posted.completed : summary.participating.completed}
            </p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Thành công</p>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-200/80 shadow-sm">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">TỶ LỆ HOÀN THÀNH</p>
            <p className="text-2xl font-black text-orange-600">100%</p>
            <p className="text-[11px] text-orange-600 font-semibold mt-0.5">Độ tin cậy</p>
          </div>
        </div>
      )}

      {/* ── TOOLBAR: STATUS CHIPS & SEARCH ── */}
      <div className="bg-white rounded-3xl p-4 md:p-5 border border-gray-200/80 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {activeFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                statusFilter === f.key
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên công việc..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* ── ACTIVITIES LIST ── */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500">Đang tải hoạt động...</p>
        </div>
      ) : activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map(item => {
            const task = item.post || (item as any);
            const taskId = task.id || item.id;
            const taskTitle = task.title || 'Công việc không tên';
            const categoryName = task.categoryName || task.field?.name || 'Dịch vụ';
            const categoryIcon = task.categoryIcon || '⚡';
            const budgetMin = task.budgetMin || 0;
            const budgetMax = task.budgetMax || budgetMin;
            const status = task.status || item.participation?.status || 'OPEN';

            const statusText =
              status === 'COMPLETED' ? 'Hoàn thành' :
              status === 'IN_PROGRESS' ? 'Đang thực hiện' :
              status === 'ACCEPTED' ? 'Đã được chọn' :
              status === 'PENDING' ? 'Chờ duyệt' :
              status === 'OPEN' ? 'Đang tuyển' :
              status === 'CANCELLED' || status === 'REJECTED' ? 'Đã hủy' : status;

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-5 md:p-6 border border-gray-200/80 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Task Details */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-2xl flex-shrink-0 border border-orange-100">
                    {categoryIcon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-md">
                        {categoryName}
                      </span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        status === 'OPEN' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        status === 'ACCEPTED' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {statusText}
                      </span>
                    </div>

                    <Link
                      to={`/job/${taskId}`}
                      className="font-extrabold text-gray-950 text-base hover:text-orange-600 transition line-clamp-1"
                    >
                      {taskTitle}
                    </Link>

                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                      <span className="font-extrabold text-orange-600">
                        {fmt(budgetMin)} {budgetMin !== budgetMax && `– ${fmt(budgetMax)}`}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {new Date(task.updatedAt || task.createdAt || Date.now()).toLocaleDateString('vi-VN')}
                      </span>
                      {task.locations && task.locations[0]?.address && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[200px]">{task.locations[0].address}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Assignment Actions & Navigation */}
                <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                  {item.participation?.status === 'ASSIGNED' && view === 'PARTICIPATING' && item.participation?.id && (
                    <>
                      <button
                        onClick={() => handleAcceptAssignment(item.participation!.id)}
                        disabled={actionLoading === item.participation?.id}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition shadow flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Chấp nhận
                      </button>
                      <button
                        onClick={() => handleDeclineAssignment(item.participation!.id)}
                        disabled={actionLoading === item.participation?.id}
                        className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition"
                      >
                        Từ chối
                      </button>
                    </>
                  )}

                  {item.participation?.status === 'IN_PROGRESS' && view === 'PARTICIPATING' && item.participation?.id && (
                    <button
                      onClick={() => handleCompleteAssignment(item.participation!.id)}
                      disabled={actionLoading === item.participation?.id}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow"
                    >
                      Báo cáo hoàn tất
                    </button>
                  )}

                  <Link
                    to={`/job/${taskId}`}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition"
                  >
                    <span>Chi tiết</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-200/80 shadow-sm max-w-md mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center text-3xl mx-auto mb-3">
            📋
          </div>
          <h3 className="text-gray-950 font-bold text-base mb-1">Chưa có hoạt động nào</h3>
          <p className="text-gray-500 text-xs mb-4">
            {view === 'POSTED'
              ? 'Bạn chưa có bài đăng nào trong trạng thái này.'
              : 'Bạn chưa tham gia ứng tuyển công việc nào.'}
          </p>
          <Link
            to={view === 'POSTED' ? '/post' : '/'}
            className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition"
          >
            {view === 'POSTED' ? '+ Đăng việc mới' : '🔍 Khám phá việc làm'}
          </Link>
        </div>
      )}
    </div>
  );
}
