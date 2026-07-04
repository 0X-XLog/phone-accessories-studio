'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { MAIN_IMAGE_PROMPTS } from '@/lib/prompts-3c';
import { formatCost, getCost } from '@/lib/cost';

interface ImageEditPanelProps {
  sourceImageUrl: string;
  productId?: string;
  preset?: string;
  onResult: (result: { url: string; cost: number }) => void;
}

const PRESETS = [
  { key: 'white_bg', label: 'White Background', desc: 'Clean product shot', icon: '⬜' },
  { key: 'enhanced', label: 'Enhanced Quality', desc: 'Pro e-commerce look', icon: '✨' },
] as const;

export default function ImageEditPanel({ sourceImageUrl, productId, preset = 'white_bg', onResult }: ImageEditPanelProps) {
  const [selectedPreset, setSelectedPreset] = useState(preset);
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEdit = async () => {
    setLoading(true);
    setError('');

    try {
      const presetKey = customPrompt ? 'custom' : selectedPreset;

      const res = await fetch('/api/images/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceImageUrl,
          preset: presetKey,
          customPrompt: customPrompt || undefined,
          productId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Edit failed');
      }

      const data = await res.json();
      onResult({ url: data.url, cost: data.cost });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const getPresetPrompt = () => {
    if (customPrompt) return customPrompt;
    return MAIN_IMAGE_PROMPTS[selectedPreset as keyof typeof MAIN_IMAGE_PROMPTS] || '';
  };

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Image Presets</h4>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => { setSelectedPreset(p.key); setCustomPrompt(''); }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors whitespace-nowrap ${
                selectedPreset === p.key
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <span className="text-base">{p.icon}</span>
              <div className="text-left">
                <div className="text-xs font-medium">{p.label}</div>
                <div className="text-[10px] text-gray-400">{p.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Prompt preview */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-500">AI Prompt</span>
          <span className="text-[10px] text-gray-400">editable</span>
        </div>
        <textarea
          value={customPrompt || getPresetPrompt()}
          onChange={(e) => setCustomPrompt(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs resize-none h-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Action */}
      {error && (
        <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleEdit}
          disabled={loading || !sourceImageUrl}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-5 py-2.5 rounded-lg font-medium transition-colors text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Processing...' : `Generate (${formatCost(getCost('image_edit'))})`}
        </button>
      </div>
    </div>
  );
}
