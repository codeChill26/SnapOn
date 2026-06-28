'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Menu, X, ShieldCheck, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { formatImageUrl } from '@/lib/image-utils';

interface NavbarProps {
  adminUser: {
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
}

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/users', label: 'Users' },
  { href: '/categories', label: 'Categories' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/banners', label: 'Banners' },
  { href: '/reports', label: 'Reports' },
  { href: '/withdraws', label: 'Withdrawals' },
];

export default function Navbar({ adminUser }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-900 bg-zinc-950/85 px-6 backdrop-blur-md">
      {/* Page Title or Mobile Menu trigger */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-900 hover:text-white md:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-semibold text-white capitalize md:block hidden">
          {pathname === '/' ? 'Overview' : pathname.split('/')[1] || ''}
        </h1>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {adminUser?.avatarUrl ? (
            <div className="h-8 w-8 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 shrink-0">
              <img
                src={formatImageUrl(adminUser.avatarUrl)}
                alt="Admin Avatar"
                className="object-cover w-full h-full"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/default-avatar.png';
                }}
              />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white font-bold shrink-0">
              {adminUser?.fullName?.[0]?.toUpperCase() || <UserIcon className="h-4 w-4" />}
            </div>
          )}
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-white leading-none">{adminUser?.fullName || 'Administrator'}</p>
            <p className="text-xs text-zinc-400 mt-1 leading-none">{adminUser?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700/60 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Mobile navigation overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative flex w-full max-w-xs flex-col bg-zinc-950 p-6 border-r border-zinc-900">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-white">SnapOn Mobile</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-900 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="flex-1 space-y-2 mt-6">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-zinc-900 pt-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-2">
                {adminUser?.avatarUrl ? (
                  <div className="h-7 w-7 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 shrink-0">
                    <img
                      src={formatImageUrl(adminUser.avatarUrl)}
                      alt="Admin Avatar"
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/default-avatar.png';
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0">
                    {adminUser?.fullName?.[0]?.toUpperCase() || <UserIcon className="h-4 w-4" />}
                  </div>
                )}
                <div className="text-left text-xs">
                  <p className="font-semibold text-white leading-none">{adminUser?.fullName}</p>
                  <p className="text-zinc-500 mt-0.5 leading-none">{adminUser?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
