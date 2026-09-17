// Match our 3C accessory categories to TikTok Shop category tree (leaf nodes)
import { CATEGORIES } from './categories';
import { TiktokCategory } from './tiktok-api';

// Extra keyword hints beyond the EN name (matched against TikTok category names)
const MATCH_KEYWORDS: Record<string, string[]> = {
  phone_case: ['phone case'],
  screen_protector: ['screen protector', 'screen film', 'tempered glass'],
  earbuds: ['earbud', 'earphone', 'headphone'],
  earbuds_case: ['earphone case', 'headphone case', 'earbud case'],
  cable: ['cable', 'charging cable'],
  charger: ['charger', 'charging adapter', 'adapter'],
  wireless_charger: ['wireless charger', 'wireless charging'],
  power_bank: ['power bank'],
  holder: ['phone holder', 'bracket'],
  stand: ['stand', 'holder'],
  car_mount: ['car mount', 'car holder', 'car phone'],
  phone_ring: ['ring holder', 'finger ring', 'ring bracket'],
  phone_lanyard: ['lanyard', 'neck strap'],
  fan: ['fan'],
  usb_hub: ['hub', 'usb splitter', 'otg'],
  stylus: ['stylus', 'touch pen'],
  phone_pouch: ['pouch', 'bag'],
  tablet_case: ['tablet case', 'tablet cover', 'ipad case'],
  smart_watch: ['smart watch', 'smartwatch'],
  smart_band: ['smart band', 'fitness'],
  cleaning_kit: ['cleaning'],
  other: [],
};

export interface CategoryMatch {
  id: string;
  name: string;
  score: number;
}

// Score leaf categories by keyword overlap; returns best matches (may be empty → ask user to pick)
export function matchTiktokCategories(categoryId: string, tree: TiktokCategory[]): CategoryMatch[] {
  const our = CATEGORIES.find(c => c.id === categoryId);
  const hints = [
    our?.nameEn.toLowerCase() || '',
    ...(MATCH_KEYWORDS[categoryId] || []),
  ].filter(Boolean);

  const leaves = tree.filter(c => c.is_leaf);
  const scored: CategoryMatch[] = [];
  for (const node of leaves) {
    const name = (node.local_name || '').toLowerCase();
    let score = 0;
    for (const kw of hints) {
      if (name.includes(kw)) score += kw.length; // longer keyword = stronger signal
    }
    if (score > 0) scored.push({ id: node.id, name: node.local_name, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 8);
}
