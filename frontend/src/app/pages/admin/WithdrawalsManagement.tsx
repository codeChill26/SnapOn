import { useState, useEffect } from 'react';
import { Landmark, CheckCircle, XCircle, Clock, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { adminService } from '../../../services/adminService';
import { WalletTransaction } from '../../../types';

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + '₫';
}

export default function WithdrawalsManagement() {
  const [withdrawals, setWithdrawals] = useState<WalletTransaction[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'SUCCESS' | 'FAILED'>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadWithdrawals = async () => {
    setLoading(true);
    try {
      const list = await adminService.getWithdrawals(statusFilter !== 'all' ? statusFilter : undefined);
      setWithdrawals(list);
    } catch (err) {
      console.error('Error loading withdrawals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, [statusFilter]);

  const handleApprove = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn DUYỆT đơn rút tiền này?')) return;
    setActionLoading(id);
    try {
      await adminService.approveWithdrawal(id);
      await loadWithdrawals();
    } catch (err) {
      console.error('Error approving withdrawal:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn TỪ CHỐI đơn rút tiền này?')) return;
    setActionLoading(id);
    try {
      await adminService.rejectWithdrawal(id);
      await loadWithdrawals();
    } catch (err) {
      console.error('Error rejecting withdrawal:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = withdrawals.filter(w => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = w.userName?.toLowerCase().includes(q);
      const matchEmail = w.userEmail?.toLowerCase().includes(q);
      const matchPhone = w.userPhone?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-1">Duyệt Yêu Cầu Rút Tiền</h1>
          <p className="text-gray-400 text-sm">Quản lý và giải ngân các yêu cầu rút tiền của người dùng và người lao động</p>
        </div>

        <button
          onClick={loadWithdrawals}
          className="p-2.5 rounded-xl bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700 transition border border-white/10"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'PENDING', label: '⏳ Chờ duyệt' },
          { key: 'SUCCESS', label: '✅ Đã duyệt' },
          { key: 'FAILED', label: '❌ Đã từ chối' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              statusFilter === key
                ? 'bg-purple-600 text-white shadow'
                : 'bg-slate-800/80 text-gray-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Tìm theo tên, email, SĐT..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white text-xs outline-none focus:border-purple-500"
        />
      </div>

      {/* Withdrawals Table / List */}
      <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10 p-6 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Đang tải danh sách rút tiền...</div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs uppercase text-gray-400 border-b border-white/10 pb-3">
                <tr>
                  <th className="py-3 px-4">Người yêu cầu</th>
                  <th className="py-3 px-4">Số tiền</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-white/5 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.walletId}`}
                          alt=""
                          className="w-9 h-9 rounded-xl bg-slate-700 border border-white/10"
                        />
                        <div>
                          <p className="font-bold text-white text-sm">{item.userName || 'Người dùng'}</p>
                          <p className="text-xs text-gray-400">{item.userEmail || item.userPhone || 'ID: ' + item.walletId.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-orange-400 text-base">
                      {fmt(item.amount)}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        item.status === 'SUCCESS' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                        'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        {item.status === 'PENDING' ? 'Chờ duyệt' :
                         item.status === 'SUCCESS' ? 'Đã duyệt' : 'Từ chối'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={actionLoading === item.id}
                            onClick={() => handleApprove(item.id)}
                            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition shadow"
                          >
                            Duyệt
                          </button>
                          <button
                            disabled={actionLoading === item.id}
                            onClick={() => handleReject(item.id)}
                            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition shadow"
                          >
                            Từ chối
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400 text-sm">
            Không có yêu cầu rút tiền nào trong mục này.
          </div>
        )}
      </Card>
    </div>
  );
}
