// Text + Vision generation: OpenAI-compatible relay (beefapi /chat/completions)
// Vision input is sent as image_url content parts (base64 data URLs).
const TEXT_API_KEY = process.env.TEXT_API_KEY || '';
const TEXT_API_BASE = (process.env.TEXT_API_BASE || '').replace(/\/+$/, '');
const TEXT_MODEL = process.env.TEXT_MODEL || 'gpt-4o';

interface GenerateTextOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  images?: string[]; // image URLs to send as vision input
}

// Download image URL to base64 data URL
async function imageUrlToDataUrl(url: string): Promise<string | null> {
  try {
    if (url.startsWith('//')) url = 'https:' + url;
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get('content-type') || 'image/jpeg';
    const mimeType = ct.includes('png') ? 'image/png' : ct.includes('webp') ? 'image/webp' : 'image/jpeg';
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function generateText(options: GenerateTextOptions): Promise<string> {
  const { prompt, systemPrompt, maxTokens = 3000, temperature = 0.7, images } = options;

  if (!TEXT_API_KEY || !TEXT_API_BASE) {
    throw new Error('未配置文本生成 API (TEXT_API_KEY / TEXT_API_BASE)');
  }

  const maxRetries = 5;
  const baseDelay = 3000;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = baseDelay * Math.pow(1.5, attempt - 1);
        console.log(`Retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Vision mode: download up to 5 images as base64 data URLs
      let content: string | Array<Record<string, unknown>> = prompt;
      if (images && images.length > 0) {
        const results = await Promise.allSettled(
          images.slice(0, 5).map(url => imageUrlToDataUrl(url))
        );
        const validImages = results
          .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && r.value !== null)
          .map(r => r.value);

        if (validImages.length > 0) {
          console.log(`[VISION] Sending ${validImages.length} images`);
          content = [
            ...validImages.map(url => ({ type: 'image_url' as const, image_url: { url } })),
            { type: 'text' as const, text: prompt },
          ];
        } else {
          console.log('[VISION] Failed to download images, text-only mode');
        }
      }

      const response = await fetch(`${TEXT_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${TEXT_API_KEY}`,
        },
        body: JSON.stringify({
          model: TEXT_MODEL,
          messages: [
            ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
            { role: 'user' as const, content },
          ],
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Text generation failed: ${response.status} - ${error.slice(0, 500)}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (!text || !String(text).trim()) {
        throw new Error(`API returned empty text: ${JSON.stringify(data).slice(0, 300)}`);
      }

      return String(text).trim();
    } catch (error) {
      lastError = error as Error;
      console.log(`Attempt ${attempt + 1} failed: ${(lastError as Error).message?.slice(0, 200)}`);
      if (attempt === maxRetries - 1) throw error;
    }
  }
  throw lastError!;
}
