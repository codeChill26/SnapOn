import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/jwt';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  if (!token) {
    redirect('/login');
  }

  let adminUser = null;
  try {
    adminUser = verifyToken(token);
  } catch (error) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-[#FAFAFA] text-[#18181B]">
      {/* Sidebar - fixed left panel */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col md:pl-64 bg-[#FAFAFA] min-h-screen">
        {/* Navbar - top panel */}
        <Navbar adminUser={adminUser} />

        {/* Content Body - Full Width without giant black side margins */}
        <main className="flex-1 p-6 md:p-8 w-full bg-[#FAFAFA]">
          {children}
        </main>
      </div>
    </div>
  );
}
