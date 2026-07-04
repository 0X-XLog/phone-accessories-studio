// Text + Vision generation: Gemini native API (generateContent)
// Note: Gemini 3.5 Flash OpenAI-compatible endpoint has a thinking mode bug
// that pollutes content output. Must use native API instead.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.TEXT_API_KEY || '';
const TEXT_MODEL = process.env.TEXT_MODEL || 'gemini-3.5-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GenerateTextOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  images?: string[]; // R2 image URLs to send as vision input
}

// Download image URL to base64
async function imageUrlToBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    if (url.startsWith('//')) url = 'https:' + url;
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get('content-type') || 'image/jpeg';
    const mimeType = ct.includes('png') ? 'image/png' : ct.includes('webp') ? 'image/webp' : 'image/jpeg';
    return { data: buffer.toString('base64'), mimeType };
  } catch {
    return null;
  }
}

export async function generateText(options: GenerateTextOptions): Promise<string> {
  const { prompt, systemPrompt, maxTokens = 3000, temperature = 0.7, images } = options;

  if (!GEMINI_API_KEY) {
    throw new Error('未配置 Gemini API Key (GEMINI_API_KEY)');
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

      // Build parts array (Gemini native format)
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      // System instruction (placed as first text part with prefix)
      if (systemPrompt) {
        parts.push({ text: `[System Instruction]\n${systemPrompt}\n\n[End System Instruction]\n\n` });
      }

      // Add images if present (vision mode)
      if (images && images.length > 0) {
        const b64Results = await Promise.allSettled(
          images.slice(0, 5).map(url => imageUrlToBase64(url))
        );
        const validImages: { data: string; mimeType: string }[] = [];
        for (const r of b64Results) {
          if (r.status === 'fulfilled' && r.value !== null) {
            validImages.push(r.value as { data: string; mimeType: string });
          }
        }

        if (validImages.length > 0) {
          console.log(`[VISION] Sending ${validImages.length} images`);
          for (const img of validImages) {
            parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
          }
        } else {
          console.log('[VISION] Failed to download images, text-only mode');
        }
      }

      // User prompt
      parts.push({ text: prompt });

      const url = `${GEMINI_BASE}/${TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Text generation failed: ${response.status} - ${error.slice(0, 500)}`);
      }

      const data = await response.json();

      // Extract text from Gemini response: candidates[0].content.parts[].text
      const responseParts = data.candidates?.[0]?.content?.parts;
      if (!responseParts || !Array.isArray(responseParts)) {
        throw new Error(`API returned no content parts: ${JSON.stringify(data).slice(0, 300)}`);
      }

      let text = '';
      for (const part of responseParts) {
        if (part.text) {
          text += part.text;
        }
      }

      if (!text.trim()) {
        throw new Error(`API returned empty text: ${JSON.stringify(data).slice(0, 300)}`);
      }

      return text.trim();
    } catch (error) {
      lastError = error as Error;
      console.log(`Attempt ${attempt + 1} failed: ${(lastError as Error).message?.slice(0, 200)}`);
      if (attempt === maxRetries - 1) throw error;
    }
  }
  throw lastError!;
}
