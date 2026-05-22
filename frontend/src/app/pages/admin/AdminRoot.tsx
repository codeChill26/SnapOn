import { Outlet, Link, useLocation } from 'react-router';
import { LayoutDashboard, Briefcase, Users, LogOut } from 'lucide-react';
import { useState } from 'react';

export function AdminRoot() {
  const location = useLocation();

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/jobs', label: 'Quản lý Jobs', icon: Briefcase },
    { path: '/admin/users', label: 'Quản lý Users', icon: Users },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Collapsible Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-16 hover:w-64 bg-slate-900/95 backdrop-blur-xl border-r border-white/10 z-50 transition-all duration-300 ease-in-out group">
        {/* Logo */}
        <div className="p-4 border-b border-white/10 h-16 flex items-center">
          <div className="flex items-center gap-3 min-w-max">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden whitespace-nowrap">
              <h1 className="text-white font-bold text-xl">Admin Panel</h1>
              <p className="text-purple-300 text-xs">SnapOn</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-xl transition-all
                  ${
                    active
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Back to Main */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/10">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden whitespace-nowrap">
              Về trang chính
            </span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-16 min-h-screen">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}