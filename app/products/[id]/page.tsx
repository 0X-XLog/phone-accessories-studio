'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import ImageUploader from '@/components/ImageUploader';
import { formatCost } from '@/lib/cost';
import {
  Package,
  Type,
  FileText,
  Image as ImageIcon,
  Download,
  Sparkles,
  Loader2,
  Save,
  Check,
  Copy,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  Tag,
  Target,
  Users,
  Lightbulb,
  Palette,
  Box,
  Layers,
  Upload,
  Wand2,
  Eye,
  ArrowRight,
  ArrowUpLeft,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  color: string;
  material: string;
  specs: Record<string, string>;
  selling_points: string[];
  original_images: string[];
  description_images: string[];
  original_image_sources: string[];
  desc_image_sources: string[];
  original_notes_html: string;
  images?: GeneratedImage[];
  ai_analysis: {
    productType: string;
    color: string;
    material: string;
    quantityPackage: string;
    usageScenarios: string[];
    targetUsers: string;
    suggestedPoints: string[];
    competitorKeywords: string[];
  };
  title_shopee_en: string;
  title_shopee_ms: string;
  title_tiktok_en: string;
  title_tiktok_ms: string;
  title_tiktok_zh: string;
  title_tiktok_th: string;
  title_lazada_en: string;
  title_lazada_ms: string;
  description_short: string;
  description_long: string;
  description_bullets: string[];
  description_specs: Record<string, string>;
  description_faq: { q: string; a: string }[];
  core_keywords: string[];
  longtail_keywords: string[];
  source: string;
  ms_detail_id: number | null;
  status: string;
  total_cost: number;
  created_at: string;
}

interface GeneratedImage {
  id: string;
  type: string;
  prompt: string;
  original_image_url: string;
  generated_image_url: string;
  created_at: string;
}

type TabId = 'info' | 'titles' | 'descriptions' | 'images' | 'export';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'info', label: 'Product Info', icon: <Package className="w-4 h-4" /> },
  { id: 'titles', label: 'Titles', icon: <Type className="w-4 h-4" /> },
  { id: 'descriptions', label: 'Descriptions', icon: <FileText className="w-4 h-4" /> },
  { id: 'images', label: 'Images', icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'export', label: 'Export', icon: <Download className="w-4 h-4" /> },
];

const TITLE_FIELDS = [
  { key: 'title_tiktok_en' as const, label: 'TikTok English', maxLength: 80 },
  { key: 'title_tiktok_ms' as const, label: 'TikTok Malay', maxLength: 80 },
  { key: 'title_tiktok_zh' as const, label: 'TikTok 中文', maxLength: 80 },
  { key: 'title_tiktok_th' as const, label: 'TikTok ไทย', maxLength: 80 },
];

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // AI operation states
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingTitles, setGeneratingTitles] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [imageProgress, setImageProgress] = useState({ current: 0, total: 0 });
  const [enhanceMainOnly, setEnhanceMainOnly] = useState(true);
  const [error, setError] = useState('');
  const [msSyncing, setMsSyncing] = useState(false);
  const [msSyncSuccess, setMsSyncSuccess] = useState(false);
  const [msSyncMsg, setMsSyncMsg] = useState('');
  const [msSyncTitleField, setMsSyncTitleField] = useState('name');
  const [msUseAiImages, setMsUseAiImages] = useState(false);
  const [ttPrice, setTtPrice] = useState('');
  const [ttStock, setTtStock] = useState('99');
  const [ttPushing, setTtPushing] = useState(false);
  const [ttPushOk, setTtPushOk] = useState(false);
  const [ttPushMsg, setTtPushMsg] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadAll = useCallback(async () => {
    if (!product?.id || isDownloading) return;
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/download-images?id=${product.id}&generated=true`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Extract filename from Content-Disposition header
      const cd = res.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename="?(.+?)"?$/);
      a.download = match ? decodeURIComponent(match[1]) : 'images.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsDownloading(false);
    }
  }, [product?.id, isDownloading]);

  // Editing states
  const [editingSpecs, setEditingSpecs] = useState<{ key: string; value: string }[]>([]);
  const [editingPoints, setEditingPoints] = useState<string[]>([]);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [descPlatform, setDescPlatform] = useState<'shopee' | 'tiktok' | 'lazada'>('shopee');
  const [editingDescShort, setEditingDescShort] = useState('');
  const [editingDescLong, setEditingDescLong] = useState('');
  const [editingBullets, setEditingBullets] = useState<string[]>([]);
  const [editingFaq, setEditingFaq] = useState<{ q: string; a: string }[]>([]);

  const fetchProduct = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setProduct(data.product ?? data);
      setGeneratedImages(data.images ?? []);
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // Sync editing states when product changes
  useEffect(() => {
    if (!product) return;
    setEditingSpecs(Object.entries(product.specs || {}).map(([key, value]) => ({ key, value })));
    setEditingPoints([...(product.selling_points || [])]);
    setEditingDescShort(product.description_short || '');
    setEditingDescLong(product.description_long || '');
    setEditingBullets([...(product.description_bullets || [])]);
    setEditingFaq([...(product.description_faq || [])]);
  }, [product?.id]);

  const handleUpdateProduct = async (updates: Partial<Product>) => {
    if (!product) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      setProduct(data.product ?? { ...product, ...updates });
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveImage = async (url: string) => {
    if (!product) return;
    const imgs = product.original_images || [];
    const sources = product.original_image_sources || [];
    const idx = imgs.indexOf(url);
    const updatedImgs = imgs.filter(u => u !== url);
    const updatedSources = idx >= 0 && idx < sources.length ? sources.filter((_, i) => i !== idx) : sources;
    await handleUpdateProduct({ original_images: updatedImgs, original_image_sources: updatedSources });
  };

  const handleRemoveDescImage = async (url: string) => {
    if (!product) return;
    const imgs = product.description_images || [];
    const sources = product.desc_image_sources || [];
    const idx = imgs.indexOf(url);
    const updatedImgs = imgs.filter(u => u !== url);
    const updatedSources = idx >= 0 && idx < sources.length ? sources.filter((_, i) => i !== idx) : sources;
    await handleUpdateProduct({ description_images: updatedImgs, desc_image_sources: updatedSources });
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // silent
    }
  };

  const handleSyncToMiaoshou = async () => {
    if (!product || !product.ms_detail_id) return;
    setMsSyncing(true);
    setMsSyncSuccess(false);
    setMsSyncMsg('Looking up TikTok collect box...');
    try {
      // Base lists are position-aligned pairs: R2 image (imported) <-> alicdn source (1688 original)
      // When AI-sync is on, replace each position with its AI-generated version if one exists,
      // falling back to the alicdn source (Miaoshou only renders alicdn/R2 public URLs).
      const genMap = new Map(
        generatedImages.filter((g) => g.generated_image_url).map((g) => [g.original_image_url, g.generated_image_url])
      );
      const withAi = (sources: string[], r2List: string[]) =>
        msUseAiImages ? sources.map((src, i) => genMap.get(r2List[i] || '') || src) : sources;
      const sources = withAi(
        product.original_image_sources || product.original_images || [],
        product.original_images || []
      );
      const descSources = withAi(
        product.desc_image_sources || product.description_images || [],
        product.description_images || []
      );

      // Build description HTML from description_long + bullets + desc images (R2 URLs)
      const descParts: string[] = [];
      const descLong = product.description_long || '';
      if (descLong) {
        descLong.split('\n').filter(Boolean).forEach((p) => {
          descParts.push(`<p>${p}</p>`);
        });
      }
      const bullets = product.description_bullets || [];
      if (bullets.length > 0) {
        descParts.push('<ul>');
        bullets.forEach((b) => {
          if (b) descParts.push(`<li>${b}</li>`);
        });
        descParts.push('</ul>');
      }
      // Add description images (alicdn sources for Miaoshou compatibility)
      if (descSources.length > 0) {
        descParts.push('<p>');
        descSources.forEach((url) => {
          descParts.push(`<img src="${url}" />`);
        });
        descParts.push('</p>');
      }
      const descriptionHtml = descParts.join('');

      // Step 1: Look up TikTok collect box item by commonCollectBoxDetailId
      const lookupRes = await fetch('/api/miaoshou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tiktok_lookup', detailId: product.ms_detail_id }),
      });
      if (!lookupRes.ok) {
        const err = await lookupRes.json();
        throw new Error(err.error || 'TikTok lookup failed');
      }
      const tiktok = await lookupRes.json();
      if (!tiktok.detailId) throw new Error('未在TikTok采集箱中找到该商品，请先在妙手中认领到TikTok店铺');

      setMsSyncMsg('Syncing to TikTok collect box...');

      // Step 2: Determine sync title
      const syncTitle = msSyncTitleField === 'name'
        ? product.name
        : (product as unknown as Record<string, string>)[msSyncTitleField] || '';

      // Step 3: Sync to TikTok collect box (supports R2 images!)
      const res = await fetch('/api/miaoshou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit_tiktok',
          detailId: tiktok.detailId,
          productId: product.id,
          shopId: tiktok.shopId,
          title: syncTitle || undefined,
          description: product.description_short || '',
          image_sources: sources,
          description_html: descriptionHtml,
          original_notes_html: product.original_notes_html || '',
          desc_image_sources: descSources,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Sync failed');
      }

      const result = await res.json();
      const r2Count = result.r2ImageCount || 0;
      setMsSyncSuccess(true);
      setMsSyncMsg(`Synced to TikTok! ${sources.length} images (${r2Count} AI-modified via R2)`);
      router.refresh();
    } catch (err) {
      setMsSyncMsg('Sync failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setMsSyncing(false);
    }
  };

  const handlePushToTiktok = async () => {
    if (!product) return;
    if (!ttPrice || Number(ttPrice) <= 0) {
      setTtPushOk(false);
      setTtPushMsg('请先填写售价');
      return;
    }
    setTtPushing(true);
    setTtPushMsg('正在上传图片并创建 TikTok 草稿…');
    try {
      const res = await fetch('/api/tiktok/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          titleField: msSyncTitleField,
          price: ttPrice,
          stock: ttStock,
          useAiImages: msUseAiImages,
          publish: false,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setTtPushOk(true);
      setTtPushMsg(`草稿已创建（商品ID: ${data.tiktok_product_id}，${data.imageCount} 张图）— 请到 TikTok 卖家中心检查类目/属性后发布`);
      router.refresh();
    } catch (err) {
      setTtPushOk(false);
      setTtPushMsg('推送失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setTtPushing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!product) return;
    setAnalyzing(true);
    setError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          name: product.name,
          category: product.category,
          brand: product.brand,
          color: product.color,
          material: product.material,
          specs: product.specs,
          sellingPoints: product.selling_points,
          images: (product.original_images || []).slice(0, 3),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Analysis failed');
      }
      const data = await res.json();
      // Update product state directly from API response
      if (product && data.analysis) {
        setProduct({ ...product, ai_analysis: data.analysis });
        // Sync editing states that depend on product data
        if (data.analysis.suggestedPoints) {
          setEditingPoints([...data.analysis.suggestedPoints]);
        }
      } else {
        await fetchProduct();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateTitles = async () => {
    if (!product) return;
    setGeneratingTitles(true);
    setError('');
    try {
      const res = await fetch('/api/titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          name: product.name,
          category: product.category,
          brand: product.brand,
          color: product.color,
          material: product.material,
          specs: product.specs || {},
          keywords: product.ai_analysis?.competitorKeywords || [],
          sellingPoints: product.selling_points || [],
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Title generation failed');
      }
      const data = await res.json();
      // Update product state directly from API response
      if (product && data.titles) {
        setProduct({
          ...product,
          ...data.titles,
        });
      } else {
        await fetchProduct();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate titles');
    } finally {
      setGeneratingTitles(false);
    }
  };

  const [descLang, setDescLang] = useState<string>('en');

  const handleGenerateDescription = async () => {
    if (!product) return;
    setGeneratingDesc(true);
    setError('');
    try {
      const res = await fetch('/api/descriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          platform: 'tiktok',
          name: product.name,
          category: product.category,
          brand: product.brand,
          color: product.color,
          material: product.material,
          specs: product.specs || {},
          keywords: product.ai_analysis?.competitorKeywords || [],
          sellingPoints: product.selling_points || [],
          aiAnalysis: product.ai_analysis || null,
          lang: descLang,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Description generation failed');
      }
      const data = await res.json();
      // Update product state directly from API response
      setProduct({
        ...product,
        description_short: data.short || '',
        description_long: data.long || '',
        description_bullets: data.bullets || [],
        description_specs: data.specs || {},
        description_faq: data.faq || [],
        status: product.status === 'generated' ? product.status : 'generated',
      });
      // Sync editing states directly (useEffect dep on product.id won't re-trigger)
      setEditingDescShort(data.short || '');
      setEditingDescLong(data.long || '');
      setEditingBullets(data.bullets || []);
      setEditingFaq(data.faq || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate description');
    } finally {
      setGeneratingDesc(false);
    }
  };

  const handleEnhanceAllImages = async () => {
    if (!product) return;
    const mainImages = product.original_images || [];
    const descImages = product.description_images || [];
    const allImages = enhanceMainOnly ? mainImages : [...mainImages, ...descImages];
    if (!allImages.length) return;
    setGeneratingImages(true);
    setError('');
    // Skip images that already have generated versions (进度可续：刷新/中断后重新点击，已完成的自动跳过)
    const alreadyEnhanced = new Set(generatedImages.map(img => img.original_image_url));
    const doneCount = allImages.filter(url => alreadyEnhanced.has(url)).length;
    const pendingImages = allImages.filter(url => !alreadyEnhanced.has(url));

    if (pendingImages.length === 0) {
      setError('全部图片都已完成增强，无需重做');
      setGeneratingImages(false);
      return;
    }
    if (doneCount > 0) {
      setError(`已自动跳过 ${doneCount} 张完成图，继续处理剩余 ${pendingImages.length} 张…`);
    }

    setImageProgress({ current: 0, total: pendingImages.length });
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < pendingImages.length; i++) {
      setImageProgress({ current: i + 1, total: pendingImages.length });
      try {
        const res = await fetch('/api/images/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            type: 'enhance',
            originalImageUrl: pendingImages[i],
            category: product.category,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Image enhance failed');
        }
        successCount++;
        await fetchProduct();
      } catch (err) {
        failCount++;
        console.error(`Image ${i + 1} enhance failed:`, err);
      }
      if (i < pendingImages.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    const alreadyCount = allImages.length - pendingImages.length;
    if (failCount > 0) {
      setError(`本轮完成 ${successCount}/${pendingImages.length}，失败 ${failCount} 张。失败的稍后重新点「增强」即可续跑，已完成的会自动跳过${alreadyCount > 0 ? `（此前已完成 ${alreadyCount} 张）` : ''}`);
    } else {
      setError(`全部完成 ✅ 本轮增强 ${pendingImages.length} 张${alreadyCount > 0 ? `（此前已完成 ${alreadyCount} 张，自动跳过）` : ''}`);
    }
    setGeneratingImages(false);
    setImageProgress({ current: 0, total: 0 });
  };

  const handleDownloadText = () => {
    if (!product) return;
    const lines: string[] = [];
    lines.push('=== PRODUCT EXPORT ===');
    lines.push(`Name: ${product.name}`);
    lines.push(`Category: ${product.category}`);
    lines.push(`Brand: ${product.brand}`);
    lines.push(`Status: ${product.status}`);
    lines.push(`Total Cost: ${formatCost(product.total_cost)}`);
    lines.push(`Created: ${product.created_at}`);
    lines.push('');

    lines.push('--- TITLES ---');
    if (product.title_tiktok_en) lines.push(`[TikTok EN] ${product.title_tiktok_en}`);
    if (product.title_tiktok_ms) lines.push(`[TikTok MS] ${product.title_tiktok_ms}`);
    if (product.title_tiktok_zh) lines.push(`[TikTok 中文] ${product.title_tiktok_zh}`);
    if (product.title_tiktok_th) lines.push(`[TikTok ไทย] ${product.title_tiktok_th}`);
    lines.push('');

    if (product.core_keywords?.length) {
      lines.push(`Core Keywords: ${product.core_keywords.join(', ')}`);
    }
    if (product.longtail_keywords?.length) {
      lines.push(`Long-tail Keywords: ${product.longtail_keywords.join(', ')}`);
    }
    lines.push('');

    lines.push('--- DESCRIPTION ---');
    if (product.description_short) {
      lines.push(`[Short] ${product.description_short}`);
    }
    if (product.description_long) {
      lines.push(`[Long] ${product.description_long}`);
    }
    if (product.description_bullets?.length) {
      lines.push('[Bullet Points]');
      product.description_bullets.forEach((b) => lines.push(`  - ${b}`));
    }
    if (Object.keys(product.description_specs || {}).length) {
      lines.push('[Specifications]');
      Object.entries(product.description_specs).forEach(([k, v]) => lines.push(`  ${k}: ${v}`));
    }
    if (product.description_faq?.length) {
      lines.push('[FAQ]');
      product.description_faq.forEach((f) => {
        lines.push(`  Q: ${f.q}`);
        lines.push(`  A: ${f.a}`);
      });
    }
    lines.push('');
    lines.push('--- SELLING POINTS ---');
    (product.selling_points || []).forEach((p) => lines.push(`  - ${p}`));

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_export.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderBasicMarkdown = (text: string) => {
    if (!text) return '';
    try {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');
    } catch {
      return text.replace(/\n/g, '<br/>');
    }
  };

  const addSpec = () => setEditingSpecs([...editingSpecs, { key: '', value: '' }]);
  const removeSpec = (i: number) => setEditingSpecs(editingSpecs.filter((_, idx) => idx !== i));
  const updateSpec = (i: number, field: 'key' | 'value', val: string) => {
    const updated = [...editingSpecs];
    updated[i] = { ...updated[i], [field]: val };
    setEditingSpecs(updated);
  };
  const saveSpecs = () => {
    const specs: Record<string, string> = {};
    editingSpecs.forEach(({ key, value }) => {
      if (key.trim()) specs[key.trim()] = value.trim();
    });
    handleUpdateProduct({ specs });
  };

  const addPoint = () => setEditingPoints([...editingPoints, '']);
  const removePoint = (i: number) => setEditingPoints(editingPoints.filter((_, idx) => idx !== i));
  const updatePoint = (i: number, val: string) => {
    const updated = [...editingPoints];
    updated[i] = val;
    setEditingPoints(updated);
  };
  const savePoints = () => {
    handleUpdateProduct({ selling_points: editingPoints.filter((p) => p.trim()) });
  };

  // ===================== LOADING =====================
  if (loading) {
    return (
      <Layout>
        <Header title="Loading..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <Header title="Product Not Found" />
        <div className="p-6 text-center text-gray-500">Product not found</div>
      </Layout>
    );
  }

  // ===================== TAB 1: PRODUCT INFO =====================
  const renderInfoTab = () => (
    <div className="space-y-6">
      {error && (
        <div className="text-sm text-red-500 bg-red-50 px-4 py-2.5 rounded-lg">{error}</div>
      )}

      {/* Basic Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Box className="w-4 h-4 text-blue-500" />
            Basic Information
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleUpdateProduct({
                name: product.name,
                category: product.category,
                brand: product.brand,
                color: product.color,
                material: product.material,
              })}
              disabled={saving}
              className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Product Name</label>
            <input
              type="text"
              value={product.name}
              onChange={(e) => setProduct({ ...product, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
            <input
              type="text"
              value={product.category}
              onChange={(e) => setProduct({ ...product, category: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Brand</label>
            <input
              type="text"
              value={product.brand}
              onChange={(e) => setProduct({ ...product, brand: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Color</label>
            <input
              type="text"
              value={product.color}
              onChange={(e) => setProduct({ ...product, color: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Material</label>
            <input
              type="text"
              value={product.material}
              onChange={(e) => setProduct({ ...product, material: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Status & Cost */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            product.status === 'completed' ? 'bg-green-100 text-green-600' :
            product.status === 'generated' ? 'bg-blue-100 text-blue-600' :
            product.status === 'processing' ? 'bg-yellow-100 text-yellow-600' :
            'bg-gray-100 text-gray-600'
          }`}>{product.status}</span>
          <span className="text-xs text-gray-500">Cost: {formatCost(product.total_cost)}</span>
          <span className="text-xs text-gray-400">Created: {new Date(product.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Specifications */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            Specifications
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={addSpec}
              className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
            <button
              onClick={saveSpecs}
              disabled={saving}
              className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Specs
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {editingSpecs.map((spec, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={spec.key}
                onChange={(e) => updateSpec(i, 'key', e.target.value)}
                placeholder="Key (e.g. Weight)"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={spec.value}
                onChange={(e) => updateSpec(i, 'value', e.target.value)}
                placeholder="Value"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={() => removeSpec(i)} className="text-gray-400 hover:text-red-500 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {editingSpecs.length === 0 && (
            <p className="text-sm text-gray-400">No specifications added yet</p>
          )}
        </div>
      </div>

      {/* Selling Points */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-blue-500" />
            Selling Points
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={addPoint}
              className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
            <button
              onClick={savePoints}
              disabled={saving}
              className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Points
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {editingPoints.map((point, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-blue-500 text-sm font-medium w-5">{i + 1}.</span>
              <input
                type="text"
                value={point}
                onChange={(e) => updatePoint(i, e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={() => removePoint(i)} className="text-gray-400 hover:text-red-500 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {editingPoints.length === 0 && (
            <p className="text-sm text-gray-400">No selling points added yet</p>
          )}
        </div>
      </div>

      {/* Original Images Gallery */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
          <ImageIcon className="w-4 h-4 text-blue-500" />
          Original Images
        </h3>
        {(product.original_images || []).length > 0 ? (
          <div className="grid grid-cols-4 gap-3 mb-4">
            {product.original_images.map((url, i) => (
              <div key={url + i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                <img src={url} alt={`Original ${i + 1}`} className="w-full h-full object-contain" />
                <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/50 rounded px-1">{i + 1}</span>
                <div className="absolute top-1 right-1 flex gap-1">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 bg-blue-500/90 rounded-full flex items-center justify-center hover:bg-blue-600">
                    <ExternalLink className="w-3.5 h-3.5 text-white" />
                  </a>
                  <button
                    onClick={() => handleRemoveImage(url)}
                    className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-4">No images uploaded yet</p>
        )}
        <ImageUploader
          onUpload={async (urls: string[]) => {
            await handleUpdateProduct({
              original_images: [...(product.original_images || []), ...urls],
              original_image_sources: [...(product.original_image_sources || []), ...urls],
            });
          }}
          maxFiles={50 - (product.original_images || []).length}
          existingImages={[]}
        />
      </div>

      {/* Description Images (from 1688/Miaoshou detail section) */}
      {(product.description_images || []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-500" />
              Description Images
              <span className="text-xs font-normal text-gray-400">
                ({product.description_images.length} images from product description)
              </span>
            </h3>
            <button
              onClick={async () => {
                if (!confirm('Remove all description images?')) return;
                await handleUpdateProduct({ description_images: [], desc_image_sources: [] });
              }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Remove All
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {product.description_images.map((url, i) => (
              <div key={url + i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                <img src={url} alt={`Desc ${i + 1}`} className="w-full h-full object-contain" />
                <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/50 rounded px-1">{i + 1}</span>
                <div className="absolute top-1 right-1 flex gap-1">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 bg-blue-500/90 rounded-full flex items-center justify-center hover:bg-blue-600">
                    <ExternalLink className="w-3.5 h-3.5 text-white" />
                  </a>
                  <button
                    onClick={() => handleRemoveDescImage(url)}
                    className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            AI Analysis
          </h3>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Run AI Analysis
              </>
            )}
          </button>
        </div>

        {product.ai_analysis && (product.ai_analysis.productType || product.ai_analysis.color) ? (
          <div className="grid grid-cols-2 gap-4">
            {product.ai_analysis.productType && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-1.5 text-blue-700 text-xs font-medium mb-1">
                  <Target className="w-3.5 h-3.5" /> Product Type
                </div>
                <p className="text-sm text-blue-900">{product.ai_analysis.productType}</p>
              </div>
            )}
            {product.ai_analysis.color && (
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-1.5 text-purple-700 text-xs font-medium mb-1">
                  <Palette className="w-3.5 h-3.5" /> Color Analysis
                </div>
                <p className="text-sm text-purple-900">{product.ai_analysis.color}</p>
              </div>
            )}
            {product.ai_analysis.material && (
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-1.5 text-green-700 text-xs font-medium mb-1">
                  <Box className="w-3.5 h-3.5" /> Material
                </div>
                <p className="text-sm text-green-900">{product.ai_analysis.material}</p>
              </div>
            )}
            {product.ai_analysis.quantityPackage && (
              <div className="bg-amber-50 rounded-lg p-4">
                <div className="flex items-center gap-1.5 text-amber-700 text-xs font-medium mb-1">
                  <Layers className="w-3.5 h-3.5" /> Quantity / Package
                </div>
                <p className="text-sm text-amber-900">{product.ai_analysis.quantityPackage}</p>
              </div>
            )}
            {product.ai_analysis.targetUsers && (
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center gap-1.5 text-orange-700 text-xs font-medium mb-1">
                  <Users className="w-3.5 h-3.5" /> Target Users
                </div>
                <p className="text-sm text-orange-900">{product.ai_analysis.targetUsers}</p>
              </div>
            )}
            {product.ai_analysis.usageScenarios?.length > 0 && (
              <div className="bg-cyan-50 rounded-lg p-4 col-span-2">
                <div className="text-cyan-700 text-xs font-medium mb-2">Usage Scenarios</div>
                <div className="flex flex-wrap gap-1.5">
                  {product.ai_analysis.usageScenarios.map((s, i) => (
                    <span key={i} className="text-xs bg-cyan-100 text-cyan-800 px-2.5 py-1 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {product.ai_analysis.suggestedPoints?.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4 col-span-2">
                <div className="text-blue-700 text-xs font-medium mb-2">Suggested Selling Points</div>
                <ul className="space-y-1">
                  {product.ai_analysis.suggestedPoints.map((p, i) => (
                    <li key={i} className="text-sm text-blue-900 flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {product.ai_analysis.competitorKeywords?.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 col-span-2">
                <div className="text-gray-700 text-xs font-medium mb-2">Competitor Keywords</div>
                <div className="flex flex-wrap gap-1.5">
                  {product.ai_analysis.competitorKeywords.map((kw, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">{kw}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">
            No AI analysis yet. Click "Run AI Analysis" to generate insights.
          </p>
        )}
      </div>
    </div>
  );

  // ===================== TAB 2: TITLES =====================
  const renderTitlesTab = () => (
    <div className="space-y-6">
      {error && (
        <div className="text-sm text-red-500 bg-red-50 px-4 py-2.5 rounded-lg">{error}</div>
      )}

      {/* Generate All Titles */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-base">Generate TikTok Titles</h3>
            <p className="text-blue-100 text-sm mt-0.5">AI will generate optimized titles in 4 languages</p>
          </div>
          <button
            onClick={handleGenerateTitles}
            disabled={generatingTitles}
            className="flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 disabled:bg-blue-200 disabled:text-blue-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {generatingTitles ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            ) : (
              <><Wand2 className="w-4 h-4" /> Generate All Titles</>
            )}
          </button>
        </div>
      </div>

      {/* Title Inputs */}
      {TITLE_FIELDS.map((field) => (
        <div key={field.key} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">{field.label}</label>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${product[field.key]?.length > field.maxLength ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                {(product[field.key] || '').length}/{field.maxLength}
              </span>
              {(product[field.key] || '') && (
                <button
                  onClick={() => copyToClipboard(product[field.key], field.key)}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                >
                  {copied === field.key ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
          <input
            type="text"
            value={product[field.key] || ''}
            onChange={(e) => setProduct({ ...product, [field.key]: e.target.value })}
            onBlur={() => handleUpdateProduct({ [field.key]: product[field.key] })}
            maxLength={field.maxLength + 20}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      ))}

      {/* Core Keywords */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-blue-500" />
            Core Keywords
          </label>
          {(product.core_keywords || []).length > 0 && (
            <button
              onClick={() => copyToClipboard((product.core_keywords || []).join(', '), 'core-kw')}
              className="text-xs text-gray-400 hover:text-blue-500 flex items-center gap-1"
            >
              {copied === 'core-kw' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              Copy All
            </button>
          )}
        </div>
        {(product.core_keywords || []).length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {product.core_keywords.map((kw, i) => (
              <span key={i} className="inline-flex items-center text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                {kw}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No core keywords generated yet</p>
        )}
      </div>

      {/* Long-tail Keywords */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-blue-500" />
            Long-tail Keywords
          </label>
          {(product.longtail_keywords || []).length > 0 && (
            <button
              onClick={() => copyToClipboard((product.longtail_keywords || []).join(', '), 'longtail-kw')}
              className="text-xs text-gray-400 hover:text-blue-500 flex items-center gap-1"
            >
              {copied === 'longtail-kw' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              Copy All
            </button>
          )}
        </div>
        {(product.longtail_keywords || []).length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {product.longtail_keywords.map((kw, i) => (
              <span key={i} className="inline-flex items-center text-xs bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                {kw}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No long-tail keywords generated yet</p>
        )}
      </div>
    </div>
  );

  // ===================== TAB 3: DESCRIPTIONS =====================
  const renderDescriptionsTab = () => (
    <div className="space-y-6">
      {error && (
        <div className="text-sm text-red-500 bg-red-50 px-4 py-2.5 rounded-lg">{error}</div>
      )}

      {/* Generate Description */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-medium text-base">Generate Description</h3>
            <p className="text-blue-100 text-sm mt-0.5">AI generates product description for the selected platform</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={descLang}
              onChange={(e) => setDescLang(e.target.value)}
              disabled={generatingDesc}
              className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2 text-sm disabled:bg-white/10"
            >
              <option value="en">English</option>
              <option value="ms">Bahasa Melayu</option>
              <option value="zh">中文</option>
              <option value="th">ภาษาไทย</option>
            </select>
            <button
              onClick={handleGenerateDescription}
              disabled={generatingDesc}
              className="flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 disabled:bg-blue-200 disabled:text-blue-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {generatingDesc ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              ) : (
                <><Wand2 className="w-4 h-4" /> Generate</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Short Description */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Short Description</h3>
          {editingDescShort && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{editingDescShort.length} chars</span>
              <button
                onClick={() => copyToClipboard(editingDescShort, 'desc-short')}
                className="p-1 text-gray-400 hover:text-blue-500"
              >
                {copied === 'desc-short' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
        <textarea
          value={editingDescShort}
          onChange={(e) => setEditingDescShort(e.target.value)}
          onBlur={() => handleUpdateProduct({ description_short: editingDescShort })}
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Brief product description..."
        />
      </div>

      {/* Long Description */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Long Description</h3>
          <div className="flex items-center gap-2">
            {editingDescLong && (
              <button
                onClick={() => copyToClipboard(editingDescLong, 'desc-long')}
                className="p-1 text-gray-400 hover:text-blue-500"
              >
                {copied === 'desc-long' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
        {editingDescLong ? (
          <>
            {/* Preview */}
            <div className="bg-gray-50 rounded-lg p-4 mb-3 text-sm text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderBasicMarkdown(editingDescLong) }}
            />
            {/* Edit */}
            <textarea
              value={editingDescLong}
              onChange={(e) => setEditingDescLong(e.target.value)}
              onBlur={() => handleUpdateProduct({ description_long: editingDescLong })}
              rows={10}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">No long description generated yet</p>
        )}
      </div>

      {/* Bullet Points */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Bullet Points</h3>
          {editingBullets.length > 0 && (
            <button
              onClick={() => copyToClipboard(editingBullets.map((b, i) => `${i + 1}. ${b}`).join('\n'), 'desc-bullets')}
              className="text-xs text-gray-400 hover:text-blue-500 flex items-center gap-1"
            >
              {copied === 'desc-bullets' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              Copy All
            </button>
          )}
        </div>
        {editingBullets.length > 0 ? (
          <ul className="space-y-2">
            {editingBullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-500 font-medium text-sm mt-0.5 shrink-0">{i + 1}.</span>
                <input
                  type="text"
                  value={bullet}
                  onChange={(e) => {
                    const updated = [...editingBullets];
                    updated[i] = e.target.value;
                    setEditingBullets(updated);
                  }}
                  onBlur={() => handleUpdateProduct({ description_bullets: editingBullets })}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setEditingBullets(editingBullets.filter((_, idx) => idx !== i))}
                  className="text-gray-400 hover:text-red-500 p-1 mt-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No bullet points generated yet</p>
        )}
      </div>

      {/* Specs Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-3">Specifications Table</h3>
        {(product.description_specs && Object.keys(product.description_specs).length > 0) ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-50">
                  <th className="text-left text-xs font-medium text-blue-700 px-4 py-2.5 w-1/3">Specification</th>
                  <th className="text-left text-xs font-medium text-blue-700 px-4 py-2.5">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(product.description_specs).map(([key, value], i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-sm text-gray-700 font-medium">{key}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No specifications table generated yet</p>
        )}
      </div>

      {/* FAQ Accordion */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-3">FAQ</h3>
        {(product.description_faq || []).length > 0 ? (
          <div className="space-y-2">
            {(product.description_faq || []).map((faq, i) => (
              <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-blue-500 font-semibold">Q:</span>
                    {faq.q}
                  </span>
                  {openFaqIndex === i ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                {openFaqIndex === i && (
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
                    <span className="text-blue-600 font-semibold">A:</span> {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No FAQ generated yet</p>
        )}
      </div>
    </div>
  );

  // ===================== TAB 4: IMAGES =====================
  const renderImagesTab = () => (
    <div className="space-y-6">
      {error && (
        <div className="text-sm text-red-500 bg-red-50 px-4 py-2.5 rounded-lg">{error}</div>
      )}

      {/* Original Images Gallery */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
          <ImageIcon className="w-4 h-4 text-blue-500" />
          Original Images
          <span className="text-xs font-normal text-gray-400">({(product.original_images || []).length} images)</span>
        </h3>
        {(product.original_images || []).length > 0 ? (
          <div className="grid grid-cols-4 gap-3 mb-4">
            {product.original_images.map((url, i) => (
              <div key={url + i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                <img src={url} alt={`Original ${i + 1}`} className="w-full h-full object-contain" />
                <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/50 rounded px-1">{i + 1}</span>
                <div className="absolute top-1 right-1 flex gap-1">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 bg-blue-500/90 rounded-full flex items-center justify-center hover:bg-blue-600">
                    <ExternalLink className="w-3.5 h-3.5 text-white" />
                  </a>
                  <button
                    onClick={() => handleRemoveImage(url)}
                    className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-4">No images uploaded yet</p>
        )}
        <ImageUploader
          onUpload={async (urls: string[]) => {
            await handleUpdateProduct({
              original_images: [...(product.original_images || []), ...urls],
              original_image_sources: [...(product.original_image_sources || []), ...urls],
            });
          }}
          maxFiles={50 - (product.original_images || []).length}
          existingImages={[]}
        />
      </div>

      {/* Description Images (from 1688/Miaoshou detail section) */}
      {(product.description_images || []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-500" />
              Description Images
              <span className="text-xs font-normal text-gray-400">
                ({product.description_images.length} images from product description)
              </span>
            </h3>
            <button
              onClick={async () => {
                if (!confirm('Remove all description images?')) return;
                await handleUpdateProduct({ description_images: [], desc_image_sources: [] });
              }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Remove All
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {product.description_images.map((url, i) => (
              <div key={url + i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                <img src={url} alt={`Desc ${i + 1}`} className="w-full h-full object-contain" />
                <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/50 rounded px-1">{i + 1}</span>
                <div className="absolute top-1 right-1 flex gap-1">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 bg-blue-500/90 rounded-full flex items-center justify-center hover:bg-blue-600">
                    <ExternalLink className="w-3.5 h-3.5 text-white" />
                  </a>
                  <button
                    onClick={() => handleRemoveDescImage(url)}
                    className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated Images */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-purple-500" />
          Generated Images
          {generatedImages.length > 0 && (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                generatedImages.forEach((img, idx) => {
                  setTimeout(() => {
                    const a = document.createElement('a');
                    a.href = img.generated_image_url;
                    a.download = `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_${idx + 1}.png`;
                    a.target = '_blank';
                    a.rel = 'noopener';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }, idx * 500);
                });
              }}
              className="ml-auto text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download All ({generatedImages.length})
            </a>
          )}
        </h3>
        {generatedImages.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {generatedImages.map((img) => (
              <div key={img.id} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                <img
                  src={img.generated_image_url}
                  alt={img.type}
                  className="w-full aspect-square object-contain bg-white"
                />
                {/* Type Badge */}
                <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                  img.type === 'main_white'
                    ? 'bg-white text-gray-700 border border-gray-200'
                    : img.type === 'scene'
                    ? 'bg-blue-500 text-white'
                    : img.type === 'selling_point'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-500 text-white'
                }`}>
                  {img.type.replace(/_/g, ' ')}
                </span>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a
                    href={img.generated_image_url}
                    download={`${product.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`}
                    target="_blank"
                    rel="noopener"
                    className="text-white text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Save
                  </a>
                  <a
                    href={img.generated_image_url}
                    target="_blank"
                    rel="noopener"
                    className="text-white text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open
                  </a>
                </div>
                {/* Prompt */}
                {img.prompt && (
                  <div className="p-2 border-t border-gray-100">
                    <p className="text-xs text-gray-400 truncate">{img.prompt}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">
            No generated images yet. Upload original images and generate AI images below.
          </p>
        )}
      </div>

      {/* Image Generation */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
          <Wand2 className="w-4 h-4 text-purple-500" />
          AI Image Enhancement
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          AI 高清增强、去中文水印。中断/刷新后重新点击即可<strong>续跑</strong>（已完成的自动跳过，不会重做）。
        </p>
        <label className="flex items-center gap-2 text-sm text-gray-700 mb-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enhanceMainOnly}
            onChange={(e) => setEnhanceMainOnly(e.target.checked)}
            className="w-4 h-4 accent-purple-500"
          />
          只增强主图（推荐：更快更省，主图 {(product.original_images || []).length} 张 / 详情图 {(product.description_images || []).length} 张）
        </label>
        <button
          onClick={handleEnhanceAllImages}
          disabled={generatingImages || !((product.original_images || []).length || (product.description_images || []).length)}
          className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-purple-200 disabled:text-purple-300 text-white rounded-xl p-4 flex items-center justify-center gap-2 transition-colors"
        >
          {generatingImages ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Enhancing Image {imageProgress.current} of {imageProgress.total}...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              <span>Enhance All {(product.original_images || []).length + (product.description_images || []).length} Images
                {(() => {
                  const allImages = [...(product.original_images || []), ...(product.description_images || [])];
                  const already = new Set(generatedImages.map(img => img.original_image_url));
                  const pending = allImages.filter(u => !already.has(u)).length;
                  return pending < allImages.length
                    ? ` (${pending} pending)`
                    : '';
                })()}
              </span>
            </>
          )}
        </button>
        {generatingImages && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${imageProgress.total > 0 ? (imageProgress.current / imageProgress.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">
              {imageProgress.current} / {imageProgress.total} completed
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // ===================== TAB 5: EXPORT =====================
  const renderExportTab = () => (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" />
          Content Summary
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{TITLE_FIELDS.filter(f => product[f.key]).length}</div>
            <div className="text-xs text-blue-500 mt-1">Titles Generated</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {([product.description_short, product.description_long, product.description_bullets?.length > 0, product.description_faq?.length > 0].filter(Boolean).length)}
            </div>
            <div className="text-xs text-green-500 mt-1">Description Sections</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{generatedImages.length}</div>
            <div className="text-xs text-purple-500 mt-1">Images Generated</div>
          </div>
        </div>
      </div>

      {/* Titles Export */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">Titles</h3>
        <div className="space-y-3">
          {TITLE_FIELDS.map((field) => (
            <div key={field.key} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
              <div className="flex-1 min-w-0 mr-3">
                <span className="text-xs font-medium text-gray-500">{field.label}</span>
                <p className="text-sm text-gray-700 truncate mt-0.5">
                  {(product[field.key] || '') || <span className="text-gray-300 italic">Not generated</span>}
                </p>
              </div>
              {(product[field.key] || '') && (
                <button
                  onClick={() => copyToClipboard(product[field.key], `export-${field.key}`)}
                  className="shrink-0 p-1.5 text-gray-400 hover:text-blue-500 bg-white border border-gray-200 rounded-lg transition-colors"
                >
                  {copied === `export-${field.key}` ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Description Export */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">Description</h3>
        <div className="space-y-3">
          {product.description_short && (
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Short Description</span>
                <button
                  onClick={() => copyToClipboard(product.description_short, 'export-short')}
                  className="p-1 text-gray-400 hover:text-blue-500"
                >
                  {copied === 'export-short' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-sm text-gray-700 mt-1">{product.description_short}</p>
            </div>
          )}
          {product.description_long && (
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Long Description</span>
                <button
                  onClick={() => copyToClipboard(product.description_long, 'export-long')}
                  className="p-1 text-gray-400 hover:text-blue-500"
                >
                  {copied === 'export-long' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-sm text-gray-700 mt-1 line-clamp-3">{product.description_long}</p>
            </div>
          )}
          {(product.description_bullets || []).length > 0 && (
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Bullet Points</span>
                <button
                  onClick={() => copyToClipboard(product.description_bullets.map((b, i) => `${i + 1}. ${b}`).join('\n'), 'export-bullets')}
                  className="p-1 text-gray-400 hover:text-blue-500"
                >
                  {copied === 'export-bullets' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <ul className="mt-1 space-y-1">
                {product.description_bullets.map((b, i) => (
                  <li key={i} className="text-sm text-gray-700">{i + 1}. {b}</li>
                ))}
              </ul>
            </div>
          )}
          {(!product.description_short && !product.description_long && !(product.description_bullets || []).length) && (
            <p className="text-sm text-gray-400 text-center py-4">No description content generated yet</p>
          )}
        </div>
      </div>

      {/* Copy All & Download */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            const allContent = [
              product.title_tiktok_en,
              product.title_tiktok_ms,
              product.title_tiktok_zh,
              product.title_tiktok_th,
              '',
              product.description_short,
              '',
              product.description_long,
              '',
              ...(product.description_bullets || []).map((b) => `  - ${b}`),
              '',
              ...(product.core_keywords || []).join(', '),
              '',
              ...(product.longtail_keywords || []).join(', '),
            ].filter(Boolean).join('\n');
            copyToClipboard(allContent, 'export-all');
          }}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-medium transition-colors"
        >
          {copied === 'export-all' ? (
            <><Check className="w-4 h-4" /> Copied!</>
          ) : (
            <><Copy className="w-4 h-4" /> Copy All</>
          )}
        </button>
        <button
          onClick={handleDownloadText}
          className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-xl font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Download TXT
        </button>
      </div>

      {/* Sync to Miaoshou */}
      {product.source === 'miaoshou' && product.ms_detail_id && (
        <div className={`rounded-xl border p-6 ${msSyncSuccess ? 'bg-green-50 border-green-200' : msSyncMsg && !msSyncSuccess ? 'bg-yellow-50 border-yellow-200' : 'bg-orange-50 border-orange-200'}`}>
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <ArrowUpLeft className={`w-4 h-4 ${msSyncSuccess ? 'text-green-500' : 'text-orange-500'}`} />
            Sync to TikTok Collect Box
          </h3>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <label className="text-sm text-gray-600">Sync title:</label>
            <select
              value={msSyncTitleField}
              onChange={(e) => { setMsSyncTitleField(e.target.value); setMsSyncMsg(''); setMsSyncSuccess(false); }}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            >
              <option value="name">中文原标题</option>
              {product.title_tiktok_en && <option value="title_tiktok_en">TikTok English</option>}
              {product.title_tiktok_ms && <option value="title_tiktok_ms">TikTok Malay</option>}
              {product.title_tiktok_zh && <option value="title_tiktok_zh">TikTok 中文</option>}
              {product.title_tiktok_th && <option value="title_tiktok_th">TikTok ไทย</option>}
              {product.title_shopee_en && <option value="title_shopee_en">Shopee English</option>}
              {product.title_shopee_ms && <option value="title_shopee_ms">Shopee Malay</option>}
              {product.title_lazada_en && <option value="title_lazada_en">Lazada English</option>}
              {product.title_lazada_ms && <option value="title_lazada_ms">Lazada Malay</option>}
            </select>
            {msSyncTitleField !== 'name' && (
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                {(product as unknown as Record<string, string>)[msSyncTitleField] || '(empty)'}
              </span>
            )}
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={msUseAiImages}
                onChange={(e) => { setMsUseAiImages(e.target.checked); setMsSyncMsg(''); setMsSyncSuccess(false); }}
                className="w-4 h-4 accent-orange-500"
              />
              使用 AI 增强图（<span className="text-orange-600">{generatedImages.filter((g) => g.generated_image_url).length}</span> 张）
            </label>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={handleDownloadAll}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? 'Preparing ZIP...' : 'Download All Images (ZIP)'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Downloads gallery + description + AI-generated images. Upload the ZIP contents to Miaoshou ERP manually.
          </p>
          {msSyncMsg && (
            <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
              msSyncSuccess ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
            }`}>
              {msSyncSuccess && <Check className="w-4 h-4 inline mr-2" />}
              {msSyncMsg}
            </div>
          )}
          <button
            onClick={handleSyncToMiaoshou}
            disabled={msSyncing || saving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              msSyncSuccess
                ? 'bg-green-500 text-white'
                : 'bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white'
            }`}
          >
            {msSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : msSyncSuccess ? (
              <Check className="w-4 h-4" />
            ) : (
              <ArrowUpLeft className="w-4 h-4" />
            )}
            {msSyncing ? 'Syncing...' : msSyncSuccess ? 'Synced!' : 'Sync to Miaoshou'}
          </button>
          <p className="text-xs text-gray-500 mt-3 leading-relaxed">
            Syncs title &amp; description to Miaoshou TikTok collect box. 勾选"使用 AI 增强图"后，已生成 AI 图的图片位会用 R2 链接回传（未生成的仍用 1688 原图）。若妙手里图片显示异常，请关闭此选项并手动上传 ZIP 内的图片。
          </p>
        </div>
      )}

      {/* Push to TikTok Shop（官方 API 直连） */}
      {product.status === 'generated' || product.description_long ? (
        <div className={`rounded-xl border p-6 mt-6 ${ttPushOk ? 'bg-green-50 border-green-200' : ttPushMsg && !ttPushOk ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
          <h3 className="font-medium text-gray-900 mb-1">刊登到 TikTok Shop（草稿）</h3>
          <p className="text-xs text-gray-500 mb-4">创建草稿到你的 TikTok 卖家中心（不直接发布），确认类目/属性无误后手动发布。授权管理见侧边栏「TikTok 店铺」。</p>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <label className="text-sm text-gray-600">标题:</label>
            <select
              value={msSyncTitleField}
              onChange={(e) => setMsSyncTitleField(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm bg-white"
            >
              <option value="name">中文原标题</option>
              {product.title_tiktok_en && <option value="title_tiktok_en">TikTok English</option>}
              {product.title_tiktok_ms && <option value="title_tiktok_ms">TikTok Malay</option>}
              {product.title_tiktok_zh && <option value="title_tiktok_zh">TikTok 中文</option>}
              {product.title_tiktok_th && <option value="title_tiktok_th">TikTok ไทย</option>}
            </select>
            <label className="text-sm text-gray-600">售价:</label>
            <input
              type="number" step="0.01" min="0" value={ttPrice}
              onChange={(e) => setTtPrice(e.target.value)}
              placeholder="如 19.90"
              className="w-28 px-3 py-1.5 rounded-lg border border-gray-300 text-sm"
            />
            <label className="text-sm text-gray-600">库存:</label>
            <input
              type="number" min="1" value={ttStock}
              onChange={(e) => setTtStock(e.target.value)}
              className="w-20 px-3 py-1.5 rounded-lg border border-gray-300 text-sm"
            />
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox" checked={msUseAiImages}
                onChange={(e) => setMsUseAiImages(e.target.checked)}
                className="w-4 h-4 accent-black"
              />
              使用 AI 增强图
            </label>
          </div>
          {ttPushMsg && (
            <div className={`mb-3 px-4 py-3 rounded-lg text-sm font-medium ${ttPushOk ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
              {ttPushMsg}
            </div>
          )}
          <button
            onClick={handlePushToTiktok}
            disabled={ttPushing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white transition-colors"
          >
            {ttPushing ? '推送中（上传图片约需 1~2 分钟）…' : '创建 TikTok 草稿'}
          </button>
        </div>
      ) : null}
    </div>
  );

  // ===================== MAIN RENDER =====================
  return (
    <Layout>
      <Header title={product.name || 'Product Detail'} />
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Product Header Bar */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">{product.name || 'Untitled Product'}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500">{product.category}</span>
                {product.brand && (
                  <span className="text-xs text-gray-400">&middot; {product.brand}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              product.status === 'completed' ? 'bg-green-100 text-green-600' :
              product.status === 'generated' ? 'bg-blue-100 text-blue-600' :
              product.status === 'processing' ? 'bg-yellow-100 text-yellow-600' :
              'bg-gray-100 text-gray-600'
            }`}>{product.status}</span>
            <span className="text-xs text-gray-500">{formatCost(product.total_cost)}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'info' && renderInfoTab()}
        {activeTab === 'titles' && renderTitlesTab()}
        {activeTab === 'descriptions' && renderDescriptionsTab()}
        {activeTab === 'images' && renderImagesTab()}
        {activeTab === 'export' && renderExportTab()}
      </div>
    </Layout>
  );
}