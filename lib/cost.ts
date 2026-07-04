// Cost tracking per model (Gemini API actual pricing)
// gemini-3.5-flash: input $0.15/M, output $1.50/M tokens
// gemini-3.1-flash-image (Banana): image I/O billed as tokens, ~$0.10-0.15/image
export const COST_PER_OPERATION = {
  image_edit: 0.14,       // Banana image gen: ~$0.14/image (calibrated from real usage)
  image_generate: 0.14,   // Banana image gen: ~$0.14/image
  title: 0.004,           // ~$0.004 per title call
  description: 0.008,     // ~$0.008 per description call (longer output)
  analysis: 0.01,         // ~$0.01 per analysis (vision input = more tokens)
} as const;

export type OperationType = keyof typeof COST_PER_OPERATION;

export function getCost(type: OperationType): number {
  return COST_PER_OPERATION[type] || 0;
}

export function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}
