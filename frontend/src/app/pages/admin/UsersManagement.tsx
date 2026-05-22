import { useApp, MOCK_WORKERS } from '../../context/AppContext';
import { useState, useMemo } from 'react';
import { Search, Filter, Star, Briefcase, MapPin, Eye, UserCircle, Users as UsersIcon } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import type { Worker } from '../../context/AppContext';

interface Hirer {
  id: string;
  name: string;
  avatar: string;
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  totalSpent: number;
  avgRating: number;
  joinedAt: number;
}

export default function UsersManagement() {
  const { jobs } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'worker' | 'hirer'>('all');
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [selectedHirer, setSelectedHirer] = useState<Hirer | null>(null);

  // Generate hirers from jobs data
  const hirers = useMemo(() => {
    const hirerMap = new Map<string, Hirer>();
    
    jobs.forEach(job => {
      const hirerId = job.hirerName;
      if (!hirerMap.has(hirerId)) {
        hirerMap.set(hirerId, {
          id: hirerId,
          name: job.hirerName,
          avatar: job.hirerAvatar,
          totalJobs: 0,
          activeJobs: 0,
          completedJobs: 0,
          totalSpent: 0,
          avgRating: 4.5 + Math.random() * 0.5, // Mock rating
          joinedAt: Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000, // Random date in last 90 days
        });
      }
      
      const hirer = hirerMap.get(hirerId)!;
      hirer.totalJobs++;
      if (job.status === 'active') hirer.activeJobs++;
      if (job.status === 'completed') {
        hirer.completedJobs++;
        hirer.totalSpent += job.price;
      }
    });
    
    return Array.from(hirerMap.values());
  }, [jobs]);

  // Filter workers
  const filteredWorkers = useMemo(() => {
    return MOCK_WORKERS.filter(worker => {
      const matchesSearch = 
        worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesSearch;
    });
  }, [searchTerm]);

  // Filter hirers
  const filteredHirers = useMemo(() => {
    return hirers.filter(hirer => {
      return hirer.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [hirers, searchTerm]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Quản Lý Users</h1>
        <p className="text-gray-400">Quản lý Workers và Hirers trong hệ thống</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl border-purple-500/20 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-purple-500/20 p-3 rounded-xl">
              <UsersIcon className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <h4 className="text-gray-300 text-sm mb-2">Tổng Workers</h4>
          <p className="text-3xl font-bold text-white mb-1">{MOCK_WORKERS.length}</p>
          <p className="text-purple-400 text-sm">Người lao động đang hoạt động</p>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl border-blue-500/20 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-blue-500/20 p-3 rounded-xl">
              <UserCircle className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <h4 className="text-gray-300 text-sm mb-2">Tổng Hirers</h4>
          <p className="text-3xl font-bold text-white mb-1">{hirers.length}</p>
          <p className="text-blue-400 text-sm">Người thuê đã đăng job</p>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl border-green-500/20 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-green-500/20 p-3 rounded-xl">
              <Star className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <h4 className="text-gray-300 text-sm mb-2">Đánh Giá TB</h4>
          <p className="text-3xl font-bold text-white mb-1">
            {(MOCK_WORKERS.reduce((acc, w) => acc + w.rating, 0) / MOCK_WORKERS.length).toFixed(1)}
          </p>
          <p className="text-green-400 text-sm">⭐ Từ Workers</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="workers" className="space-y-6">
        <TabsList className="bg-slate-800/50 border border-white/10">
          <TabsTrigger value="workers" className="data-[state=active]:bg-purple-500/20">
            Workers ({MOCK_WORKERS.length})
          </TabsTrigger>
          <TabsTrigger value="hirers" className="data-[state=active]:bg-blue-500/20">
            Hirers ({hirers.length})
          </TabsTrigger>
        </TabsList>

        {/* Workers Tab */}
        <TabsContent value="workers" className="space-y-6">
          {/* Search & Filter */}
          <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10 p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Tìm kiếm worker theo tên, kỹ năng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
              <Filter className="w-4 h-4" />
              <span>Hiển thị {filteredWorkers.length} / {MOCK_WORKERS.length} workers</span>
            </div>
          </Card>

          {/* Workers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkers.map(worker => (
              <Card key={worker.id} className="bg-slate-800/50 backdrop-blur-xl border-white/10 hover:border-purple-500/30 transition-all hover:scale-105 p-6">
                <div className="flex items-start justify-between mb-4">
                  <img src={worker.avatar} alt={worker.name} className="w-16 h-16 rounded-full" />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedWorker(worker)}
                    className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>

                <h3 className="text-white font-semibold text-lg mb-2">{worker.name}</h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{worker.bio}</p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-white font-medium">{worker.rating}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Briefcase className="w-4 h-4" />
                      <span>{worker.completedJobs} jobs</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span>{worker.lat.toFixed(4)}, {worker.lng.toFixed(4)}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {worker.skills.slice(0, 3).map(skill => (
                      <Badge key={skill} className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredWorkers.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <p>Không tìm thấy worker nào</p>
            </div>
          )}
        </TabsContent>

        {/* Hirers Tab */}
        <TabsContent value="hirers" className="space-y-6">
          {/* Search */}
          <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10 p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Tìm kiếm hirer theo tên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
              <Filter className="w-4 h-4" />
              <span>Hiển thị {filteredHirers.length} / {hirers.length} hirers</span>
            </div>
          </Card>

          {/* Hirers Table */}
          <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Hirer</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Tổng Jobs</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Đang Active</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Hoàn Thành</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Chi Tiêu</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Rating</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredHirers.map(hirer => (
                    <tr key={hirer.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={hirer.avatar} alt={hirer.name} className="w-10 h-10 rounded-full" />
                          <div>
                            <p className="text-white font-medium">{hirer.name}</p>
                            <p className="text-xs text-gray-400">Tham gia: {formatDate(hirer.joinedAt)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-gray-400" />
                          <span className="text-white">{hirer.totalJobs}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                          {hirer.activeJobs}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                          {hirer.completedJobs}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-white font-semibold">{formatCurrency(hirer.totalSpent)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-white">{hirer.avgRating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedHirer(hirer)}
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredHirers.length === 0 && (
              <div className="py-12 text-center text-gray-400">
                <p>Không tìm thấy hirer nào</p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Worker Detail Modal */}
      <Dialog open={!!selectedWorker} onOpenChange={() => setSelectedWorker(null)}>
        <DialogContent className="bg-slate-800 border-white/10 text-white max-w-2xl">
          {selectedWorker && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">Chi tiết Worker</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Profile */}
                <div className="flex items-start gap-4">
                  <img src={selectedWorker.avatar} alt={selectedWorker.name} className="w-20 h-20 rounded-full" />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{selectedWorker.name}</h3>
                    <p className="text-gray-400 mb-2">{selectedWorker.bio}</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        <span className="text-white font-semibold">{selectedWorker.rating}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Briefcase className="w-4 h-4" />
                        <span>{selectedWorker.completedJobs} jobs hoàn thành</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <p className="text-sm text-gray-400 mb-3">Kỹ năng</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedWorker.skills.map(skill => (
                      <Badge key={skill} className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">Vị trí</span>
                  </div>
                  <p className="text-white">Latitude: {selectedWorker.lat.toFixed(6)}</p>
                  <p className="text-white">Longitude: {selectedWorker.lng.toFixed(6)}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                    <p className="text-gray-400 text-sm mb-1">ID</p>
                    <p className="text-white font-semibold">{selectedWorker.id}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                    <p className="text-gray-400 text-sm mb-1">Rating</p>
                    <p className="text-white font-semibold">{selectedWorker.rating}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                    <p className="text-gray-400 text-sm mb-1">Completed</p>
                    <p className="text-white font-semibold">{selectedWorker.completedJobs}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Hirer Detail Modal */}
      <Dialog open={!!selectedHirer} onOpenChange={() => setSelectedHirer(null)}>
        <DialogContent className="bg-slate-800 border-white/10 text-white max-w-2xl">
          {selectedHirer && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">Chi tiết Hirer</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Profile */}
                <div className="flex items-start gap-4">
                  <img src={selectedHirer.avatar} alt={selectedHirer.name} className="w-20 h-20 rounded-full" />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{selectedHirer.name}</h3>
                    <p className="text-gray-400 mb-2">Tham gia: {formatDate(selectedHirer.joinedAt)}</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      <span className="text-white font-semibold">{selectedHirer.avgRating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Briefcase className="w-4 h-4" />
                      <span className="text-sm">Tổng Jobs</span>
                    </div>
                    <p className="text-white font-semibold text-2xl">{selectedHirer.totalJobs}</p>
                  </div>

                  <div className="bg-slate-900/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <UsersIcon className="w-4 h-4" />
                      <span className="text-sm">Jobs Active</span>
                    </div>
                    <p className="text-blue-400 font-semibold text-2xl">{selectedHirer.activeJobs}</p>
                  </div>

                  <div className="bg-slate-900/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Star className="w-4 h-4" />
                      <span className="text-sm">Jobs Completed</span>
                    </div>
                    <p className="text-green-400 font-semibold text-2xl">{selectedHirer.completedJobs}</p>
                  </div>

                  <div className="bg-slate-900/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <span className="text-sm">Tổng Chi Tiêu</span>
                    </div>
                    <p className="text-white font-semibold text-lg">{formatCurrency(selectedHirer.totalSpent)}</p>
                  </div>
                </div>

                {/* Completion Rate */}
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-2">Tỷ lệ hoàn thành</p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full"
                        style={{ width: `${selectedHirer.totalJobs > 0 ? (selectedHirer.completedJobs / selectedHirer.totalJobs * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-white font-semibold">
                      {selectedHirer.totalJobs > 0 ? ((selectedHirer.completedJobs / selectedHirer.totalJobs) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
