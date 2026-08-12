import { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, Clock, Users, Eye, Trash2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { taskService } from '../../../services/taskService';
import { Task } from '../../../types';

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + '₫';
}

export default function JobsManagement() {
  const [jobs, setJobs] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await taskService.getTasks({ limit: 100 });
      setJobs(res.data);
    } catch (err) {
      console.error('Error loading jobs for admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleDeleteJob = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa công việc này khỏi hệ thống?')) return;
    try {
      await taskService.deleteTask(id);
      setJobs(prev => prev.filter(j => j.id !== id));
      if (selectedJob?.id === id) setSelectedJob(null);
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: any) => {
    try {
      await taskService.updateTaskStatus(id, newStatus);
      await loadJobs();
      if (selectedJob?.id === id) {
        setSelectedJob(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Error updating task status:', err);
    }
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch =
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.posterName && job.posterName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchTerm, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">Đang tuyển</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Đang làm</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/30">Hoàn thành</span>;
      case 'CANCELLED':
      case 'CLOSED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30">Đã đóng</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-500/20 text-gray-300 border border-gray-500/30">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-1">Quản Lý Công Việc</h1>
          <p className="text-gray-400 text-sm">Theo dõi, kiểm duyệt và quản trị tất cả các nhiệm vụ trong hệ thống</p>
        </div>

        <button
          onClick={loadJobs}
          className="p-2.5 rounded-xl bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700 transition border border-white/10"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Tìm kiếm theo tiêu đề, mô tả, người đăng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-900/60 border-white/10 text-white placeholder:text-gray-500 text-xs"
            />
          </div>

          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-slate-900/60 border-white/10 text-white text-xs">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-white/10 text-white text-xs">
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="OPEN">🟢 Đang tuyển (OPEN)</SelectItem>
                <SelectItem value="IN_PROGRESS">🔵 Đang thực hiện (IN_PROGRESS)</SelectItem>
                <SelectItem value="COMPLETED">🟣 Hoàn thành (COMPLETED)</SelectItem>
                <SelectItem value="CLOSED">🔴 Đã đóng / Hủy (CLOSED)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Jobs Table */}
      <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10 p-6 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Đang tải danh sách việc...</div>
        ) : filteredJobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs uppercase text-gray-400 border-b border-white/10 pb-3">
                <tr>
                  <th className="py-3 px-4">Tiêu đề</th>
                  <th className="py-3 px-4">Người đăng</th>
                  <th className="py-3 px-4">Ngân sách</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Ngày tạo</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredJobs.map(job => (
                  <tr key={job.id} className="hover:bg-white/5 transition">
                    <td className="py-3.5 px-4 max-w-xs truncate font-bold text-white">
                      {job.title}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-300">
                      {job.posterName || 'Người dùng'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-orange-400 text-xs">
                      {fmt(job.budgetMin)} – {fmt(job.budgetMax)}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(job.status)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-400">
                      {new Date(job.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedJob(job)}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-gray-200 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400 text-sm">
            Không tìm thấy công việc nào phù hợp với bộ lọc.
          </div>
        )}
      </Card>

      {/* Details Dialog */}
      {selectedJob && (
        <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
          <DialogContent className="bg-slate-900 border-white/10 text-white max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white pr-4">
                {selectedJob.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-xs text-gray-300 mt-3">
              <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-xl">
                <div>
                  <p className="text-gray-400">Ngân sách</p>
                  <p className="font-bold text-orange-400 text-sm">{fmt(selectedJob.budgetMin)} – {fmt(selectedJob.budgetMax)}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Trạng thái hiện tại</p>
                  {getStatusBadge(selectedJob.status)}
                </div>
              </div>

              <div>
                <p className="text-gray-400 font-semibold mb-1">Mô tả chi tiết</p>
                <p className="bg-slate-800/40 p-3 rounded-xl leading-relaxed whitespace-pre-line text-gray-300">
                  {selectedJob.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/40 p-3 rounded-xl">
                  <p className="text-gray-400">Người đăng</p>
                  <p className="font-bold text-white mt-0.5">{selectedJob.posterName || 'Người dùng'}</p>
                </div>
                <div className="bg-slate-800/40 p-3 rounded-xl">
                  <p className="text-gray-400">Hình thức làm việc</p>
                  <p className="font-bold text-white mt-0.5">{selectedJob.workMode === 'REMOTE' ? 'Online' : 'Tại chỗ'}</p>
                </div>
              </div>

              {/* Status Update Buttons */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <span className="text-gray-400 font-semibold">Chuyển trạng thái:</span>
                <div className="flex items-center gap-2">
                  {selectedJob.status !== 'OPEN' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedJob.id, 'OPEN')}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition"
                    >
                      Mở lại
                    </button>
                  )}
                  {selectedJob.status !== 'COMPLETED' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedJob.id, 'COMPLETED')}
                      className="px-2.5 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold transition"
                    >
                      Hoàn thành
                    </button>
                  )}
                  {selectedJob.status !== 'CLOSED' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedJob.id, 'CLOSED')}
                      className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition"
                    >
                      Đóng việc
                    </button>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
