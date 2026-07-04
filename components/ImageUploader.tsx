'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  onUpload: (urls: string[]) => void;
  onRemove?: (url: string) => void;
  maxFiles?: number;
  existingImages?: string[];
}

export default function ImageUploader({ onUpload, onRemove, maxFiles = 9, existingImages = [] }: ImageUploaderProps) {
  const [previews, setPreviews] = useState<string[]>(existingImages);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPreviews(existingImages);
  }, [existingImages]);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files).slice(0, maxFiles - previews.length);
    if (fileArr.length === 0) return;

    setUploading(true);
    const urls: string[] = [];

    for (const file of fileArr) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch('/api/images/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          urls.push(data.url);
          setPreviews((prev) => [...prev, data.url]);
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }

    if (urls.length > 0) {
      onUpload([...previews, ...urls]);
    }
    setUploading(false);
  }, [previews, maxFiles, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeImage = (index: number) => {
    const removed = previews[index];
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    if (onRemove) {
      onRemove(removed);
    } else {
      onUpload(previews.filter((_, i) => i !== index));
    }
  };

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">
          {uploading ? 'Uploading...' : 'Click or drag images here'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {previews.length}/{maxFiles} images
        </p>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mt-3">
          {previews.map((url, i) => (
            <div key={url + i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              <img src={url} alt="" className="w-full h-full object-contain" />
              <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/50 rounded px-1">{i + 1}</span>
              <button
                onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="Remove image"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
