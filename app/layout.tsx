import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Phone Accessories AI Studio',
  description: 'AI-powered product image generation and copywriting for TikTok Shop, Shopee & Lazada',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
