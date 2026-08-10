'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import {
  LayoutDashboard,
  Users,
  Tag,
  Briefcase,
  Flag,
  Image,
  Wallet,
  Scale,
  ShieldCheck,
  Trash2
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/categories', label: 'Categories', icon: Tag },
  { href: '/tasks', label: 'Tasks', icon: Briefcase },
  { href: '/banners', label: 'Banners', icon: Image },
  { href: '/reports', label: 'Reports', icon: Flag },
  { href: '/withdraws', label: 'Withdrawals', icon: Wallet, badge: 'withdraws' },
  { href: '/disputes', label: 'Disputes', icon: Scale, badge: 'disputes' },
  { href: '/deletions', label: 'Deletions', icon: Trash2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [pendingWithdraws, setPendingWithdraws] = useState(0);
  const [pendingDisputes, setPendingDisputes] = useState(0);

  // Poll pending counts for near real-time notification badges.
  useEffect(() => {
    let active = true;

    const fetchPending = async () => {
      try {
        const res = await apiClient.get('/api/withdraws', {
          params: { status: 'PENDING', page: '1', limit: '1' },
        });
        if (active && res.data?.success) {
          setPendingWithdraws(res.data.data.total || 0);
        }
      } catch {
        // Silent — a transient failure shouldn't disrupt the console.
      }
      try {
        const res = await apiClient.get('/api/disputes', {
          params: { view: 'DISPUTED', page: '1', limit: '1' },
        });
        if (active && res.data?.success) {
          setPendingDisputes(res.data.data.total || 0);
        }
      } catch {
        // Silent
      }
    };

    fetchPending();
    const id = setInterval(fetchPending, 15000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden md:flex w-64 flex-col border-r border-[#262422] bg-[#312F2C] text-[#FAFAFA]">
      {/* Brand logo */}
      <div className="flex h-16 items-center gap-3 border-b border-[#3d3a37] px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAFAFA] shadow-md">
          <ShieldCheck className="h-5 w-5 text-[#312F2C]" />
        </div>
        <span className="text-lg font-bold tracking-tight text-[#FAFAFA]">SnapOn Console</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1.5 px-4 py-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[#FAFAFA] text-[#312F2C] font-bold shadow-md'
                  : 'text-[#d4d1cc] hover:bg-[#3d3a37] hover:text-[#FAFAFA]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              {item.badge === 'withdraws' && pendingWithdraws > 0 && (
                <span
                  className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold animate-pulse ${
                    isActive ? 'bg-white text-indigo-700' : 'bg-red-500 text-white'
                  }`}
                >
                  {pendingWithdraws > 99 ? '99+' : pendingWithdraws}
                </span>
              )}
              {item.badge === 'disputes' && pendingDisputes > 0 && (
                <span
                  className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold animate-pulse ${
                    isActive ? 'bg-white text-indigo-700' : 'bg-amber-500 text-white'
                  }`}
                >
                  {pendingDisputes > 99 ? '99+' : pendingDisputes}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / version */}
      <div className="border-t border-[#3d3a37] p-4 text-center text-xs text-[#a19d97]">
        v1.0.0 &copy; 2026 SnapOn
      </div>
    </aside>
  );
}
