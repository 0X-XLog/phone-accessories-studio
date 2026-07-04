'use client';

import { useState } from 'react';
import { RotateCcw, Copy, Check, Loader2 } from 'lucide-react';
import { formatCost, getCost } from '@/lib/cost';

interface DescriptionEditorProps {
  productId: string;
  name: string;
  category: string;
  keywords: string[];
  features: string[];
  initialDescEn?: string;
  onUpdate: (descEn: string) => void;
}

export default function DescriptionEditor({
  productId,
  name,
  category,
  keywords,
  features,
  initialDescEn = '',
  onUpdate,
}: DescriptionEditorProps) {
  const [descEn, setDescEn] = useState(initialDescEn);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/descriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, name, category, keywords, features }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Generation failed');
      }

      const data = await res.json();
      setDescEn(data.description_en);
      onUpdate(data.description_en);
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
        <h4 className="text-sm font-medium text-gray-700">Product Descriptions</h4>
        <button
          onClick={handleGenerate}
          disabled={loading || !name}
          className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 disabled:text-gray-400"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          {loading ? 'Generating...' : `Regenerate (${formatCost(getCost('description'))})`}
        </button>
      </div>

      {error && <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

      {/* English Description */}
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">English Description</label>
        <div className="relative mt-1">
          <textarea
            value={descEn}
            onChange={(e) => { setDescEn(e.target.value); onUpdate(e.target.value); }}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm resize-none h-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Product description in English..."
          />
          <button
            onClick={() => copyToClipboard(descEn, 'en')}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600"
          >
            {copied === 'en' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
