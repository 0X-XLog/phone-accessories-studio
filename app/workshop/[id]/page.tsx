'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import ImageEditPanel from '@/components/ImageEditPanel';
import ImageCompare from '@/components/ImageCompare';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  original_images: string[];
  optimized_main_image: string;
}

interface GenImage {
  id: string;
  type: string;
  prompt: string;
  generated_image_url: string;
  original_image_url: string;
}

export default function WorkshopPage() {
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [genImages, setGenImages] = useState<GenImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [compareBefore, setCompareBefore] = useState<string>('');
  const [compareAfter, setCompareAfter] = useState<string>('');

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data.product);
        setGenImages(data.images);
        if (data.product.original_images[0]) {
          setSelectedImage(data.product.original_images[0]);
        }
      })
      .catch(console.error);
  }, [id]);

  if (!product) {
    return (
      <Layout>
        <Header title="Loading..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header title={`Workshop: ${product.name || 'Untitled'}`} />
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Back link */}
        <Link href={`/products/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-3 h-3" /> Back to Product
        </Link>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: Image Selection */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Source Images</h4>
              <div className="grid grid-cols-2 gap-2">
                {product.original_images.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    onClick={() => setSelectedImage(url)}
                    className={`w-full aspect-square object-contain rounded-lg border cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all ${
                      selectedImage === url ? 'ring-2 ring-blue-500' : 'border-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {genImages.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Generated</h4>
                <div className="grid grid-cols-2 gap-2">
                  {genImages.map((img) => (
                    <img
                      key={img.id}
                      src={img.generated_image_url}
                      alt=""
                      className="w-full aspect-square object-contain rounded-lg border border-gray-200 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                      onClick={() => {
                        setCompareBefore(img.original_image_url);
                        setCompareAfter(img.generated_image_url);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Center: Compare */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Compare</h4>
            {compareBefore && compareAfter ? (
              <ImageCompare before={compareBefore} after={compareAfter} />
            ) : (
              <div className="aspect-square rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
                Click a generated image to compare
              </div>
            )}
          </div>

          {/* Right: Edit Panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Edit</h4>
            {selectedImage ? (
              <ImageEditPanel
                sourceImageUrl={selectedImage}
                productId={product.id}
                onResult={(r) => {
                  setCompareBefore(selectedImage);
                  setCompareAfter(r.url);
                }}
              />
            ) : (
              <p className="text-sm text-gray-500">Select a source image to edit</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
