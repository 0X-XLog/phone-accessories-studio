'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';

interface ProductRow {
  id: string;
  name: string;
  status: string;
  category: string;
  total_cost: number;
}

export default function BatchPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('generated');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState('');
  const [useAiImages, setUseAiImages] = useState(true);
  const [includeSellingPoints, setIncludeSellingPoints] = useState(true);
  const [titleField, setTitleField] = useState('title_tiktok_en');
  const [exportingDetail, setExportingDetail] = useState(false);
  const [detailMsg, setDetailMsg] = useState('');
  const [rate, setRate] = useState('0.65');
  const [profitRate, setProfitRate] = useState('25');
  const [firstLegPerKg, setFirstLegPerKg] = useState('15');
  const [lastMileCny, setLastMileCny] = useState('0');
  const [defaultWeightG, setDefaultWeightG] = useState('200');
  const [defaultPrice, setDefaultPrice] = useState('19.90');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?limit=200&status=${statusFilter}`);
      const data = await res.json();
      setProducts(data.products || []);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [statusFilter]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    setSelected(selected.size === products.length ? new Set() : new Set(products.map(p => p.id)));
  };

  const doExport = async () => {
    if (selected.size === 0) { setMsg('请先勾选商品'); return; }
    setExporting(true);
    setMsg('');
    try {
      const res = await fetch('/api/tiktok/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: [...selected], useAiImages, titleField, includeSellingPoints,
          rate: Number(rate), profitRate: Number(profitRate) / 100,
          firstLegPerKg: Number(firstLegPerKg), lastMileCny: Number(lastMileCny),
          defaultWeightG: Number(defaultWeightG),
          defaultPrice: Number(defaultPrice),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tiktok-import-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg(`✅ 已导出 ${selected.size} 个商品。价格已按「成本+运费反推」模型自动计算（有成本价的商品），可到卖家中心批量导入。`);
    } catch (e) {
      setMsg('导出失败: ' + (e instanceof Error ? e.message : '未知错误'));
    } finally {
      setExporting(false);
    }
  };

  const doExportDetailImages = async () => {
    if (selected.size === 0) { setDetailMsg('请先勾选商品'); return; }
    setExportingDetail(true);
    setDetailMsg('');
    try {
      const res = await fetch('/api/tiktok/export-detail-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: [...selected], useAiImages }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `detail-images-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setDetailMsg(`✅ 详情图已打包（${selected.size} 个商品的文件夹）。解压后每个商品一个文件夹，发布时在卖家中心描述编辑器里逐张上传。`);
    } catch (e) {
      setDetailMsg('导出失败: ' + (e instanceof Error ? e.message : '未知错误'));
    } finally {
      setExportingDetail(false);
    }
  };

  return (
    <Layout>
      <Header title="批量导出 TikTok 导入表" />
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <label className="text-sm text-gray-600">状态筛选:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm bg-white"
            >
              <option value="all">全部</option>
              <option value="generated">已生成（推荐）</option>
              <option value="completed">已完成</option>
              <option value="analyzed">已分析</option>
              <option value="draft">草稿</option>
            </select>
            <button onClick={load} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> 刷新
            </button>
            <span className="text-sm text-gray-500">已选 {selected.size} / {products.length} 个商品</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
            <label className="text-gray-600">标题字段:</label>
            <select
              value={titleField}
              onChange={(e) => setTitleField(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm bg-white"
            >
              <option value="title_tiktok_en">TikTok English</option>
              <option value="title_tiktok_ms">TikTok Malay</option>
              <option value="name">中文原标题</option>
              <option value="title_tiktok_zh">TikTok 中文</option>
            </select>
            <label className="flex items-center gap-1.5 text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox" checked={useAiImages}
                onChange={(e) => setUseAiImages(e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
              优先使用 AI 增强图
            </label>
            <label className="flex items-center gap-1.5 text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox" checked={includeSellingPoints}
                onChange={(e) => setIncludeSellingPoints(e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
              卖点图并入图集（补足9格）
            </label>
            <label className="text-gray-600">目标利润率%:</label>
            <input type="number" step="1" min="0" max="90" value={profitRate}
              onChange={(e) => setProfitRate(e.target.value)} className="w-16 px-2 py-1.5 rounded-lg border border-gray-300 text-sm" />
            <label className="text-gray-600">头程元/kg:</label>
            <input type="number" step="0.5" min="0" value={firstLegPerKg}
              onChange={(e) => setFirstLegPerKg(e.target.value)} className="w-16 px-2 py-1.5 rounded-lg border border-gray-300 text-sm" />
            <label className="text-gray-600">尾程元/件(0=买家承担):</label>
            <input type="number" step="0.5" min="0" value={lastMileCny}
              onChange={(e) => setLastMileCny(e.target.value)} className="w-16 px-2 py-1.5 rounded-lg border border-gray-300 text-sm" />
            <label className="text-gray-600">重量g:</label>
            <input type="number" step="10" min="1" value={defaultWeightG}
              onChange={(e) => setDefaultWeightG(e.target.value)} className="w-16 px-2 py-1.5 rounded-lg border border-gray-300 text-sm" />
            <label className="text-gray-600">汇率:</label>
            <input type="number" step="0.01" min="0" value={rate}
              onChange={(e) => setRate(e.target.value)} className="w-16 px-2 py-1.5 rounded-lg border border-gray-300 text-sm" />
            <label className="text-gray-600">无成本价默认售价RM:</label>
            <input type="number" step="0.10" min="0" value={defaultPrice}
              onChange={(e) => setDefaultPrice(e.target.value)} className="w-20 px-2 py-1.5 rounded-lg border border-gray-300 text-sm" />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 py-8"><RefreshCw className="w-4 h-4 animate-spin" /> 加载中…</div>
          ) : products.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">该状态下没有商品</p>
          ) : (
            <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
              <label className="flex items-center gap-3 px-4 py-2 bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.size === products.length && products.length > 0}
                  onChange={selectAll}
                  className="w-4 h-4 accent-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">全选</span>
              </label>
              {products.map(p => (
                <label key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <span className="text-sm text-gray-900 flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-gray-400">{p.category}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{p.status}</span>
                </label>
              ))}
            </div>
          )}

          {msg && (
            <div className="mt-4 px-4 py-3 rounded-lg text-sm bg-blue-50 text-blue-700 border border-blue-200">{msg}</div>
          )}

          <button
            onClick={doExport}
            disabled={exporting || selected.size === 0}
            className="mt-4 w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl p-4 flex items-center justify-center gap-2 font-medium transition-colors"
          >
            <FileSpreadsheet className="w-5 h-5" />
            {exporting ? '生成中…' : `导出 ${selected.size} 个商品 → TikTok 批量导入表 (.xlsx)`}
          </button>

          {detailMsg && (
            <div className="mt-4 px-4 py-3 rounded-lg text-sm bg-purple-50 text-purple-700 border border-purple-200">{detailMsg}</div>
          )}
          <button
            onClick={doExportDetailImages}
            disabled={exportingDetail || selected.size === 0}
            className="mt-4 w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl p-4 flex items-center justify-center gap-2 font-medium transition-colors"
          >
            <FileSpreadsheet className="w-5 h-5" />
            {exportingDetail ? '打包中（按商品下载图片）…' : `导出 ${selected.size} 个商品 → 详情图 ZIP（人工上传用）`}
          </button>
          <p className="text-xs text-gray-500 mt-2">按商品分文件夹打包详情图（勾选 AI 增强图时优先增强版），发布商品时解压对应文件夹逐张上传到描述区。</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 leading-relaxed">
          <p className="font-medium mb-1">使用说明：</p>
          <p>1. 勾选商品导出官方模板 Excel（一行一个商品；主图+卖点图自动填入 9 格图集，全部为 R2 公开链接）</p>
          <p>2. 零售价自动按「(成本+头程) ÷ (1−扣点26.48%−利润率) × 汇率」计算；无成本价的商品填默认售价（可在上面改）</p>
          <p>3. TikTok 卖家中心 → 商品 → 批量导入 → 上传文件 → 系统生成草稿 → 逐个检查发布</p>
          <p>4. 拿到官方模板后发我一份，我把列名对齐成官方格式，直接上传即可</p>
        </div>
      </div>
    </Layout>
  );
}
