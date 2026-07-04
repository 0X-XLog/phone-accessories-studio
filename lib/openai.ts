// Text generation: 火山引擎 Doubao (OpenAI 兼容格式)
const TEXT_API_KEY = process.env.TEXT_API_KEY || '';
const TEXT_API_BASE = process.env.TEXT_API_BASE || 'https://ark.cn-beijing.volces.com/api/v3';
const TEXT_MODEL = process.env.TEXT_MODEL || 'ep-20260508113528-wfl4m';

// Image generation: 火山引擎 Doubao Seedream (图生图)
const IMAGE_API_KEY = process.env.IMAGE_API_KEY || process.env.TEXT_API_KEY || '';
const IMAGE_API_BASE = process.env.IMAGE_API_BASE || process.env.TEXT_API_BASE || 'https://ark.cn-beijing.volces.com/api/v3';
const IMAGE_MODEL = process.env.IMAGE_MODEL || 'doubao-seedream-3.5-t2i-250415';

interface EditImageOptions {
  imageBuffer: Buffer;
  prompt: string;
  size?: '1024x1024' | '1536x1024' | '1024x1536';
}

export async function editImage(options: EditImageOptions): Promise<{ b64Json: string }> {
  const { imageBuffer, prompt, size = '1024x1024' } = options;

  if (!IMAGE_API_KEY) {
    throw new Error('未配置图片生成 API Key');
  }

  const base64Image = Buffer.from(imageBuffer).toString('base64');

  // 火山引擎图生图格式
  const response = await fetch(`${IMAGE_API_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${IMAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt: prompt,
      response_format: 'b64_json',
      size: size,
      stream: false,
      watermark: false,
      ref_image: base64Image, // 参考图片（图生图）
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`图片生成失败 (${response.status}): ${error}`);
  }

  const data = await response.json();
  const b64Json = data.data?.[0]?.b64_json;
  if (!b64Json) {
    throw new Error(`API 返回数据格式异常: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return { b64Json };
}

interface GenerateTextOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function generateText(options: GenerateTextOptions): Promise<string> {
  const { prompt, systemPrompt, maxTokens = 3000, temperature = 0.7 } = options;
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
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
            { role: 'user', content: prompt },
          ],
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        // Retry on 429 (rate limit)
        if (response.status === 429 && attempt < maxRetries - 1) {
          const waitMs = Math.pow(2, attempt + 1) * 5000; // 10s, 20s
          console.log(`Rate limited, retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }
        throw new Error(`Text generation failed: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      lastError = error as Error;
      if ((lastError.message || '').includes('Text generation failed') && !(lastError.message || '').includes('429')) {
        throw error; // Don't retry non-429 errors
      }
      if (attempt < maxRetries - 1 && (lastError.message || '').includes('429')) {
        continue;
      }
      throw error;
    }
  }
  throw lastError!;
}
