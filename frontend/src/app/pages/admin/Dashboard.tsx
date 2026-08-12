import { useEffect, useState } from 'react';
import {
  Briefcase, Users, TrendingUp, DollarSign, Clock, CheckCircle,
  XCircle, AlertCircle, RefreshCw, FileText, Star,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Card } from '../../components/ui/card';
import api from '../../../services/api';

interface AdminStats {
  users: {
    total: number;
    newThisMonth: number;
    newThisWeek: number;
    verified: number;
  };
  tasks: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    recruitment: number;
    serviceOffer: number;
    newThisMonth: number;
    newThisWeek: number;
  };
  applications: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    withdrawn: number;
  };
  assignments: {
    total: number;
    completed: number;
    cancelled: number;
    inProgress: number;
    assigned: number;
  };
  escrow: {
    totalVolume: number;
    releasedVolume: number;
    holdingVolume: number;
    refundedVolume: number;
  };
  wallet: {
    totalBalance: number;
    walletCount: number;
  };
  tasksByCategory: { name: string; slug: string; count: number }[];
  tasksByDay: { date: string; count: number; completed: number }[];
  topUsers: {
    id: string;
    name: string;
    avatarUrl: string;
    email: string;
    joinedAt: string;
    postCount: number;
    completedCount: number;
  }[];
}

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

export default function Dashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/stats');
      if (res.data.success) {
        setStats(res.data.data);
        setLastUpdated(new Date());
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400">Đang tải dữ liệu thống kê...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-red-400 text-lg font-semibold">{error || 'Không có dữ liệu'}</p>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Thử lại
        </button>
      </div>
    );
  }

  const completionRate = stats.tasks.total > 0
    ? ((stats.tasks.completed / stats.tasks.total) * 100).toFixed(1)
    : '0.0';

  const taskStatusData = [
    { name: 'Đang mở', value: stats.tasks.open, color: '#3b82f6' },
    { name: 'Đang làm', value: stats.tasks.inProgress, color: '#f59e0b' },
    { name: 'Hoàn thành', value: stats.tasks.completed, color: '#10b981' },
    { name: 'Đã hủy', value: stats.tasks.cancelled, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const topStatCards = [
    {
      label: 'Tổng người dùng',
      value: stats.users.total,
      sub: `+${stats.users.newThisWeek} tuần này`,
      icon: Users,
      color: 'from-purple-500 to-pink-500',
      iconBg: 'bg-purple-500/20',
    },
    {
      label: 'Tổng bài đăng',
      value: stats.tasks.total,
      sub: `+${stats.tasks.newThisWeek} tuần này`,
      icon: Briefcase,
      color: 'from-blue-500 to-cyan-500',
      iconBg: 'bg-blue-500/20',
    },
    {
      label: 'Task được nhận',
      value: stats.tasks.inProgress + stats.tasks.completed,
      sub: `${stats.tasks.inProgress} đang thực hiện`,
      icon: Clock,
      color: 'from-orange-500 to-yellow-500',
      iconBg: 'bg-orange-500/20',
    },
    {
      label: 'Task hoàn thành',
      value: stats.tasks.completed,
      sub: `${completionRate}% tỷ lệ hoàn thành`,
      icon: CheckCircle,
      color: 'from-green-500 to-emerald-500',
      iconBg: 'bg-green-500/20',
    },
  ];

  const chartData = stats.tasksByDay.map(d => ({
    date: formatDate(d.date),
    'Bài đăng': d.count,
    'Hoàn thành': d.completed,
  }));

  const categoryData = stats.tasksByCategory
    .filter(c => c.count > 0)
    .slice(0, 8)
    .map(c => ({ name: c.name, value: c.count }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard Tổng Quan</h1>
          <p className="text-gray-400">Theo dõi hiệu suất và thống kê hệ thống SnapOn</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Cập nhật: {lastUpdated.toLocaleTimeString('vi-VN')}</span>
          </div>
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Làm mới
          </button>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {topStatCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all hover:scale-105"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`${stat.iconBg} p-3 rounded-xl`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <p className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value.toLocaleString('vi-VN')}
                </p>
                <p className="text-gray-500 text-xs">{stat.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Trend (30 days) */}
        <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Xu hướng bài đăng (30 ngày)
          </h3>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">Chưa có dữ liệu</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Legend wrapperStyle={{ color: '#d1d5db', fontSize: 12 }} />
                <Area type="monotone" dataKey="Bài đăng" stroke="#3b82f6" fill="url(#colorPosts)" strokeWidth={2} />
                <Area type="monotone" dataKey="Hoàn thành" stroke="#10b981" fill="url(#colorCompleted)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Task Status Pie */}
        <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-purple-500" />
            Phân bố trạng thái bài đăng
          </h3>
          {taskStatusData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">Chưa có dữ liệu</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={taskStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f3f4f6' }}
                  formatter={(value: number, name: string) => [value.toLocaleString('vi-VN'), name]}
                />
                <Legend wrapperStyle={{ color: '#d1d5db', fontSize: 12 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks by Category */}
        <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-500" />
            Bài đăng theo danh mục
          </h3>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">Chưa có dữ liệu</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#9ca3af"
                  tick={{ fontSize: 11 }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f3f4f6' }}
                  formatter={(value: number) => [value.toLocaleString('vi-VN'), 'Bài đăng']}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Applications trend */}
        <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-pink-500" />
            Thống kê ứng tuyển
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Tổng đơn ứng tuyển', value: stats.applications.total, color: 'bg-blue-500', pct: 100 },
              { label: 'Đang chờ duyệt', value: stats.applications.pending, color: 'bg-yellow-500',
                pct: stats.applications.total > 0 ? (stats.applications.pending / stats.applications.total) * 100 : 0 },
              { label: 'Được chấp nhận', value: stats.applications.accepted, color: 'bg-green-500',
                pct: stats.applications.total > 0 ? (stats.applications.accepted / stats.applications.total) * 100 : 0 },
              { label: 'Bị từ chối', value: stats.applications.rejected, color: 'bg-red-500',
                pct: stats.applications.total > 0 ? (stats.applications.rejected / stats.applications.total) * 100 : 0 },
              { label: 'Đã rút', value: stats.applications.withdrawn, color: 'bg-gray-500',
                pct: stats.applications.total > 0 ? (stats.applications.withdrawn / stats.applications.total) * 100 : 0 },
            ].map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">{item.label}</span>
                  <span className="text-white font-semibold">{item.value.toLocaleString('vi-VN')}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all`}
                    style={{ width: `${Math.min(item.pct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl border-blue-500/20 p-6">
          <div className="bg-blue-500/20 p-3 rounded-xl w-fit mb-4">
            <CheckCircle className="w-6 h-6 text-blue-400" />
          </div>
          <h4 className="text-gray-300 text-sm mb-2">Tỷ lệ hoàn thành</h4>
          <p className="text-3xl font-bold text-white mb-1">{completionRate}%</p>
          <p className="text-blue-400 text-sm">
            {stats.tasks.completed.toLocaleString('vi-VN')} / {stats.tasks.total.toLocaleString('vi-VN')} bài đăng
          </p>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-xl border-yellow-500/20 p-6">
          <div className="bg-yellow-500/20 p-3 rounded-xl w-fit mb-4">
            <DollarSign className="w-6 h-6 text-yellow-400" />
          </div>
          <h4 className="text-gray-300 text-sm mb-2">Tổng giá trị Escrow</h4>
          <p className="text-3xl font-bold text-white mb-1">
            {formatCurrency(stats.escrow.totalVolume)} ₫
          </p>
          <div className="flex gap-3 text-xs mt-2">
            <span className="text-green-400">✓ Đã giải phóng: {formatCurrency(stats.escrow.releasedVolume)}₫</span>
          </div>
          <div className="flex gap-3 text-xs mt-1">
            <span className="text-yellow-400">⏳ Đang giữ: {formatCurrency(stats.escrow.holdingVolume)}₫</span>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl border-green-500/20 p-6">
          <div className="bg-green-500/20 p-3 rounded-xl w-fit mb-4">
            <Users className="w-6 h-6 text-green-400" />
          </div>
          <h4 className="text-gray-300 text-sm mb-2">Người dùng mới</h4>
          <p className="text-3xl font-bold text-white mb-1">
            +{stats.users.newThisMonth.toLocaleString('vi-VN')}
          </p>
          <p className="text-green-400 text-sm">
            tháng này · {stats.users.verified.toLocaleString('vi-VN')} đã xác thực
          </p>
        </Card>
      </div>

      {/* Top Users Table */}
      <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10 p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          Top người dùng hoạt động
        </h3>
        {stats.topUsers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Chưa có dữ liệu</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-white/10">
                  <th className="text-left pb-3 font-medium">#</th>
                  <th className="text-left pb-3 font-medium">Người dùng</th>
                  <th className="text-left pb-3 font-medium">Email</th>
                  <th className="text-right pb-3 font-medium">Bài đăng</th>
                  <th className="text-right pb-3 font-medium">Hoàn thành</th>
                  <th className="text-right pb-3 font-medium">Ngày tham gia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stats.topUsers.map((user, index) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 text-gray-500 font-medium">{index + 1}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                            {user.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                        <span className="text-white font-medium">{user.name || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 text-gray-400">{user.email || '—'}</td>
                    <td className="py-3 text-right">
                      <span className="text-blue-400 font-semibold">{user.postCount}</span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-green-400 font-semibold">{user.completedCount}</span>
                    </td>
                    <td className="py-3 text-right text-gray-400">
                      {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Assignment Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tổng Assignment', value: stats.assignments.total, color: 'text-blue-400', icon: Briefcase },
          { label: 'Đang thực hiện', value: stats.assignments.inProgress, color: 'text-yellow-400', icon: Clock },
          { label: 'Hoàn thành', value: stats.assignments.completed, color: 'text-green-400', icon: CheckCircle },
          { label: 'Đã hủy', value: stats.assignments.cancelled, color: 'text-red-400', icon: XCircle },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <Card key={i} className="bg-slate-800/50 backdrop-blur-xl border-white/10 p-5 text-center">
              <Icon className={`w-6 h-6 ${item.color} mx-auto mb-2`} />
              <p className={`text-2xl font-bold ${item.color}`}>{item.value.toLocaleString('vi-VN')}</p>
              <p className="text-gray-400 text-xs mt-1">{item.label}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
