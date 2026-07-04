// 3C Phone Accessories category definitions

export interface Category {
  id: string;
  nameEn: string;
  nameZh: string;
  nameMs: string;
  icon: string;
}

export const CATEGORIES: Category[] = [
  { id: 'phone_case', nameEn: 'Phone Case', nameZh: '手机壳', nameMs: 'Kes Telefon', icon: '📱' },
  { id: 'screen_protector', nameEn: 'Screen Protector', nameZh: '手机膜', nameMs: 'Penapis Skrin', icon: '🛡️' },
  { id: 'earbuds', nameEn: 'Earbuds', nameZh: '蓝牙耳机', nameMs: 'Earbud', icon: '🎧' },
  { id: 'earbuds_case', nameEn: 'Earbuds Case', nameZh: '耳机壳', nameMs: 'Kes Earbud', icon: '🎵' },
  { id: 'cable', nameEn: 'Cable', nameZh: '数据线', nameMs: 'Kabel', icon: '🔌' },
  { id: 'charger', nameEn: 'Charger', nameZh: '充电器', nameMs: 'Pengecas', icon: '⚡' },
  { id: 'wireless_charger', nameEn: 'Wireless Charger', nameZh: '无线充电器', nameMs: 'Pengecas Tanpa Wayar', icon: '🔋' },
  { id: 'power_bank', nameEn: 'Power Bank', nameZh: '充电宝', nameMs: 'Power Bank', icon: '🔋' },
  { id: 'holder', nameEn: 'Phone Holder', nameZh: '手机支架', nameMs: 'Pemegang Telefon', icon: '🏟️' },
  { id: 'stand', nameEn: 'Phone Stand', nameZh: '手机支架', nameMs: 'Tudung Telefon', icon: '📊' },
  { id: 'car_mount', nameEn: 'Car Mount', nameZh: '车载支架', nameMs: 'Pemegang Kereta', icon: '🚗' },
  { id: 'phone_ring', nameEn: 'Phone Ring Holder', nameZh: '手机指环扣', nameMs: 'Cincin Telefon', icon: '💍' },
  { id: 'phone_lanyard', nameEn: 'Phone Lanyard', nameZh: '手机挂绳', nameMs: 'Tali Telefon', icon: '🔗' },
  { id: 'fan', nameEn: 'USB Fan', nameZh: 'USB风扇', nameMs: 'Kipas USB', icon: '🌀' },
  { id: 'usb_hub', nameEn: 'USB Hub', nameZh: 'USB扩展坞', nameMs: 'USB Hub', icon: '🎛️' },
  { id: 'stylus', nameEn: 'Stylus Pen', nameZh: '触控笔', nameMs: 'Pen Stylus', icon: '✏️' },
  { id: 'phone_pouch', nameEn: 'Phone Pouch', nameZh: '手机收纳袋', nameMs: 'Beg Telefon', icon: '👝' },
  { id: 'tablet_case', nameEn: 'Tablet Case', nameZh: '平板保护套', nameMs: 'Kes Tablet', icon: '📟' },
  { id: 'smart_watch', nameEn: 'Smart Watch', nameZh: '智能手表', nameMs: 'Jam Pintar', icon: '⌚' },
  { id: 'smart_band', nameEn: 'Smart Band', nameZh: '智能手环', nameMs: 'Gelang Pintar', icon: '📱' },
  { id: 'cleaning_kit', nameEn: 'Cleaning Kit', nameZh: '清洁套装', nameMs: 'Kit Pembersihan', icon: '🧹' },
  { id: 'other', nameEn: 'Other', nameZh: '其他配件', nameMs: 'Aksesori Lain', icon: '📦' },
];

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

// Scene prompts per category for image generation
export const SCENE_PROMPTS: Record<string, string[]> = {
  phone_case: [
    'lifestyle flat lay with phone on a marble table, aesthetic minimal setup with coffee cup and plant. HD quality, remove any Chinese text or watermarks, keep product exactly as-is.',
    'holding phone casually in hand, street photography style, warm natural lighting. HD quality, remove any Chinese text or watermarks.',
    'on a modern desk setup with laptop, keyboard, and accessories, top-down view. HD quality, remove any Chinese text or watermarks.',
  ],
  screen_protector: [
    'applying screen protector on phone, clean hands and desk, professional installation scene. HD quality, remove any Chinese text or watermarks.',
    'phone with screen protector on clean white desk, minimal product photography with soft lighting. HD quality, remove any Chinese text or watermarks.',
    'screen protector packaging display, retail product shot on gradient background. HD quality, remove any Chinese text or watermarks.',
  ],
  earbuds: [
    'in a gaming setup with RGB keyboard and monitor, dramatic lighting. HD quality, remove any Chinese text or watermarks.',
    'during workout/running, outdoor fitness scene, energetic atmosphere. HD quality, remove any Chinese text or watermarks.',
    'on an office desk with notebook and coffee, clean professional environment. HD quality, remove any Chinese text or watermarks.',
    'commuting on a bus or train, urban lifestyle scene. HD quality, remove any Chinese text or watermarks.',
  ],
  earbuds_case: [
    'earbuds case on desk beside a phone and keys, everyday carry flat lay style. HD quality, remove any Chinese text or watermarks.',
    'decorative earbuds case held in hand, lifestyle product shot with soft lighting. HD quality, remove any Chinese text or watermarks.',
    'earbuds case clipped to bag or backpack strap, outdoor adventure scene. HD quality, remove any Chinese text or watermarks.',
  ],
  cable: [
    'charging station setup with phone and accessories on desk, organized clean look. HD quality, remove any Chinese text or watermarks.',
    'desk setup with cable management, minimalist workspace, cool lighting. HD quality, remove any Chinese text or watermarks.',
    'inside a car interior, phone plugged in to car charger, dashboard view. HD quality, remove any Chinese text or watermarks.',
  ],
  charger: [
    'on a modern desk setup charging multiple devices, clean tech aesthetic. HD quality, remove any Chinese text or watermarks.',
    'on a nightstand beside a bed, warm ambient lighting, phone charging. HD quality, remove any Chinese text or watermarks.',
    'in a travel bag packed with essentials, outdoor adventure theme. HD quality, remove any Chinese text or watermarks.',
  ],
  wireless_charger: [
    'phone resting on wireless charger pad on minimalist desk, clean modern aesthetic, charging indicator light. HD quality, remove any Chinese text or watermarks.',
    'wireless charging station with phone, watch, and earbuds, organized setup on nightstand. HD quality, remove any Chinese text or watermarks.',
    'wireless charger in car, phone mounted and charging, driving perspective. HD quality, remove any Chinese text or watermarks.',
  ],
  power_bank: [
    'traveling at airport, backpack and luggage, adventure theme. HD quality, remove any Chinese text or watermarks.',
    'outdoor camping scene with tent and nature, adventure lifestyle. HD quality, remove any Chinese text or watermarks.',
    'at a coffee shop charging phone, cozy cafe interior, warm lighting. HD quality, remove any Chinese text or watermarks.',
  ],
  holder: [
    'mounted on car dashboard with navigation screen visible, driving perspective. HD quality, remove any Chinese text or watermarks.',
    'on office desk with laptop, video call setup, clean workspace. HD quality, remove any Chinese text or watermarks.',
    'on bedside nightstand with lamp and alarm clock, cozy bedroom. HD quality, remove any Chinese text or watermarks.',
    'in kitchen, viewing recipe on phone while cooking, warm kitchen lighting. HD quality, remove any Chinese text or watermarks.',
  ],
  stand: [
    'desk video call setup with laptop in background, professional work from home. HD quality, remove any Chinese text or watermarks.',
    'on bedside nightstand, phone propped up watching content, cozy bedroom. HD quality, remove any Chinese text or watermarks.',
    'in kitchen, phone displaying recipe while cooking, warm kitchen scene. HD quality, remove any Chinese text or watermarks.',
  ],
  car_mount: [
    'on car dashboard with city view through windshield, driving perspective. HD quality, remove any Chinese text or watermarks.',
    'mounted on air vent, interior car shot, navigation visible on phone. HD quality, remove any Chinese text or watermarks.',
    'on windshield with highway view, road trip atmosphere. HD quality, remove any Chinese text or watermarks.',
  ],
  phone_ring: [
    'phone with ring holder being used as stand, watching video on desk, lifestyle shot. HD quality, remove any Chinese text or watermarks.',
    'finger through phone ring holder, one-hand holding phone securely, close-up detail. HD quality, remove any Chinese text or watermarks.',
    'phone ring holder on back of phone case, product showcase on clean background. HD quality, remove any Chinese text or watermarks.',
  ],
  phone_lanyard: [
    'phone with lanyard around neck, casual street style portrait, lifestyle photography. HD quality, remove any Chinese text or watermarks.',
    'phone with decorative lanyard strap, flat lay with sunglasses and keys, summer vibe. HD quality, remove any Chinese text or watermarks.',
    'colorful phone lanyards hanging on display rack, product showcase. HD quality, remove any Chinese text or watermarks.',
  ],
  fan: [
    'on an office desk next to a laptop, paperwork, hot day scene. HD quality, remove any Chinese text or watermarks.',
    'in a study room with books and monitor, student workspace. HD quality, remove any Chinese text or watermarks.',
    'clipped to a desk edge, close-up showing airflow, summer heat relief. HD quality, remove any Chinese text or watermarks.',
  ],
  usb_hub: [
    'USB hub on desk with multiple devices connected, laptop setup, organized workspace. HD quality, remove any Chinese text or watermarks.',
    'USB hub close-up showing ports, cable connected, product detail shot on clean background. HD quality, remove any Chinese text or watermarks.',
    'travel setup with USB hub, laptop and accessories on hotel desk, minimalist. HD quality, remove any Chinese text or watermarks.',
  ],
  stylus: [
    'stylus pen on tablet, drawing or note-taking scene, creative workspace. HD quality, remove any Chinese text or watermarks.',
    'stylus pen beside iPad on desk, professional note-taking setup. HD quality, remove any Chinese text or watermarks.',
    'hand holding stylus writing on tablet screen, close-up action shot. HD quality, remove any Chinese text or watermarks.',
  ],
  phone_pouch: [
    'phone pouch bag on outdoor adventure, hiking or traveling scene. HD quality, remove any Chinese text or watermarks.',
    'phone in pouch case attached to belt or bag strap, sporty outdoor lifestyle. HD quality, remove any Chinese text or watermarks.',
    'colorful phone pouches flat lay display, product showcase arrangement. HD quality, remove any Chinese text or watermarks.',
  ],
  tablet_case: [
    'tablet with case on desk in office setting, keyboard nearby, professional setup. HD quality, remove any Chinese text or watermarks.',
    'child using tablet in protective case, family living room scene. HD quality, remove any Chinese text or watermarks.',
    'tablet case with stand function, viewing angle on airplane tray table, travel scene. HD quality, remove any Chinese text or watermarks.',
  ],
  smart_watch: [
    'smart watch on wrist during outdoor run, fitness tracking scene. HD quality, remove any Chinese text or watermarks.',
    'smart watch on desk beside phone and coffee, tech lifestyle flat lay. HD quality, remove any Chinese text or watermarks.',
    'smart watch displaying health data, close-up of screen, product detail shot. HD quality, remove any Chinese text or watermarks.',
  ],
  smart_band: [
    'fitness band on wrist during workout, gym or outdoor exercise scene. HD quality, remove any Chinese text or watermarks.',
    'smart band charging on desk beside phone, everyday lifestyle. HD quality, remove any Chinese text or watermarks.',
    'smart band sleep tracking display, close-up of screen on nightstand. HD quality, remove any Chinese text or watermarks.',
  ],
  cleaning_kit: [
    'phone cleaning kit with microfiber cloth and cleaning solution on desk, product photography. HD quality, remove any Chinese text or watermarks.',
    'cleaning phone screen with microfiber cloth, satisfying clean result, close-up. HD quality, remove any Chinese text or watermarks.',
    'cleaning kit tools arranged neatly, organized product showcase. HD quality, remove any Chinese text or watermarks.',
  ],
};

// Selling point image prompts per category
export const SELLING_POINT_IMAGE_PROMPTS: Record<string, Record<string, string>> = {
  phone_case: {
    shockproof: 'Show the phone case in a drop test scenario, phone falling from hand, motion blur, high-quality product demonstration. HD quality, remove any Chinese text or watermarks.',
    slim_design: 'Side profile comparison showing ultra-thin phone case, minimal design, sleek modern look on clean background. HD quality, remove any Chinese text or watermarks.',
    lens_protection: 'Close-up of camera lens area with raised bezel protection, detailed macro shot showing the lens guard feature. HD quality, remove any Chinese text or watermarks.',
    magsafe: 'Phone case with MagSafe charger attached, wireless charging in progress, LED indicator glowing, modern tech setup. HD quality, remove any Chinese text or watermarks.',
    clear_design: 'Crystal clear transparent phone case showing phone color through, aesthetic product photography on gradient background. HD quality, remove any Chinese text or watermarks.',
  },
  screen_protector: {
    anti_scratch: 'Screen protector durability test with keys and coins scratching surface, no marks left, close-up demonstration. HD quality, remove any Chinese text or watermarks.',
    bubble_free: 'Screen protector being applied smoothly with no bubbles, installation process, clean result. HD quality, remove any Chinese text or watermarks.',
    hd_clarity: 'Phone screen with protector showing crystal clear display, vibrant colors visible through protector. HD quality, remove any Chinese text or watermarks.',
    fingerprint_resistant: 'Finger touching screen with protector, no fingerprint marks visible, oleophobic coating demonstration. HD quality, remove any Chinese text or watermarks.',
  },
  earbuds: {
    noise_cancellation: 'Person wearing earbuds in noisy environment, sound waves being blocked, peaceful expression, professional photography. HD quality, remove any Chinese text or watermarks.',
    battery_life: 'Earbuds in charging case with battery percentage display, 24-hour battery graphic overlay, clean product shot. HD quality, remove any Chinese text or watermarks.',
    bass_boost: 'Sound wave visualization from earbuds, deep bass frequencies, colorful equalizer-style visual, dynamic product shot. HD quality, remove any Chinese text or watermarks.',
    waterproof: 'Earbuds with water splash effect, IPX5 waterproof demonstration, droplets on product, clean dramatic lighting. HD quality, remove any Chinese text or watermarks.',
  },
  earbuds_case: {
    cute_design: 'Decorative earbuds case with cute character design, held in hand, lifestyle product shot. HD quality, remove any Chinese text or watermarks.',
    protection: 'Earbuds case impact protection demonstration, durable shell material close-up. HD quality, remove any Chinese text or watermarks.',
    with_carabiner: 'Earbuds case with carabiner clip attached to backpack, outdoor lifestyle scene. HD quality, remove any Chinese text or watermarks.',
  },
  cable: {
    fast_charging: 'Cable with lightning bolt energy effect, fast charging speed visualization, phone battery percentage increasing. HD quality, remove any Chinese text or watermarks.',
    durable: 'Cable being bent and twisted showing flexibility and durability, stress test demonstration, macro detail shot. HD quality, remove any Chinese text or watermarks.',
    braided_nylon: 'Close-up of braided nylon cable texture, premium material detail, professional macro photography. HD quality, remove any Chinese text or watermarks.',
  },
  charger: {
    fast_charging: 'Charger with multiple devices plugged in, speed lines, fast charging visualization, tech product shot. HD quality, remove any Chinese text or watermarks.',
    multi_port: 'Charger showing multiple output ports, several devices connected, organized charging station setup. HD quality, remove any Chinese text or watermarks.',
    compact: 'Charger in palm of hand showing small compact size, travel-friendly, compared to a coin for scale. HD quality, remove any Chinese text or watermarks.',
  },
  wireless_charger: {
    fast_charging: 'Wireless charger with phone on top, energy waves visualization, fast wireless charging demonstration. HD quality, remove any Chinese text or watermarks.',
    multi_device: '3-in-1 wireless charger stand with phone, watch, and earbuds, clean desk setup. HD quality, remove any Chinese text or watermarks.',
    compact: 'Slim wireless charger pad in hand, ultra-thin design comparison, portable travel-friendly. HD quality, remove any Chinese text or watermarks.',
  },
  power_bank: {
    high_capacity: 'Power bank with capacity indicator showing full charge, multiple device icons, high capacity visualization. HD quality, remove any Chinese text or watermarks.',
    fast_charging: 'Power bank charging phone rapidly, speed lines and energy flow, fast charging output demonstration. HD quality, remove any Chinese text or watermarks.',
    compact: 'Power bank in hand or pocket showing slim compact design, portable size comparison, travel-friendly. HD quality, remove any Chinese text or watermarks.',
  },
  phone_ring: {
    magnetic: 'Magnetic phone ring holder attaching to phone back, strong magnet demonstration. HD quality, remove any Chinese text or watermarks.',
    rotation: 'Phone ring holder showing 360 degree rotation, phone in different angles, feature showcase. HD quality, remove any Chinese text or watermarks.',
    as_stand: 'Phone ring holder used as kickstand, phone propped up on desk watching video. HD quality, remove any Chinese text or watermarks.',
  },
  smart_watch: {
    health_tracking: 'Smart watch displaying heart rate and step data on screen, fitness tracking close-up. HD quality, remove any Chinese text or watermarks.',
    waterproof: 'Smart watch with water splash, waterproof demonstration, sport lifestyle. HD quality, remove any Chinese text or watermarks.',
    battery_life: 'Smart watch on wrist showing battery indicator, long battery life visualization. HD quality, remove any Chinese text or watermarks.',
  },
  smart_band: {
    fitness_tracking: 'Smart band showing exercise data on screen, running or gym workout scene. HD quality, remove any Chinese text or watermarks.',
    sleep_monitoring: 'Smart band on wrist with person sleeping, sleep tracking visualization, night scene. HD quality, remove any Chinese text or watermarks.',
    waterproof: 'Smart band in water, swimming or rain, IP68 waterproof demonstration. HD quality, remove any Chinese text or watermarks.',
  },
  cleaning_kit: {
    complete_set: 'Phone cleaning kit with all tools displayed, microfiber cloth, brush, cleaner spray, organized product layout. HD quality, remove any Chinese text or watermarks.',
    effective: 'Before and after phone screen cleaning, half dirty half clean, satisfying result. HD quality, remove any Chinese text or watermarks.',
  },
};

// Category detection from Chinese product titles
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  screen_protector: ['钢化膜', '手机膜', '保护膜', '防窥膜', '水凝膜', '高清膜', '磨砂膜', '防指纹膜', '贴膜', '全屏膜', '玻璃膜', 'Screen Protector', 'Tempered Glass'],
  phone_case: ['手机壳', '手机套', '保护壳', '保护套', '硅胶套', '透明壳', '防摔壳', '手机皮套'],
  earbuds_case: ['耳机壳', '耳机套', '耳机保护壳', 'AirPods壳', '充电仓壳', 'Earbuds Case'],
  earbuds: ['蓝牙耳机', '无线耳机', 'TWS', '降噪耳机', '入耳式', '头戴式', 'Earbuds', '耳机'],
  phone_ring: ['手机指环扣', '手机扣', '指环支架', '磁吸扣', '手机背扣', '旋转扣'],
  phone_lanyard: ['手机挂绳', '手机链', '手机挂脖', '手机腕带', '手机肩带', 'Lanyard'],
  tablet_case: ['平板保护套', 'iPad保护壳', '平板壳', '平板套', 'iPad Case'],
  smart_watch: ['智能手表', 'Smart Watch', '运动手表', 'GPS手表'],
  smart_band: ['智能手环', '智能手戴', '运动手环', 'Smart Band', '手环'],
  usb_hub: ['扩展坞', '集线器', 'USB Hub', 'Type-C扩展', '分线器', ' docking'],
  stylus: ['触控笔', '手写笔', '触屏笔', 'Stylus', '电容笔', 'Pencil', 'Active Pen'],
  wireless_charger: ['无线充电器', '无线充电板', '磁吸充电', '无线充', 'Qi充电', 'Wireless Charger'],
  phone_pouch: ['手机袋', '手机包', '手机收纳袋', '手机收纳包', '手机小包'],
  cleaning_kit: ['清洁套装', '屏幕清洁', '手机清洁', '清洁布', 'Cleaning Kit'],
  cable: ['数据线', '充电线', 'USB线', 'Type-C', 'Lightning', 'MFi', '编织线', '快充线'],
  charger: ['充电器', '快充头', '充电头', '适配器', 'PD充电器', '氮化镓', 'GaN'],
  fan: ['风扇', 'USB风扇', '手持风扇', '夹子风扇', '桌面风扇'],
  holder: ['手机支架', '懒人支架', '磁吸支架'],
  stand: ['折叠支架', '手机底座', '手机托'],
  car_mount: ['车载', '汽车支架', '出风口', '导航支架', '磁吸车载'],
  power_bank: ['充电宝', '移动电源', '便携充电', 'Power Bank'],
};

// Miaoshou cateList → internal category ID mapping
const MIAOSHOU_CATEGORY_MAP: Record<string, string> = {
  '智能手表': 'smart_watch',
  '智能手环': 'smart_band',
  '智能穿戴': 'smart_watch',
  '手机壳': 'phone_case',
  '手机膜': 'screen_protector',
  '钢化膜': 'screen_protector',
  '蓝牙耳机': 'earbuds',
  '数据线': 'cable',
  '充电器': 'charger',
  '充电宝': 'power_bank',
  '手机支架': 'holder',
  '车载支架': 'car_mount',
  '手机配件': 'other',
  '3C配件': 'other',
};

export function detectCategoryFromTitle(title: string): string | null {
  const lower = title.toLowerCase();
  for (const [id, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) return id;
    }
  }
  return null;
}

// Detect category from Miaoshou cateList array
export function detectCategoryFromMiaoshou(cateList: string[] | undefined | null): string | null {
  if (!cateList || cateList.length === 0) return null;
  for (const cate of cateList) {
    const mapped = MIAOSHOU_CATEGORY_MAP[cate];
    if (mapped) return mapped;
  }
  return null;
}
