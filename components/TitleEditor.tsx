'use client';

import { useState } from 'react';
import { Sparkles, RotateCcw, Copy, Check, Loader2 } from 'lucide-react';
import { formatCost, getCost } from '@/lib/cost';

interface TitleEditorProps {
  productId: string;
  name: string;
  category: string;
  keywords: string[];
  initialTitleEn?: string;
  initialCoreKeywords?: string[];
  initialLongtailKeywords?: string[];
  onUpdate: (titleEn: string, coreKeywords?: string[], longtailKeywords?: string[]) => void;
}

export default function TitleEditor({
  productId,
  name,
  category,
  keywords,
  initialTitleEn = '',
  initialCoreKeywords = [],
  initialLongtailKeywords = [],
  onUpdate,
}: TitleEditorProps) {
  const [titleEn, setTitleEn] = useState(initialTitleEn);
  const [coreKeywords, setCoreKeywords] = useState<string[]>(initialCoreKeywords);
  const [longtailKeywords, setLongtailKeywords] = useState<string[]>(initialLongtailKeywords);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, name, category, keywords }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Generation failed');
      }

      const data = await res.json();
      setTitleEn(data.title_en);
      setCoreKeywords(data.core_keywords || []);
      setLongtailKeywords(data.longtail_keywords || []);
      onUpdate(data.title_en, data.core_keywords, data.longtail_keywords);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
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
      // silent fail
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Product Titles & SEO Keywords</h4>
        <button
          onClick={handleGenerate}
          disabled={loading || !name}
          className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 disabled:text-gray-400"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? 'AI Generating...' : `Generate (${formatCost(getCost('title'))})`}
        </button>
      </div>

      {error && <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

      {/* English Title */}
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">English Title</label>
        <div className="relative mt-1">
          <textarea
            value={titleEn}
            onChange={(e) => { setTitleEn(e.target.value); onUpdate(e.target.value, coreKeywords, longtailKeywords); }}
            maxLength={60}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Product title in English..."
          />
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <span className={`text-xs ${titleEn.length > 60 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>{titleEn.length}/60</span>
            {titleEn && (
              <button onClick={() => copyToClipboard(titleEn, 'en')} className="p-1 text-gray-400 hover:text-gray-600">
                {copied === 'en' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Core Keywords */}
      {coreKeywords.length > 0 && (
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Core Keywords</label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {coreKeywords.map((kw, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                {kw}
                <button onClick={() => copyToClipboard(kw, `core-${i}`)} className="text-blue-400 hover:text-blue-600">
                  {copied === `core-${i}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Long-tail Keywords */}
      {longtailKeywords.length > 0 && (
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Long-tail Keywords</label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {longtailKeywords.map((kw, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full">
                {kw}
                <button onClick={() => copyToClipboard(kw, `long-${i}`)} className="text-green-400 hover:text-green-600">
                  {copied === `long-${i}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
