// TikTok MY 3C 结构化标题系统
// 理念：不让 AI 自由发挥——按类目模板"填空"，程序侧校验黑名单/长度/重复词
// 规则：马来文主体 70~85%，技术词不翻译（USB-C/GaN/PD/65W），英文辅助词收尾
// 兼容型号只允许来自商品真实数据（原标题/参数/分析），禁止 AI 编造

// 每类目的马来文核心词 + 英文辅助词（放标题最前/最后）
export const MS_CORE_WORDS: Record<string, { core: string; en: string }> = {
  phone_case: { core: 'Sarung Telefon', en: 'Phone Case' },
  screen_protector: { core: 'Penapis Skrin', en: 'Screen Protector' },
  holder: { core: 'Pemegang Telefon', en: 'Phone Holder' },
  stand: { core: 'Pemegang Telefon', en: 'Phone Stand' },
  car_mount: { core: 'Pemegang Telefon Kereta', en: 'Car Phone Holder' },
  charger: { core: 'Pengecas', en: 'Charger' },
  wireless_charger: { core: 'Pengecas Tanpa Wayar', en: 'Wireless Charger' },
  cable: { core: 'Kabel', en: 'Cable' },
  power_bank: { core: 'Bank Kuasa', en: 'Power Bank' },
  phone_lens: { core: 'Kanta Kamera Telefon', en: 'Phone Lens' },
  earbuds: { core: 'Fon Telinga Bluetooth', en: 'Bluetooth Earbuds' },
  earbuds_case: { core: 'Kes Fon Telinga', en: 'Earbuds Case' },
  phone_ring: { core: 'Cincin Telefon', en: 'Phone Ring Holder' },
  phone_lanyard: { core: 'Tali Telefon', en: 'Phone Lanyard' },
  stylus: { core: 'Pen Stylus', en: 'Stylus Pen' },
  usb_hub: { core: 'Hab USB', en: 'USB Hub' },
  fan: { core: 'Kipas USB', en: 'USB Fan' },
  tablet_case: { core: 'Sarung Tablet', en: 'Tablet Case' },
  smart_watch: { core: 'Jam Pintar', en: 'Smart Watch' },
  smart_band: { core: 'Gelang Pintar', en: 'Smart Band' },
  phone_pouch: { core: 'Beg Telefon', en: 'Phone Pouch' },
  cleaning_kit: { core: 'Kit Pembersihan', en: 'Cleaning Kit' },
  other: { core: 'Aksesori Telefon', en: 'Phone Accessory' },
};

// 分类目标题骨架（槽位顺序 = 搜索权重顺序）
export const TITLE_TEMPLATES: Record<string, string> = {
  charger: '[Pengecas + 类型 Dinding/Kereta/GaN] + [功率 65W] + [接口 USB-C/USB-A] + [协议 PD/QC] + [功能 Pengecasan Pantas] + [英文: Fast Charging Charger]',
  cable: '[Kabel + 接口 USB-C/Lightning] + [功率/速度 60W/100W] + [长度 1M] + [兼容 untuk X] + [功能 Pengecasan Pantas] + [英文: Fast Charging Cable]',
  power_bank: '[Bank Kuasa] + [容量 10000mAh] + [功率 22.5W] + [接口/技术 USB-C/Magnetik] + [兼容 untuk X] + [英文: Power Bank]',
  phone_case: '[Sarung Telefon/Kes] + [兼容 untuk 型号] + [材质/设计 Silikon/Lutsinar/Gebel] + [防护 Kalis Hentak/Anti Kekuningan] + [功能 MagSafe/Pelindung Kamera] + [英文: Phone Case]',
  screen_protector: '[Penapis Skrin] + [兼容 untuk 型号] + [材质 Kaca Temper/HD] + [功能 Anti Gores/Bebas Buih] + [数量 2pcs] + [英文: Screen Protector]',
  holder: '[Pemegang Telefon + 类型 Kereta/Meja/Magnetik] + [可调 Boleh Laras/Lipat] + [安装方式] + [功能 Putaran 360°] + [兼容 untuk X] + [英文: Phone Holder]',
  stand: '[Pemegang Telefon + 类型 Meja/Lipat] + [可调 Boleh Laras] + [材质 Aloz/Plastik] + [功能 Putaran 360°] + [英文: Phone Stand]',
  phone_lens: '[Kanta Kamera Telefon] + [类型 Fisheye/Telefoto/Makro/Lebar] + [兼容 untuk 型号/品牌] + [安装 Klip] + [功能 HD/Zoom] + [英文: Phone Lens]',
  earbuds: '[Fon Telinga Bluetooth] + [类型 TWS/Tanpa Wayar] + [功能 Mikrofon/Pengurangan Bunyi] + [电池 mAh/jam] + [连接 Bluetooth 5.3] + [英文: Wireless Earbuds]',
};

export function getTemplate(categoryId: string): string {
  return TITLE_TEMPLATES[categoryId] ||
    '[核心产品词] + [关键规格] + [功能] + [兼容 untuk X] + [英文辅助词]';
}

// 营销词黑名单（含侵权风险词 Original/Authentic——1688 无品牌授权货禁止使用）
export const TITLE_BLACKLIST: string[] = [
  'best', 'no.1', 'no. 1', 'no 1', 'number one', 'bestseller', 'best seller',
  'original', 'authentic', 'official', 'genuine',
  'premium', 'luxury', 'top quality', 'high quality', 'top grade',
  'viral', 'hot sale', 'hotsale', 'must buy', 'cheap', 'cheapest',
  'super', 'amazing', 'perfect', '100%', 'new arrival', 'free shipping',
  'ready stock', 'cod', 'fast delivery',
];

export interface TitleValidation {
  cleaned: string;
  removed: string[];
  issues: string[];
  ok: boolean;
}

// 校验 + 自动清理：黑名单剔除、空白收敛；重复词与长度只提示不强制
export function validateTitle(title: string): TitleValidation {
  let cleaned = ' ' + title.replace(/\s+/g, ' ').trim() + ' ';
  const removed: string[] = [];
  const issues: string[] = [];

  const lower = cleaned.toLowerCase();
  for (const bad of TITLE_BLACKLIST) {
    const re = new RegExp(`\\s${bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s`, 'gi');
    if (re.test(lower)) {
      cleaned = cleaned.replace(re, ' ');
      removed.push(bad);
    }
  }

  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  // 标点残留清理（去词后可能留下孤立逗号）
  cleaned = cleaned.replace(/(\s[,，/|]+\s)+/g, ' ').replace(/\s{2,}/g, ' ').replace(/[,，/|]\s*$/g, '').trim();

  if (removed.length) issues.push(`已移除黑名单词: ${removed.join(', ')}`);
  if (cleaned.length < 50) issues.push(`长度 ${cleaned.length} 字符，低于建议下限 50（目标 70~90）`);
  if (cleaned.length > 120) issues.push(`长度 ${cleaned.length} 字符，超过建议上限 120，建议删减次要词`);

  // 内容词重复检测（>3 字符的词出现 ≥3 次）
  const words = cleaned.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3);
  const counts: Record<string, number> = {};
  for (const w of words) counts[w] = (counts[w] || 0) + 1;
  const dups = Object.entries(counts).filter(([, n]) => n >= 3).map(([w]) => w);
  if (dups.length) issues.push(`重复词(≥3次): ${dups.join(', ')}，建议删减`);

  return { cleaned, removed, issues, ok: removed.length === 0 && cleaned.length >= 50 && cleaned.length <= 120 };
}

export interface StructuredTitleInput {
  category: string;
  name: string;              // 清洗后的 1688 标题
  brand?: string;
  specsText?: string;        // 妙手参数文本（去 HTML）
  description?: string;      // AI 长描述
  analysis?: string;         // AI 分析 JSON
  sellingPoints?: string[];
}

// 结构化 MS 标题生成 prompt：模板填空 + 只准用真实数据 + 硬性约束
export function buildStructuredMsTitlePrompt(input: StructuredTitleInput): string {
  const core = MS_CORE_WORDS[input.category] || MS_CORE_WORDS['other'];
  const template = getTemplate(input.category);
  const points = (input.sellingPoints || []).slice(0, 6).join('; ');

  return `Task: Generate ONE Bahasa Melayu product title for TikTok Shop Malaysia, following the structured template strictly.

PRODUCT DATA (the ONLY source of truth — do NOT invent any spec/model/feature not present here):
- Cleaned title: ${input.name}
- Brand: ${input.brand || '(none)'}
- Specs from supplier: ${input.specsText || '(none)'}
- AI description excerpt: ${input.description || '(none)'}
- AI analysis: ${input.analysis || '(none)'}
- Selling points: ${points || '(none)'}

CATEGORY: ${input.category}
CORE WORD (must start the title): ${core.core}
TITLE TEMPLATE (slot order = search weight order):
${template}

HARD RULES:
1. Start with the core word "${core.core}". End with the English keyword "${core.en}".
2. Fill slots ONLY with specs/attributes that appear in PRODUCT DATA above. If a slot has no data, SKIP that slot entirely — never invent.
3. Compatible models: ONLY use models explicitly present in PRODUCT DATA, prefixed with "untuk". If no model is given, write "untuk Telefon Android" (or the actual device type) — never guess iPhone/Samsung models.
4. NEVER add promotional words: Best, No.1, Original, Authentic, Premium, Luxury, Viral, Top Quality, Cheap, Super, Amazing, Hot Sale, 100%.
5. Technical terms stay untranslated: USB-C, GaN, PD, QC, mAh, W, HDMI, MagSafe, Bluetooth, Type-C, 65W.
6. Language mix: ~70-85% Bahasa Melayu + technical terms + English keyword tail. Do not repeat keywords.
7. Length: 70-90 characters (hard max 120). No emoji.
8. Output ONLY the title text — no quotes, no explanation.`;
}

export const MS_STRUCTURED_SYSTEM_PROMPT = 'You are a TikTok Shop Malaysia 3C listing specialist. You generate precise, spec-driven Bahasa Melayu titles from structured product data. You never invent specifications and never add promotional words.';
