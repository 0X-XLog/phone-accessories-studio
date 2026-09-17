// Image generation: OpenAI-compatible relay (beefapi)
// - Text-to-image: POST {base}/images/generations (JSON)
// - Image-to-image: POST {base}/images/edits (multipart) — the relay rejects
//   image params on /generations and requires the edits endpoint
// - Response returns a proxy url (302 -> real image), not b64_json
const IMAGE_API_KEY = process.env.OPENAI_IMAGE_API_KEY || process.env.TEXT_API_KEY || '';
const IMAGE_API_BASE = (process.env.OPENAI_IMAGE_API_BASE || '').replace(/\/+$/, '');
const IMAGE_MODEL = process.env.IMAGE_MODEL || 'gpt-image-2.5-flare';

interface EditImageOptions {
  imageBuffer: Buffer;
  prompt: string;
  size?: '1024x1024' | '1536x1024' | '1024x1536';
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
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 5000;

  if (!IMAGE_API_KEY || !IMAGE_API_BASE) {
    throw new Error('未配置图片生成 API (OPENAI_IMAGE_API_KEY / OPENAI_IMAGE_API_BASE)');
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
      form.append('n', '1');
      form.append('image', new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' }), 'input.png');

      const response = await fetch(`${IMAGE_API_BASE}/images/edits`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${IMAGE_API_KEY}` },
        body: form,
        signal: AbortSignal.timeout(300000),
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
