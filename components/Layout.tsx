'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const isLoginPage = pathname === '/login';

      if (isLoginPage) {
        // Check if already logged in
        const res = await fetch('/api/stats');
        if (res.ok) {
          router.replace('/dashboard');
        } else {
          setLoading(false);
        }
        return;
      }

      // For non-login pages, verify auth
      const res = await fetch('/api/stats');
      if (res.status === 401) {
        router.replace('/login');
      } else {
        setLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-60">{children}</main>
    </div>
  );
}
