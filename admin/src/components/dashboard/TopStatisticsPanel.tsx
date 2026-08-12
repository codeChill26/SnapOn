import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Trophy, Tag, Users } from 'lucide-react';

interface TopPoster {
  id: string;
  fullName: string;
  email: string;
  taskCount: number;
}

interface TopCategory {
  id: string;
  name: string;
  slug: string;
  taskCount: number;
}

interface NewestMember {
  id: string;
  fullName: string;
  email: string;
  role: string | null;
  createdAt: Date;
}

interface TopStatisticsPanelProps {
  topPosters: TopPoster[];
  topCategories: TopCategory[];
  newestMembers: NewestMember[];
}

export default function TopStatisticsPanel({
  topPosters,
  topCategories,
  newestMembers,
}: TopStatisticsPanelProps) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Top Task Posters */}
      <Card className="p-5 space-y-4 bg-white border-[#E4E4E7] text-[#18181B] shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-600" />
            <h4 className="text-sm font-extrabold text-[#18181B]">Top Người Đăng Task</h4>
          </div>
          <Link href="/users" className="text-[11px] text-[#312F2C] font-bold hover:underline">
            Xem người dùng
          </Link>
        </div>

        <div className="space-y-2.5">
          {topPosters.length === 0 ? (
            <p className="text-xs text-[#71717A] text-center py-4">Chưa có dữ liệu người đăng</p>
          ) : (
            topPosters.map((poster, index) => (
              <div key={poster.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7] text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    index === 0 ? 'bg-amber-400 text-black shadow-xs' :
                    index === 1 ? 'bg-zinc-300 text-black' :
                    index === 2 ? 'bg-amber-200 text-black' :
                    'bg-zinc-200 text-zinc-700'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="truncate min-w-0">
                    <p className="font-bold text-[#18181B] truncate">{poster.fullName}</p>
                    <p className="text-[10px] text-[#71717A] truncate font-mono">{poster.email}</p>
                  </div>
                </div>
                <span className="font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[10px] border border-amber-300 shrink-0">
                  {poster.taskCount} việc
                </span>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Most Popular Categories */}
      <Card className="p-5 space-y-4 bg-white border-[#E4E4E7] text-[#18181B] shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-purple-600" />
            <h4 className="text-sm font-extrabold text-[#18181B]">Top Danh Mục Popular</h4>
          </div>
          <Link href="/categories" className="text-[11px] text-[#312F2C] font-bold hover:underline">
            Quản lý
          </Link>
        </div>

        <div className="space-y-2.5">
          {topCategories.length === 0 ? (
            <p className="text-xs text-[#71717A] text-center py-4">Chưa có danh mục</p>
          ) : (
            topCategories.map((cat, index) => (
              <div key={cat.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7] text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-purple-100 border border-purple-300 text-purple-800 flex items-center justify-center text-[10px] font-bold shrink-0">
                    #{index + 1}
                  </span>
                  <p className="font-bold text-[#18181B] truncate">{cat.name}</p>
                </div>
                <span className="font-extrabold text-purple-800 bg-purple-100 px-2 py-0.5 rounded text-[10px] border border-purple-300 shrink-0">
                  {cat.taskCount} việc
                </span>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Newest Members */}
      <Card className="p-5 space-y-4 bg-white border-[#E4E4E7] text-[#18181B] shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <h4 className="text-sm font-extrabold text-[#18181B]">Thành Viên Mới Đăng Ký</h4>
          </div>
          <Link href="/users" className="text-[11px] text-[#312F2C] font-bold hover:underline">
            Xem tất cả
          </Link>
        </div>

        <div className="space-y-2.5">
          {newestMembers.length === 0 ? (
            <p className="text-xs text-[#71717A] text-center py-4">Chưa có thành viên mới</p>
          ) : (
            newestMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7] text-xs">
                <div className="min-w-0">
                  <p className="font-bold text-[#18181B] truncate">{member.fullName}</p>
                  <p className="text-[10px] text-[#71717A] truncate font-mono">{member.email}</p>
                </div>
                <span className="text-[10px] text-[#71717A] font-bold bg-white border border-[#E4E4E7] px-2 py-0.5 rounded shrink-0 shadow-2xs">
                  {new Date(member.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
