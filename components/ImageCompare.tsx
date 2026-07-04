'use client';

import { useState, useRef, useCallback } from 'react';

interface ImageCompareProps {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export default function ImageCompare({ before, after, beforeLabel = 'Original', afterLabel = 'Optimized' }: ImageCompareProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square rounded-xl overflow-hidden border border-gray-200 select-none cursor-col-resize"
      onMouseDown={() => { dragging.current = true; }}
      onMouseUp={() => { dragging.current = false; }}
      onMouseLeave={() => { dragging.current = false; }}
      onMouseMove={(e) => dragging.current && handleMove(e.clientX)}
      onTouchStart={() => { dragging.current = true; }}
      onTouchEnd={() => { dragging.current = false; }}
      onTouchMove={(e) => dragging.current && handleMove(e.touches[0].clientX)}
    >
      {/* After image (full width) */}
      <img src={after} alt={afterLabel} className="absolute inset-0 w-full h-full object-contain bg-white" />

      {/* Before image (clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
        <img src={before} alt={beforeLabel} className="absolute inset-0 w-full h-full object-contain bg-white" style={{ width: containerRef.current?.offsetWidth || '100%' }} />
      </div>

      {/* Slider line */}
      <div className="absolute top-0 bottom-0 z-10" style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}>
        <div className="w-0.5 h-full bg-white shadow-lg" />
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
          <div className="flex gap-0.5">
            <div className="w-0.5 h-3 bg-gray-400 rounded" />
            <div className="w-0.5 h-3 bg-gray-400 rounded" />
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded">{beforeLabel}</div>
      <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded">{afterLabel}</div>
    </div>
  );
}
