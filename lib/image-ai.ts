// Image generation: OpenAI-compatible relay (beefapi)
// - Text-to-image: POST {base}/images/generations (JSON)
// - Image-to-image: POST {base}/images/edits (multipart) — the relay rejects
//   image params on /generations and requires the edits endpoint
// - Response returns a proxy url (302 -> real image), not b64_json
// 令牌池：多账号（逗号分隔）= 多条独立队列，可并行出图（beefapi 队列按账号隔离）
const IMAGE_API_KEYS = (process.env.OPENAI_IMAGE_API_KEYS || process.env.OPENAI_IMAGE_API_KEY || process.env.TEXT_API_KEY || '')
  .split(',').map(k => k.trim()).filter(Boolean);
const IMAGE_API_BASE = (process.env.OPENAI_IMAGE_API_BASE || '').replace(/\/+$/, '');
const IMAGE_MODEL = process.env.IMAGE_MODEL || 'gpt-image-2.5-flare';

interface EditImageOptions {
  imageBuffer: Buffer;
  prompt: string;
  size?: '1024x1024' | '1536x1024' | '1024x1536';
  quality?: string; // low / medium / high — low 快约 40%，high 最精细
  lane?: number;    // 并行车道号：不同 lane 用不同账号令牌（独立队列）
}

function isRetryableError(err: Error): boolean {
  const msg = err.message;
  return (
    msg.includes('model_not_found') ||
    msg.includes('empty_response') ||
    msg.includes('do_request_failed') ||
    msg.includes('upstream error') ||
    msg.includes('timeout') ||
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('429')
  );
}

async function urlToBase64(url: string): Promise<string> {
  // fetch follows the relay's 302 to the real image automatically
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) {
    throw new Error(`Failed to download generated image (${res.status})`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return buffer.toString('base64');
}

interface ImageApiItem {
  b64_json?: string;
  url?: string;
}

async function extractImageBase64(data: unknown): Promise<string> {
  const items = (data as { data?: ImageApiItem[] })?.data;
  const item = items?.[0];
  if (item?.b64_json) return item.b64_json;
  if (item?.url) return urlToBase64(item.url);
  throw new Error(`API returned no image: ${JSON.stringify(data).slice(0, 300)}`);
}

export async function editImage(options: EditImageOptions): Promise<{ b64Json: string }> {
  const { imageBuffer, prompt, size = '1024x1024' } = options;
  const quality = options.quality || process.env.IMAGE_QUALITY || 'medium';
  const apiKey = IMAGE_API_KEYS[(options.lane ?? 0) % IMAGE_API_KEYS.length] || '';
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 5000;

  if (IMAGE_API_KEYS.length === 0 || !IMAGE_API_BASE) {
    throw new Error('未配置图片生成 API (OPENAI_IMAGE_API_KEYS / OPENAI_IMAGE_API_BASE)');
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`[IMG-AI] Retry ${attempt}/${MAX_RETRIES}...`);
        await new Promise(r => setTimeout(r, RETRY_DELAY));
      }

      // Image-to-image: multipart /images/edits
      const form = new FormData();
      form.append('model', IMAGE_MODEL);
      form.append('prompt', prompt);
      form.append('size', size);
      form.append('quality', quality);
      form.append('n', '1');
      form.append('image', new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' }), 'input.png');

      const response = await fetch(`${IMAGE_API_BASE}/images/edits`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(120000),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Image edit failed (${response.status}): ${error.slice(0, 500)}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
      }

      const b64Json = await extractImageBase64(data);
      return { b64Json };

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.log(`[IMG-AI] Attempt ${attempt} failed: ${lastError.message.slice(0, 200)}`);
      if (!isRetryableError(lastError) || attempt >= MAX_RETRIES) throw lastError;
    }
  }

  throw lastError || new Error('Unknown error');
}
