import { useApp } from '../../context/AppContext';
import { useState, useMemo } from 'react';
import { Search, Filter, MapPin, Clock, DollarSign, Users, Eye, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import type { Job } from '../../context/AppContext';

export default function JobsManagement() {
  const { jobs } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Filter and search jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.hirerName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || job.category === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [jobs, searchTerm, statusFilter, categoryFilter]);

  // Get unique categories
  const categories = Array.from(new Set(jobs.map(j => j.category)));

  const getStatusConfig = (status: Job['status']) => {
    switch (status) {
      case 'active':
        return { label: 'Active', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'matched':
        return { label: 'Matched', className: 'bg-green-500/20 text-green-300 border-green-500/30' };
      case 'completed':
        return { label: 'Completed', className: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      case 'expired':
        return { label: 'Expired', className: 'bg-red-500/20 text-red-300 border-red-500/30' };
      default:
        return { label: status, className: 'bg-gray-500/20 text-gray-300 border-gray-500/30' };
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Quản Lý Jobs</h1>
        <p className="text-gray-400">Quản lý và theo dõi tất cả công việc trong hệ thống</p>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Tìm kiếm job, hirer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-slate-900/50 border-white/10 text-white">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-white/10">
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="matched">Matched</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-slate-900/50 border-white/10 text-white">
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-white/10">
                <SelectItem value="all">Tất cả danh mục</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
          <Filter className="w-4 h-4" />
          <span>Hiển thị {filteredJobs.length} / {jobs.length} jobs</span>
        </div>
      </Card>

      {/* Jobs Table */}
      <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Job</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Hirer</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Giá</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Ứng viên</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Trạng thái</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Thời gian</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredJobs.map(job => {
                const statusConfig = getStatusConfig(job.status);
                return (
                  <tr key={job.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl mt-1">{job.categoryIcon}</div>
                        <div>
                          <p className="text-white font-medium">{job.title}</p>
                          <p className="text-sm text-gray-400 mt-1 line-clamp-1">{job.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <MapPin className="w-3 h-3 text-gray-500" />
                            <span className="text-xs text-gray-500">{job.location.address}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <img src={job.hirerAvatar} alt={job.hirerName} className="w-8 h-8 rounded-full" />
                        <span className="text-white text-sm">{job.hirerName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-white font-semibold">{formatCurrency(job.price)}</p>
                        <p className="text-xs text-gray-400">
                          {formatCurrency(job.priceMin)} - {formatCurrency(job.priceMax)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-white">{job.applicants.length}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={statusConfig.className}>
                        {statusConfig.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(job.postedAt)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedJob(job)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredJobs.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <p>Không tìm thấy job nào</p>
          </div>
        )}
      </Card>

      {/* Job Detail Modal */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="bg-slate-800 border-white/10 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-3">
                  <span className="text-3xl">{selectedJob.categoryIcon}</span>
                  {selectedJob.title}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Status & Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Trạng thái</p>
                    <Badge className={getStatusConfig(selectedJob.status).className}>
                      {getStatusConfig(selectedJob.status).label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">ID</p>
                    <p className="text-white font-mono text-sm">{selectedJob.id}</p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <p className="text-sm text-gray-400 mb-2">Mô tả</p>
                  <p className="text-white">{selectedJob.description}</p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm">Giá</span>
                    </div>
                    <p className="text-white font-semibold">{formatCurrency(selectedJob.price)}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Range: {formatCurrency(selectedJob.priceMin)} - {formatCurrency(selectedJob.priceMax)}
                    </p>
                  </div>

                  <div className="bg-slate-900/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Thời lượng</span>
                    </div>
                    <p className="text-white font-semibold">{selectedJob.duration} giờ</p>
                  </div>

                  <div className="bg-slate-900/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">Địa điểm</span>
                    </div>
                    <p className="text-white text-sm">{selectedJob.location.address}</p>
                  </div>

                  <div className="bg-slate-900/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Ứng viên</span>
                    </div>
                    <p className="text-white font-semibold">{selectedJob.applicants.length} người</p>
                  </div>
                </div>

                {/* Hirer Info */}
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-3">Người thuê</p>
                  <div className="flex items-center gap-3">
                    <img src={selectedJob.hirerAvatar} alt={selectedJob.hirerName} className="w-12 h-12 rounded-full" />
                    <div>
                      <p className="text-white font-medium">{selectedJob.hirerName}</p>
                      <p className="text-sm text-gray-400">Hirer</p>
                    </div>
                  </div>
                </div>

                {/* Applicants */}
                {selectedJob.applicants.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-400 mb-3">Danh sách ứng viên ({selectedJob.applicants.length})</p>
                    <div className="space-y-3">
                      {selectedJob.applicants.map(applicant => (
                        <div key={applicant.workerId} className="bg-slate-900/50 rounded-xl p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <img src={applicant.avatar} alt={applicant.name} className="w-10 h-10 rounded-full" />
                              <div>
                                <p className="text-white font-medium">{applicant.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-yellow-400 text-sm">⭐ {applicant.rating}</span>
                                  <span className="text-gray-400 text-sm">• {applicant.completedJobs} jobs</span>
                                </div>
                              </div>
                            </div>
                            {applicant.workerId === selectedJob.aiMatchId && (
                              <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                AI Match
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-gray-400">Giá đề xuất</p>
                              <p className="text-white font-semibold">{formatCurrency(applicant.bidPrice)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Khoảng cách</p>
                              <p className="text-white">{applicant.distance} km</p>
                            </div>
                            {applicant.aiScore !== undefined && (
                              <div>
                                <p className="text-gray-400">AI Score</p>
                                <p className="text-white font-semibold">{(applicant.aiScore * 100).toFixed(0)}%</p>
                              </div>
                            )}
                          </div>

                          {applicant.note && (
                            <p className="text-gray-300 text-sm mt-3 italic">"{applicant.note}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Đăng lúc</p>
                    <p className="text-white text-sm">{formatDate(selectedJob.postedAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Hết hạn lúc</p>
                    <p className="text-white text-sm">{formatDate(selectedJob.expiresAt)}</p>
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
