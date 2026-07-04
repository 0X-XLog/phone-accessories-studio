// Image generation: Gemini native API (gemini-3.1-flash-image / Banana)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_IMAGE_API_KEY || '';
const IMAGE_MODEL = process.env.IMAGE_MODEL || 'gemini-3.1-flash-image';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

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

export async function editImage(options: EditImageOptions): Promise<{ b64Json: string }> {
  const { imageBuffer, prompt, size = '1024x1024' } = options;
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 5000;

  if (!GEMINI_API_KEY) throw new Error('未配置 Gemini API Key (GEMINI_API_KEY)');

  const base64Image = imageBuffer.toString('base64');
  let lastError: Error | null = null;

  // Add size hint to prompt since Gemini doesn't support size parameter directly
  const sizeHint = size === '1536x1024' ? ' Generate a landscape-oriented image (3:2 aspect ratio).'
    : size === '1024x1536' ? ' Generate a portrait-oriented image (2:3 aspect ratio).'
    : ' Generate a square image (1:1 aspect ratio).';
  const finalPrompt = prompt + sizeHint;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`[IMG-AI] Retry ${attempt}/${MAX_RETRIES}...`);
        await new Promise(r => setTimeout(r, RETRY_DELAY));
      }

      const url = `${GEMINI_BASE}/${IMAGE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: finalPrompt },
              { inlineData: { mimeType: 'image/png', data: base64Image } },
            ],
          }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Image edit failed (${response.status}): ${error.slice(0, 500)}`);
      }

      const data = await response.json();

      // Check for API-level error
      if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
      }

      // Extract image from Gemini response: candidates[0].content.parts[].inlineData.data
      const parts = data.candidates?.[0]?.content?.parts;
      if (!parts || !Array.isArray(parts)) {
        throw new Error(`API returned no content parts: ${JSON.stringify(data).slice(0, 300)}`);
      }

      for (const part of parts) {
        if (part.inlineData?.data) {
          return { b64Json: part.inlineData.data };
        }
      }

      throw new Error(`API returned no image in response: ${JSON.stringify(data).slice(0, 300)}`);

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.log(`[IMG-AI] Attempt ${attempt} failed: ${lastError.message.slice(0, 200)}`);
      if (!isRetryableError(lastError) || attempt >= MAX_RETRIES) throw lastError;
    }
  }

  throw lastError || new Error('Unknown error');
}
