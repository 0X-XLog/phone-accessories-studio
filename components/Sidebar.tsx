'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  Image as ImageIcon,
  Layers,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products/new', label: 'New Product', icon: PlusCircle },
  { href: '/batch', label: 'Batch Process', icon: Layers },
  { href: '/tiktok', label: 'TikTok 店铺', icon: ShieldCheck },
];

export default function Sidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <aside className="w-60 bg-white border-r border-gray-200 h-screen flex flex-col fixed left-0 top-0">
      <div className="p-4 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-gray-900">3C Accessories Studio</h1>
            <p className="text-xs text-gray-500">AI Tools</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
