'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Tag, 
  Briefcase, 
  Flag, 
  Image, 
  Wallet,
  ShieldCheck
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/categories', label: 'Categories', icon: Tag },
  { href: '/tasks', label: 'Tasks', icon: Briefcase },
  { href: '/banners', label: 'Banners', icon: Image },
  { href: '/reports', label: 'Reports', icon: Flag },
  { href: '/withdraws', label: 'Withdrawals', icon: Wallet },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden md:flex w-64 flex-col border-r border-zinc-900 bg-zinc-950">
      {/* Brand logo */}
      <div className="flex h-16 items-center gap-2 border-b border-zinc-900 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 shadow-md shadow-indigo-600/30">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-white">SnapOn Console</span>
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
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer / version */}
      <div className="border-t border-zinc-900 p-4 text-center text-xs text-zinc-500">
        v1.0.0 &copy; 2026 SnapOn
      </div>
    </aside>
  );
}
