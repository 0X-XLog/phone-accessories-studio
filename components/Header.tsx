'use client';

import { useRouter } from 'next/navigation';

export default function Header({ title }: { title: string }) {
  const router = useRouter();

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/products/new')}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + New Product
        </button>
      </div>
    </header>
  );
}
