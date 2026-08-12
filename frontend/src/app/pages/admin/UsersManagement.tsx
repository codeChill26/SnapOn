import { useState, useMemo, useEffect } from 'react';
import { Search, Star, Briefcase, MapPin, Eye, UserCircle, Users as UsersIcon, RefreshCw, BadgeCheck, Shield, Phone, Mail } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import api from '../../../services/api';
import { adminService } from '../../../services/adminService';
import { profileService } from '../../../services/profileService';
import { User, PublicProfile } from '../../../types';

export default function UsersManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'USER' | 'ADMIN' | 'tasker'>('all');
  const [selectedUser, setSelectedUser] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // First try to fetch from admin stats top users + database users
      const stats = await adminService.getStats();
      if (stats?.topUsers) {
        setUsers(stats.topUsers);
      }
    } catch (err) {
      console.error('Error loading users for admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleInspectUser = async (userId: string) => {
    try {
      const pub = await profileService.getPublicProfile(userId);
      setSelectedUser(pub);
    } catch (err) {
      console.error('Error loading user profile:', err);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const name = (u.name || u.full_name || u.fullName || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const matchSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [users, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-1">Quản Lý Người Dùng</h1>
          <p className="text-gray-400 text-sm">Theo dõi người thuê, người làm việc và các đối tác trên nền tảng</p>
        </div>

        <button
          onClick={loadUsers}
          className="p-2.5 rounded-xl bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700 transition border border-white/10"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter & Search */}
      <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10 p-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Tìm kiếm theo tên, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-900/60 border-white/10 text-white placeholder:text-gray-500 text-xs"
          />
        </div>
      </Card>

      {/* Users Table */}
      <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10 p-6 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Đang tải danh sách người dùng...</div>
        ) : filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs uppercase text-gray-400 border-b border-white/10 pb-3">
                <tr>
                  <th className="py-3 px-4">Thành viên</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Đã đăng</th>
                  <th className="py-3 px-4">Đã làm</th>
                  <th className="py-3 px-4">Ngày tham gia</th>
                  <th className="py-3 px-4 text-right">Xem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-white/5 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatarUrl || user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                          alt=""
                          className="w-10 h-10 rounded-xl bg-slate-700 border border-white/10"
                        />
                        <div>
                          <p className="font-bold text-white text-sm">{user.name || user.full_name || 'Người dùng'}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Hoạt động
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-400 font-mono">
                      {user.email || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-orange-400 text-xs">
                      {user.postCount || user.post_count || 0} bài
                    </td>
                    <td className="py-3.5 px-4 font-bold text-green-400 text-xs">
                      {user.completedCount || user.completed_count || 0} việc
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-400">
                      {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleInspectUser(user.id)}
                        className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-gray-200 transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400 text-sm">
            Không tìm thấy người dùng nào.
          </div>
        )}
      </Card>

      {/* User Details Dialog */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
                <img
                  src={selectedUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.id}`}
                  alt=""
                  className="w-12 h-12 rounded-xl bg-slate-700 border border-white/10"
                />
                <div>
                  <p>{selectedUser.fullName}</p>
                  <p className="text-xs text-purple-300 font-normal">Thành viên từ {new Date(selectedUser.joinedAt).toLocaleDateString('vi-VN')}</p>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-xs text-gray-300 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/60 p-3 rounded-xl text-center">
                  <p className="text-gray-400">Đánh giá trung bình</p>
                  <p className="font-extrabold text-yellow-400 text-base mt-1 flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 fill-current" /> {selectedUser.ratingAverage.toFixed(1)}
                  </p>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl text-center">
                  <p className="text-gray-400">Tổng đánh giá</p>
                  <p className="font-extrabold text-white text-base mt-1">{selectedUser.reviewCount}</p>
                </div>
              </div>

              {selectedUser.bio && (
                <div className="bg-slate-800/40 p-3 rounded-xl">
                  <p className="text-gray-400 font-semibold mb-1">Giới thiệu</p>
                  <p className="text-gray-300 leading-relaxed">{selectedUser.bio}</p>
                </div>
              )}

              {selectedUser.skills && selectedUser.skills.length > 0 && (
                <div>
                  <p className="text-gray-400 font-semibold mb-1.5">Kỹ năng</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedUser.skills.map((s, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-800 text-purple-300 text-xs border border-white/10">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
