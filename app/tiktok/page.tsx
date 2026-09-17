'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';

interface Shop {
  shop_id: string;
  shop_name: string;
  site: string;
  open_id: string;
  status: string;
  access_expires_at: string;
  tokenPreview: string;
}

export default function TiktokPage() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tiktok/status');
      const data = await res.json();
      setShops(data.shops || []);
      setConfigured(!!data.configured);
    } catch {
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startAuth = async () => {
    setAuthorizing(true);
    setError('');
    try {
      const res = await fetch('/api/tiktok/auth/start');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '发起授权失败');
      window.location.href = data.authorizeUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : '发起授权失败');
      setAuthorizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> 返回仪表盘
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-black" /> TikTok 店铺授权
        </h1>
        <p className="text-sm text-gray-500 mb-6">授权后即可把商品一键刊登到 TikTok Shop（先建草稿，审核无误再发布）</p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 py-8"><RefreshCw className="w-4 h-4 animate-spin" /> 加载中…</div>
        ) : (
          <>
            <div className="bg-white rounded-xl border p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-gray-900">已授权店铺</h2>
                <button onClick={load} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" /> 刷新
                </button>
              </div>
              {shops.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">还没有授权任何店铺</p>
              ) : (
                <div className="space-y-3">
                  {shops.map(s => (
                    <div key={s.open_id || s.shop_id} className="flex items-center justify-between border rounded-lg px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{s.shop_name || s.shop_id || '未命名店铺'}</div>
                        <div className="text-xs text-gray-500">站点: {s.site || '未知'} · Token: {s.tokenPreview} · 有效期至 {s.access_expires_at?.slice(0, 10)}</div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {s.status === 'active' ? '有效' : s.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border p-6">
              <button
                onClick={startAuth}
                disabled={authorizing || !configured}
                className="w-full py-2.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {authorizing ? '跳转 TikTok 授权页…' : '授权新的 TikTok 店铺'}
              </button>
              {!configured && (
                <p className="text-xs text-orange-600 mt-3">尚未配置 TIKTOK_APP_KEY / TIKTOK_APP_SECRET（.env），配置后需重启服务</p>
              )}
              <div className="mt-4 text-xs text-gray-500 leading-relaxed">
                <p className="font-medium text-gray-600 mb-1">授权流程说明：</p>
                <p>1. 点击上方按钮跳转 TikTok 授权页（用店铺所属账号登录）</p>
                <p>2. 确认授权后 TikTok 会带授权码回到本系统（自动完成换 token 入库）</p>
                <p>3. 看到绿色「授权成功」页即完成，回到本页刷新可见店铺</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
