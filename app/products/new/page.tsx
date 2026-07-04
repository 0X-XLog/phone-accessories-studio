'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import ImageUploader from '@/components/ImageUploader';
import { CATEGORIES, detectCategoryFromTitle } from '@/lib/categories';
import { ArrowLeft, Globe, Loader2, Package, Plus, X } from 'lucide-react';

export default function NewProductPage() {
  const router = useRouter();

  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('');
  const [material, setMaterial] = useState('');
  const [sellingPointInput, setSellingPointInput] = useState('');
  const [sellingPoints, setSellingPoints] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [descriptionImages, setDescriptionImages] = useState<string[]>([]);
  const [imageSources, setImageSources] = useState<string[]>([]);
  const [descImageSources, setDescImageSources] = useState<string[]>([]);
  const [originalNotesHtml, setOriginalNotesHtml] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [url1688, setUrl1688] = useState('');
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');

  // Miaoshou collect box state
  const [msItems, setMsItems] = useState<Array<{
    id: number; title: string; thumbnail: string; price: number;
    stock: number; gmtCreate: string;
  }>>([]);
  const [msLoading, setMsLoading] = useState(false);
  const [msError, setMsError] = useState('');
  const [msDetailLoading, setMsDetailLoading] = useState(false);
  const [msSelectedDetailId, setMsSelectedDetailId] = useState<number | null>(null);
  const [msSearch, setMsSearch] = useState('');

  // Miaoshou filtered items
  const msFilteredItems = msSearch
    ? msItems.filter((item) => item.title.toLowerCase().includes(msSearch.toLowerCase()))
    : msItems;

  // Tag-style selling point management
  const addSellingPoint = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !sellingPoints.includes(trimmed)) {
      setSellingPoints([...sellingPoints, trimmed]);
    }
    setSellingPointInput('');
  };

  const removeSellingPoint = (index: number) => {
    setSellingPoints(sellingPoints.filter((_, i) => i !== index));
  };

  const handleSellingPointKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSellingPoint(sellingPointInput);
    }
  };

  // 1688 scrape
  const handleScrape1688 = async () => {
    if (!url1688.trim()) return;
    setScraping(true);
    setScrapeError('');
    try {
      const res = await fetch('/api/scrape-1688', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url1688.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Scrape failed');
      }
      const data = await res.json();
      if (data.title) setName(data.title);
      if (data.category) setCategory(data.category);
      if (data.images?.length > 0) setImages(data.images);
      if (data.description_images?.length > 0) setDescriptionImages(data.description_images);
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : 'Scrape failed');
    } finally {
      setScraping(false);
    }
  };

  // Miaoshou collect box
  const handleLoadMsItems = async () => {
    setMsLoading(true);
    setMsError('');
    try {
      const res = await fetch('/api/miaoshou');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load');
      }
      const data = await res.json();
      setMsItems(data.items || []);
    } catch (err) {
      setMsError(err instanceof Error ? err.message : 'Failed to load collect box');
    } finally {
      setMsLoading(false);
    }
  };

  const handleSelectMsItem = async (detailId: number) => {
    setMsDetailLoading(true);
    setMsError('');
    setMsSelectedDetailId(detailId);
    try {
      const res = await fetch('/api/miaoshou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'detail', detailId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get detail');
      }
      const data = await res.json();
      if (data.title) setName(data.title);
      if (data.category) setCategory(data.category);
      if (data.images?.length > 0) setImages(data.images);
      if (data.description_images?.length > 0) setDescriptionImages(data.description_images);
      if (data.image_sources?.length > 0) setImageSources(data.image_sources);
      if (data.desc_image_sources?.length > 0) setDescImageSources(data.desc_image_sources);
      if (data.original_notes_html) setOriginalNotesHtml(data.original_notes_html);
      if (!data.category && data.title) {
        setMsError('标题已填充，请手动选择分类 (Category) 后再创建');
      }
    } catch (err) {
      setMsError(err instanceof Error ? err.message : 'Failed to import product');
    } finally {
      setMsDetailLoading(false);
    }
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter a product name');
      return;
    }
    if (!category) {
      setError('Please select a category');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category,
          brand,
          color,
          material,
          selling_points: sellingPoints,
          original_images: images,
          description_images: descriptionImages,
          original_image_sources: imageSources,
          desc_image_sources: descImageSources,
          original_notes_html: originalNotesHtml,
          source: msSelectedDetailId ? 'miaoshou' : '',
          ms_detail_id: msSelectedDetailId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create product');
      }

      const data = await res.json();
      router.push(`/products/${data.product.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <Header title="New Product" />
      <div className="p-6 max-w-5xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left column: Text fields */}
            <div className="lg:col-span-3 space-y-5">
              {/* Import from 1688 */}
              <div className="bg-white rounded-xl border border-orange-200 p-5">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Globe className="w-4 h-4 text-orange-500" />
                  Import from 1688
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={url1688}
                    onChange={(e) => { setUrl1688(e.target.value); setScrapeError(''); }}
                    placeholder="Paste 1688 product URL..."
                    disabled={scraping}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-shadow"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleScrape1688(); } }}
                  />
                  <button
                    type="button"
                    onClick={handleScrape1688}
                    disabled={scraping || !url1688.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {scraping ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Scraping...
                      </>
                    ) : (
                      'Scrape'
                    )}
                  </button>
                </div>
                {scrapeError && (
                  <p className="text-xs text-red-500 mt-2">{scrapeError}</p>
                )}
              </div>

              {/* Import from Miaoshou Collect Box */}
              <div className="bg-white rounded-xl border border-blue-200 p-5">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Package className="w-4 h-4 text-blue-500" />
                  Import from Miaoshou Collect Box
                </label>
                <button
                  type="button"
                  onClick={handleLoadMsItems}
                  disabled={msLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {msLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Package className="w-4 h-4" />
                      Load Collect Box ({msItems.length > 0 ? msItems.length : '?'})
                    </>
                  )}
                </button>
                {msError && (
                  <p className="text-xs text-red-500 mt-2">{msError}</p>
                )}
                {msDetailLoading && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing product data & downloading images...
                  </div>
                )}
                {msItems.length > 0 && (
                  <>
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Search collect box..."
                        value={msSearch}
                        onChange={(e) => setMsSearch(e.target.value)}
                        className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {msFilteredItems.length}/{msItems.length}
                      </span>
                    </div>
                    <div className="mt-2 space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {msFilteredItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectMsItem(item.id)}
                        disabled={msDetailLoading}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 transition-colors text-left"
                      >
                        <img
                          src={`/api/image-proxy?url=${encodeURIComponent(item.thumbnail)}`}
                          alt=""
                          className="w-12 h-12 rounded object-cover bg-gray-100 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{item.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            ¥{item.price} · Stock: {item.stock}
                          </p>
                        </div>
                        <span className="text-xs text-blue-500 flex-shrink-0">Import</span>
                      </button>
                    ))}
                  </div>
                  </>
                )}
              </div>

              {/* Product Name */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. iPhone 15 Pro Max Clear Case"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
              </div>

              {/* Category */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-shadow"
                >
                  <option value="">Select a category...</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.nameEn} ({cat.nameZh})
                    </option>
                  ))}
                </select>
              </div>

              {/* Brand & Color row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Apple, Samsung, Baseus"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  />
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="e.g. Black, Transparent, Navy"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  />
                </div>
              </div>

              {/* Material */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Material
                </label>
                <input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="e.g. Silicone, PC+TPU, Aluminum"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
              </div>

              {/* Selling Points (tag-style input) */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selling Points
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  Type a selling point and press Enter or comma to add. Click X to remove.
                </p>
                <div className="flex flex-wrap items-center gap-2 mb-3 min-h-[40px]">
                  {sellingPoints.map((point, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      {point}
                      <button
                        type="button"
                        onClick={() => removeSellingPoint(i)}
                        className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={sellingPointInput}
                    onChange={(e) => setSellingPointInput(e.target.value)}
                    onKeyDown={handleSellingPointKeyDown}
                    onBlur={() => addSellingPoint(sellingPointInput)}
                    placeholder={sellingPoints.length === 0 ? 'e.g. Shockproof, Slim Design, MagSafe Compatible' : 'Add more...'}
                    className="flex-1 min-w-[140px] px-3 py-1.5 text-sm focus:outline-none border-none"
                  />
                </div>
                {sellingPoints.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{sellingPoints.length} selling points added</span>
                    <button
                      type="button"
                      onClick={() => setSellingPoints([])}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              {/* Submit button (mobile) */}
              <button
                type="submit"
                disabled={submitting || !name.trim() || !category}
                className="lg:hidden w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Product...
                  </>
                ) : (
                  'Create Product'
                )}
              </button>
            </div>

            {/* Right column: Image upload */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Product Images
                </label>
                <p className="text-xs text-gray-400 mb-4">
                  Upload original product images. These will be used for AI-enhanced photo generation.
                </p>
                <ImageUploader
                  onUpload={(urls) => setImages(urls)}
                  onRemove={(url) => setImages((prev) => prev.filter((u) => u !== url))}
                  maxFiles={50}
                  existingImages={images}
                />
              </div>

              {/* Description Images (from 1688/Miaoshou detail section) */}
              {descriptionImages.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Description Images
                    </label>
                    <button
                      type="button"
                      onClick={() => setDescriptionImages([])}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    Images collected from product description (feature showcase, size charts, usage scenarios).
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {descriptionImages.map((url, i) => (
                      <div key={url + i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                        <img src={url} alt={`Desc ${i + 1}`} className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setDescriptionImages((prev) => prev.filter((u) => u !== url))}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary card */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Product Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name</span>
                    <span className="text-gray-900 font-medium truncate ml-4 max-w-[200px]">
                      {name || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Category</span>
                    <span className="text-gray-900">
                      {category
                        ? CATEGORIES.find((c) => c.id === category)?.nameEn || category
                        : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Brand</span>
                    <span className="text-gray-900">{brand || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Images</span>
                    <span className="text-gray-900">{images.length} uploaded</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Desc Images</span>
                    <span className="text-gray-900">{descriptionImages.length} collected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Selling Points</span>
                    <span className="text-gray-900">{sellingPoints.length} added</span>
                  </div>
                </div>
              </div>

              {/* Submit button (desktop) */}
              <button
                type="submit"
                disabled={submitting || !name.trim() || !category}
                className="hidden lg:flex w-full items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Product...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Product
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
