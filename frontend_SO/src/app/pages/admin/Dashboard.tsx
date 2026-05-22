import { useApp } from '../../context/AppContext';
import { Briefcase, Users, TrendingUp, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card } from '../../components/ui/card';

export default function Dashboard() {
  const { jobs, workers } = useApp();

  // Calculate metrics
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(j => j.status === 'active').length;
  const matchedJobs = jobs.filter(j => j.status === 'matched').length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const expiredJobs = jobs.filter(j => j.status === 'expired').length;
  
  const totalWorkers = workers.length;
  const avgWorkerRating = workers.reduce((acc, w) => acc + w.rating, 0) / workers.length;
  const totalCompletedJobsByWorkers = workers.reduce((acc, w) => acc + w.completedJobs, 0);
  
  const totalRevenue = jobs
    .filter(j => j.status === 'completed' || j.status === 'matched')
    .reduce((acc, j) => acc + j.price, 0);
  
  const avgJobPrice = totalJobs > 0 ? jobs.reduce((acc, j) => acc + j.price, 0) / totalJobs : 0;

  // Jobs by status data
  const jobStatusData = [
    { name: 'Active', value: activeJobs, color: '#3b82f6' },
    { name: 'Matched', value: matchedJobs, color: '#10b981' },
    { name: 'Completed', value: completedJobs, color: '#8b5cf6' },
    { name: 'Expired', value: expiredJobs, color: '#ef4444' },
  ];

  // Jobs by category
  const categoryCount: { [key: string]: number } = {};
  jobs.forEach(j => {
    categoryCount[j.category] = (categoryCount[j.category] || 0) + 1;
  });
  const categoryData = Object.entries(categoryCount).map(([name, value]) => ({ name, value }));

  // Revenue trend (mock data - in real app would be time-series)
  const revenueTrendData = [
    { day: 'Mon', revenue: 1200000, jobs: 8 },
    { day: 'Tue', revenue: 1500000, jobs: 10 },
    { day: 'Wed', revenue: 1100000, jobs: 7 },
    { day: 'Thu', revenue: 1800000, jobs: 12 },
    { day: 'Fri', revenue: 2100000, jobs: 14 },
    { day: 'Sat', revenue: 2500000, jobs: 16 },
    { day: 'Sun', revenue: 1900000, jobs: 13 },
  ];

  // Applications trend
  const applicationsTrendData = [
    { hour: '8h', applications: 12 },
    { hour: '10h', applications: 18 },
    { hour: '12h', applications: 25 },
    { hour: '14h', applications: 30 },
    { hour: '16h', applications: 22 },
    { hour: '18h', applications: 28 },
    { hour: '20h', applications: 15 },
  ];

  const stats = [
    {
      label: 'Tổng Jobs',
      value: totalJobs,
      icon: Briefcase,
      color: 'from-blue-500 to-cyan-500',
      iconBg: 'bg-blue-500/20',
      trend: '+12%',
    },
    {
      label: 'Jobs Đang Active',
      value: activeJobs,
      icon: Clock,
      color: 'from-orange-500 to-yellow-500',
      iconBg: 'bg-orange-500/20',
      trend: '+8%',
    },
    {
      label: 'Tổng Workers',
      value: totalWorkers,
      icon: Users,
      color: 'from-purple-500 to-pink-500',
      iconBg: 'bg-purple-500/20',
      trend: '+24%',
    },
    {
      label: 'Doanh Thu',
      value: `${(totalRevenue / 1000000).toFixed(1)}M`,
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500',
      iconBg: 'bg-green-500/20',
      trend: '+18%',
    },
  ];

  const formatCurrency = (value: number) => {
    return `${(value / 1000).toFixed(0)}k`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard Tổng Quan</h1>
          <p className="text-gray-400">Theo dõi hiệu suất và thống kê hệ thống SnapOn</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <Clock className="w-4 h-4" />
          <span>Cập nhật lúc: {new Date().toLocaleString('vi-VN')}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
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
                <span className="text-green-400 text-sm font-medium">{stat.trend}</span>
              </div>
              <div className="space-y-1">
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <p className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Xu Hướng Doanh Thu
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueTrendData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" tickFormatter={formatCurrency} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#f3f4f6' }}
                formatter={(value: number) => [`${formatCurrency(value)} VNĐ`, 'Doanh thu']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Job Status Distribution */}
        <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-purple-500" />
            Phân Bố Trạng Thái Jobs
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={jobStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {jobStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Legend
                wrapperStyle={{ color: '#f3f4f6' }}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jobs by Category */}
        <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-500" />
            Jobs Theo Danh Mục
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Applications Trend */}
        <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-pink-500" />
            Lượt Apply Theo Giờ
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={applicationsTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="hour" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Line type="monotone" dataKey="applications" stroke="#ec4899" strokeWidth={3} dot={{ fill: '#ec4899', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl border-blue-500/20 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-blue-500/20 p-3 rounded-xl">
              <CheckCircle className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <h4 className="text-gray-300 text-sm mb-2">Tỷ Lệ Hoàn Thành</h4>
          <p className="text-3xl font-bold text-white mb-1">
            {totalJobs > 0 ? ((completedJobs / totalJobs) * 100).toFixed(1) : 0}%
          </p>
          <p className="text-blue-400 text-sm">{completedJobs} / {totalJobs} jobs</p>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl border-purple-500/20 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-purple-500/20 p-3 rounded-xl">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <h4 className="text-gray-300 text-sm mb-2">Đánh Giá TB Workers</h4>
          <p className="text-3xl font-bold text-white mb-1">{avgWorkerRating.toFixed(1)}</p>
          <p className="text-purple-400 text-sm">⭐ {totalCompletedJobsByWorkers} jobs hoàn thành</p>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl border-green-500/20 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-green-500/20 p-3 rounded-xl">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <h4 className="text-gray-300 text-sm mb-2">Giá TB Mỗi Job</h4>
          <p className="text-3xl font-bold text-white mb-1">{(avgJobPrice / 1000).toFixed(0)}k</p>
          <p className="text-green-400 text-sm">VNĐ / công việc</p>
        </Card>
      </div>
    </div>
  );
}