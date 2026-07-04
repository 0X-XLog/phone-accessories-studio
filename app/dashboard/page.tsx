'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import { BarChart3, DollarSign, Image, FileText, AlertCircle, ArrowRight, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCost } from '@/lib/cost';

const PAGE_SIZE = 20;

interface Stats {
  products: { draft: number; analyzed: number; generated: number; completed: number; total: number };
  totalCost: number;
  generations: { image_edit: number; image_generate: number; title: number; description: number; failed: number };
  imageCount: number;
}

interface Product {
  id: string;
  name: string;
  status: string;
  total_cost: number;
  created_at: string;
  original_images: string[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Product list state
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchProducts = useCallback(async (status: string, p: number) => {
    setLoadingProducts(true);
    try {
      const offset = (p - 1) * PAGE_SIZE;
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (status && status !== 'all') params.set('status', status);
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPage(1);
    fetchProducts(statusFilter, 1);
  }, [statusFilter, fetchProducts]);

  useEffect(() => {
    fetchProducts(statusFilter, page);
  }, [page, fetchProducts, statusFilter]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      // Re-fetch from server with filtered results by adjusting page
      fetchProducts(statusFilter, 1);
    }, 300);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this product? This cannot be undone.')) return;
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setTotal((prev) => prev - 1);
      setStats((prev) => {
        if (!prev) return prev;
        return { ...prev, products: { ...prev.products, total: prev.products.total - 1 } };
      });
    }
  };

  const filteredProducts = searchQuery
    ? products.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : products;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (loading) {
    return (
      <Layout>
        <Header title="Dashboard" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            icon={BarChart3}
            label="Total Products"
            value={stats?.products.total || 0}
            color="blue"
          />
          <StatCard
            icon={Image}
            label="Images Generated"
            value={stats?.imageCount || 0}
            color="green"
          />
          <StatCard
            icon={FileText}
            label="AI Generations"
            value={((stats?.generations.image_edit || 0) + (stats?.generations.image_generate || 0) + (stats?.generations.title || 0) + (stats?.generations.description || 0))}
            color="purple"
          />
          <StatCard
            icon={DollarSign}
            label="Total Cost"
            value={formatCost(stats?.totalCost || 0)}
            color="cyan"
          />
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Products by Status</h3>
            <div className="space-y-3">
              <StatusBar label="Draft" count={stats?.products.draft || 0} total={stats?.products.total || 1} color="bg-gray-400" />
              <StatusBar label="Analyzed" count={(stats as any)?.products?.analyzed || 0} total={stats?.products.total || 1} color="bg-yellow-500" />
              <StatusBar label="Generated" count={stats?.products.generated || 0} total={stats?.products.total || 1} color="bg-blue-500" />
              <StatusBar label="Completed" count={stats?.products.completed || 0} total={stats?.products.total || 1} color="bg-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Generation Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Image Edits</span>
                <span className="font-medium">{stats?.generations.image_edit || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Scene Images</span>
                <span className="font-medium">{stats?.generations.image_generate || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Titles</span>
                <span className="font-medium">{stats?.generations.title || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Descriptions</span>
                <span className="font-medium">{stats?.generations.description || 0}</span>
              </div>
              {stats && stats.generations.failed > 0 && (
                <div className="flex justify-between text-red-500">
                  <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Failed</span>
                  <span className="font-medium">{stats.generations.failed}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* All Products */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">All Products</h3>
            <Link href="/products/new" className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1">
              New Product <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {/* Search & Filter */}
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="analyzed">Analyzed</option>
              <option value="generated">Generated</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          {/* Product List */}
          {loadingProducts ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
            </div>
          ) : filteredProducts.length > 0 ? (
            <>
              <div className="divide-y divide-gray-100">
                {filteredProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {product.original_images?.[0] ? (
                        <img
                          src={product.original_images[0]}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center">
                          <Image className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{product.name || 'Untitled'}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(product.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={product.status} />
                      <span className="text-xs text-gray-500">{formatCost(product.total_cost)}</span>
                      <button
                        onClick={(e) => handleDelete(e, product.id)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  <span>
                    Page {page} / {totalPages} ({total} total)
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="p-10 text-center text-gray-500">
              <p className="text-sm">{searchQuery ? 'No products match your search' : 'No products yet'}</p>
              {!searchQuery && (
                <Link href="/products/new" className="text-sm text-blue-500 hover:text-blue-600 mt-1 inline-block">
                  Create your first product
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    cyan: 'bg-cyan-50 text-cyan-600',
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{count}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`${color} rounded-full h-2 transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    analyzed: 'bg-yellow-100 text-yellow-600',
    generated: 'bg-blue-100 text-blue-600',
    completed: 'bg-green-100 text-green-600',
  };

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${styles[status] || styles.draft}`}>
      {status}
    </span>
  );
}
