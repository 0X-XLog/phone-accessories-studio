import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'studio.db');

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initTables(_db);
  }
  return _db;
}

// Fields that need JSON serialization (arrays and objects stored as TEXT)
const JSON_FIELDS = new Set([
  'specs', 'ai_analysis', 'description_specs',
  'selling_points', 'original_images', 'description_images',
  'original_image_sources', 'desc_image_sources',
  'description_bullets', 'description_faq',
  'core_keywords', 'longtail_keywords',
]);

function serializeValue(key: string, value: unknown): unknown {
  if (JSON_FIELDS.has(key) && value !== undefined && value !== null) {
    return JSON.stringify(value);
  }
  return value;
}

function parseRow<T = Record<string, unknown>>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (JSON_FIELDS.has(key) && typeof value === 'string') {
      try {
        result[key] = JSON.parse(value);
      } catch {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

function parseRows<T = Record<string, unknown>>(rows: Record<string, unknown>[]): T[] {
  return rows.map(row => parseRow<T>(row));
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pa_products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      category TEXT DEFAULT '',
      brand TEXT DEFAULT '',
      color TEXT DEFAULT '',
      material TEXT DEFAULT '',
      specs TEXT DEFAULT '{}',
      selling_points TEXT DEFAULT '[]',
      original_images TEXT DEFAULT '[]',
      description_images TEXT DEFAULT '[]',
      ai_analysis TEXT DEFAULT '{}',
      title_shopee_en TEXT DEFAULT '',
      title_shopee_ms TEXT DEFAULT '',
      title_tiktok_en TEXT DEFAULT '',
      title_tiktok_ms TEXT DEFAULT '',
      title_tiktok_zh TEXT DEFAULT '',
      title_tiktok_th TEXT DEFAULT '',
      title_lazada_en TEXT DEFAULT '',
      title_lazada_ms TEXT DEFAULT '',
      description_short TEXT DEFAULT '',
      description_long TEXT DEFAULT '',
      description_bullets TEXT DEFAULT '[]',
      description_specs TEXT DEFAULT '{}',
      description_faq TEXT DEFAULT '[]',
      core_keywords TEXT DEFAULT '[]',
      longtail_keywords TEXT DEFAULT '[]',
      source TEXT DEFAULT '',
      ms_detail_id INTEGER,
      status TEXT DEFAULT 'draft',
      total_cost REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pa_generated_images (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES pa_products(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'main_white',
      sub_type TEXT DEFAULT '',
      prompt TEXT NOT NULL DEFAULT '',
      original_image_url TEXT DEFAULT '',
      generated_image_url TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pa_generation_history (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES pa_products(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      cost_usd REAL DEFAULT 0,
      status TEXT DEFAULT 'success',
      error_message TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pa_selling_points (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      point_en TEXT NOT NULL,
      point_ms TEXT DEFAULT '',
      point_zh TEXT DEFAULT '',
      point_image_prompt TEXT DEFAULT '',
      priority INTEGER DEFAULT 0,
      UNIQUE(category, point_en)
    );

    CREATE INDEX IF NOT EXISTS idx_pa_products_status ON pa_products(status);
    CREATE INDEX IF NOT EXISTS idx_pa_products_category ON pa_products(category);
    CREATE INDEX IF NOT EXISTS idx_pa_products_created_at ON pa_products(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_pa_generated_images_product ON pa_generated_images(product_id);
    CREATE INDEX IF NOT EXISTS idx_pa_generation_history_product ON pa_generation_history(product_id);
    CREATE INDEX IF NOT EXISTS idx_pa_selling_points_category ON pa_selling_points(category);
  `);

  // Migrate: add new columns to existing databases (safe no-op if column exists)
  try { db.exec("ALTER TABLE pa_products ADD COLUMN source TEXT DEFAULT ''"); } catch { /* column exists */ }
  try { db.exec("ALTER TABLE pa_products ADD COLUMN ms_detail_id INTEGER"); } catch { /* column exists */ }
  try { db.exec("ALTER TABLE pa_products ADD COLUMN description_images TEXT DEFAULT '[]'"); } catch { /* column exists */ }
}

export function generateId(): string {
  return crypto.randomUUID();
}

// ============ Products ============

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  color: string;
  material: string;
  specs: Record<string, unknown>;
  selling_points: string[];
  original_images: string[];
  description_images: string[];
  original_image_sources: string[];
  desc_image_sources: string[];
  original_notes_html: string;
  ai_analysis: Record<string, unknown>;
  title_shopee_en: string;
  title_shopee_ms: string;
  title_tiktok_en: string;
  title_tiktok_ms: string;
  title_tiktok_zh: string;
  title_tiktok_th: string;
  title_lazada_en: string;
  title_lazada_ms: string;
  description_short: string;
  description_long: string;
  description_bullets: string[];
  description_specs: Record<string, unknown>;
  description_faq: string[];
  core_keywords: string[];
  longtail_keywords: string[];
  source: string;
  ms_detail_id: number | null;
  status: string;
  total_cost: number;
  created_at: string;
  updated_at: string;
}

export function getProducts(status?: string, limit = 50, offset = 0): { products: Product[]; total: number } {
  const db = getDb();

  let whereClause = '';
  const params: unknown[] = [];

  if (status && status !== 'all') {
    whereClause = 'WHERE status = ?';
    params.push(status);
  }

  const total = (db.prepare(`SELECT COUNT(*) as count FROM pa_products ${whereClause}`).get(...params) as { count: number }).count;

  const rows = db.prepare(
    `SELECT * FROM pa_products ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as Record<string, unknown>[];

  return { products: parseRows<Product>(rows), total };
}

export function getProductById(id: string): Product | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM pa_products WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? parseRow<Product>(row) : null;
}

export function createProduct(data: Partial<Product>): Product {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();

  const fields: Record<string, unknown> = {
    id,
    name: data.name || '',
    category: data.category || '',
    brand: data.brand || '',
    color: data.color || '',
    material: data.material || '',
    specs: data.specs || {},
    selling_points: data.selling_points || [],
    original_images: data.original_images || [],
    description_images: data.description_images || [],
    original_image_sources: data.original_image_sources || [],
    desc_image_sources: data.desc_image_sources || [],
    original_notes_html: data.original_notes_html || '',
    source: data.source || '',
    ms_detail_id: data.ms_detail_id || null,
    status: 'draft',
    total_cost: 0,
    created_at: now,
    updated_at: now,
  };

  const keys = Object.keys(fields);
  const values = keys.map(k => serializeValue(k, fields[k]));

  db.prepare(
    `INSERT INTO pa_products (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`
  ).run(...values);

  return getProductById(id)!;
}

export function updateProduct(id: string, data: Record<string, unknown>): Product | null {
  const db = getDb();

  const updates: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };
  delete updates.id; // never update primary key

  const keys = Object.keys(updates);
  if (keys.length === 0) return getProductById(id);

  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => serializeValue(k, updates[k]));

  db.prepare(`UPDATE pa_products SET ${setClause} WHERE id = ?`).run(...values, id);

  return getProductById(id);
}

export function deleteProduct(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM pa_products WHERE id = ?').run(id);
  return result.changes > 0;
}

export function addProductCost(productId: string, cost: number): void {
  const db = getDb();
  db.prepare('UPDATE pa_products SET total_cost = total_cost + ? WHERE id = ?').run(cost, productId);
}

// ============ Generated Images ============

export interface GeneratedImage {
  id: string;
  product_id: string;
  type: string;
  sub_type: string;
  prompt: string;
  original_image_url: string;
  generated_image_url: string;
  created_at: string;
}

export function getImagesByProductId(productId: string): GeneratedImage[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM pa_generated_images WHERE product_id = ? ORDER BY created_at DESC'
  ).all(productId) as Record<string, unknown>[];
  return parseRows<GeneratedImage>(rows);
}

export function createImage(data: {
  product_id: string;
  type: string;
  sub_type?: string;
  prompt: string;
  original_image_url?: string;
  generated_image_url?: string;
}): GeneratedImage {
  const db = getDb();
  const id = generateId();

  db.prepare(`
    INSERT INTO pa_generated_images (id, product_id, type, sub_type, prompt, original_image_url, generated_image_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    id,
    data.product_id,
    data.type,
    data.sub_type || '',
    data.prompt,
    data.original_image_url || '',
    data.generated_image_url || ''
  );

  return {
    id,
    product_id: data.product_id,
    type: data.type,
    sub_type: data.sub_type || '',
    prompt: data.prompt,
    original_image_url: data.original_image_url || '',
    generated_image_url: data.generated_image_url || '',
    created_at: new Date().toISOString(),
  };
}

// ============ Generation History ============

export interface GenerationHistory {
  id: string;
  product_id: string;
  type: string;
  model: string;
  cost_usd: number;
  status: string;
  error_message: string;
  created_at: string;
}

export function getHistoryByProductId(productId: string): GenerationHistory[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM pa_generation_history WHERE product_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(productId) as Record<string, unknown>[];
  return parseRows<GenerationHistory>(rows);
}

export function createHistory(data: {
  product_id: string;
  type: string;
  model: string;
  cost_usd?: number;
  status?: string;
  error_message?: string;
}): void {
  const db = getDb();
  const id = generateId();

  db.prepare(`
    INSERT INTO pa_generation_history (id, product_id, type, model, cost_usd, status, error_message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    id,
    data.product_id,
    data.type,
    data.model,
    data.cost_usd || 0,
    data.status || 'success',
    data.error_message || ''
  );
}

// ============ Stats ============

export function getStats() {
  const db = getDb();

  const statusRows = db.prepare('SELECT status FROM pa_products').all() as { status: string }[];
  const counts: Record<string, number> = { draft: 0, analyzed: 0, generated: 0, completed: 0, total: 0 };
  for (const row of statusRows) {
    counts.total++;
    if (row.status in counts) counts[row.status]++;
  }

  const costRow = db.prepare('SELECT COALESCE(SUM(total_cost), 0) as total FROM pa_products').get() as { total: number };
  const totalCost = costRow.total;

  const historyRows = db.prepare('SELECT type, status FROM pa_generation_history').all() as { type: string; status: string }[];
  const generationStats: Record<string, number> = { image_edit: 0, image_generate: 0, title: 0, description: 0, analysis: 0, failed: 0 };
  for (const row of historyRows) {
    if (row.type in generationStats) generationStats[row.type]++;
    if (row.status === 'failed') generationStats.failed++;
  }

  const imageCountRow = db.prepare('SELECT COUNT(*) as count FROM pa_generated_images').get() as { count: number };

  const recentRows = db.prepare(
    'SELECT id, name, status, total_cost, created_at FROM pa_products ORDER BY created_at DESC LIMIT 5'
  ).all() as Record<string, unknown>[];

  return {
    products: counts,
    totalCost,
    generations: generationStats,
    imageCount: imageCountRow.count,
    recentProducts: parseRows(recentRows),
  };
}
