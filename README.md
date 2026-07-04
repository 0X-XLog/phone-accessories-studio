# 📱 Phone Accessories Studio

> AI 驱动的 3C 手机配件商品上架工具 — 从采集、AI 分析、多语言标题/描述生成到图片增强，一站式完成 Shopee / TikTok 商品上架素材准备。

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)
![Gemini](https://img.shields.io/badge/Gemini-API-4285f4?logo=google)

---

## ✨ 功能特性

### 📦 商品采集
- **1688 采集** — Puppeteer 自动抓取商品标题、主图（最多9张）、详情图（最多20张），自动上传至 R2
- **妙手 ERP 对接** — 自动获取收藏夹商品列表、商品详情，支持回传编辑到 TikTok 收藏夹
- **智能标题清洗** — 自动去除品牌堆砌、SEO 垃圾词、规格冗余信息
- **自动分类** — 从中文标题自动识别 22 种配件类目

### 🤖 AI 内容生成
- **AI 视觉分析** — 基于商品图片识别材质、颜色、用途、目标用户，提取卖点和竞品关键词
- **多语言标题** — 生成 TikTok 四语标题（EN/MS/ZH/TH），遵循 IP 合规规则（品牌前缀 "for"）
- **多语言描述** — 生成短描述、长描述、卖点列表、规格表、FAQ（支持 EN/MS/ZH/TH）

### 🎨 AI 图片增强
- **批量去水印** — 自动检测并移除中文文字、水印
- **白底图生成** — 三种风格：纯净白底、增强白底、高清白底
- **场景图生成** — 20+ 类目预设生活场景（车内、办公、桌面、户外等）
- **卖点图生成** — 10+ 类目功能可视化（防摔、纤薄、镜头保护等）

### 📊 成本追踪
- 精确计算每次 AI 调用成本（图片编辑 $0.14、标题 $0.004/平台、描述 $0.008/语言）
- 商品维度累计成本统计
- 仪表盘总成本概览

### 📥 导出与批量操作
- **ZIP 打包下载** — 原图 / 详情图 / AI 增强图分目录打包
- **批量处理** — 一键生成全部标题、描述、图片增强

### 🔧 Workshop 可视化编辑
- 左右对比查看原图 / AI 生成图
- 选择源图进行实时 AI 图片编辑
- 前后对比预览

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) + React 19 |
| 语言 | TypeScript 5 |
| 样式 | Tailwind CSS v4 |
| 数据库 | SQLite (better-sqlite3, WAL 模式) |
| AI 服务 | Google Gemini API (text + vision + image) |
| 对象存储 | Cloudflare R2 (S3 兼容) |
| ERP 对接 | 妙手 ERP (HMAC-SHA256 签名) |
| 采集 | Puppeteer (系统 Chromium) |
| 部署 | Docker (Alpine Linux + Chromium) |

---

## 📸 截图预览

> 🚧 可补充项目截图

---

## 🚀 快速开始

### 环境要求
- Node.js ≥ 20
- Docker & Docker Compose（推荐部署方式）
- Google Gemini API Key
- Cloudflare R2 账户

### 安装

```bash
# 克隆仓库
git clone https://github.com/your-username/phone-accessories-studio.git
cd phone-accessories-studio

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入实际值
```

### 启动

```bash
# 开发模式
npm run dev

# Docker 部署（推荐）
docker compose up -d --build
```

启动后访问 `http://localhost:3011`，使用 `ADMIN_PASSWORD` 登录。

---

## ⚙️ 环境变量说明

| 变量 | 说明 | 示例 |
|------|------|------|
| `SUPABASE_URL` | Supabase 项目 URL | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | Supabase 匿名密钥 | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role 密钥 | `eyJ...` |
| `R2_ENDPOINT` | R2 S3 兼容端点 | `https://xxx.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | R2 Access Key | `your-key-id` |
| `R2_SECRET_ACCESS_KEY` | R2 Secret Key | `your-secret-key` |
| `R2_BUCKET_NAME` | R2 存储桶名称 | `your-bucket` |
| `R2_PUBLIC_URL` | R2 公共访问 URL | `https://xxx.r2.dev` |
| `GEMINI_API_KEY` | Gemini API 密钥 | `AQ...` |
| `TEXT_API_KEY` | 文本模型 API Key | （同 GEMINI_API_KEY） |
| `TEXT_MODEL` | 文本生成模型 | `gemini-3.5-flash` |
| `IMAGE_MODEL` | 图片生成模型 | `gemini-3.1-flash-image` |
| `ADMIN_PASSWORD` | 管理后台密码 | `your-password` |
| `MIAOSHOU_APP_KEY` | 妙手 ERP App Key | `ak_...` |
| `MIAOSHOU_APP_SECRET` | 妙手 ERP App Secret | `your-secret` |

---

## 🔌 API 接口概览

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/login` | 登录（设置 Cookie） |
| POST | `/api/admin/logout` | 登出 |

### 商品管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/products` | 商品列表（分页） |
| POST | `/api/products` | 创建商品 |
| GET | `/api/products/[id]` | 商品详情 |
| PUT | `/api/products/[id]` | 更新商品 |
| DELETE | `/api/products/[id]` | 删除商品 |

### 采集
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/scrape-1688` | 1688 商品采集 |
| GET | `/api/miaoshou` | 妙手收藏夹列表 |
| POST | `/api/miaoshou` | 妙手操作（详情/编辑） |

### AI 生成
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/analyze` | AI 视觉分析 |
| POST | `/api/titles` | 多语言标题生成 |
| POST | `/api/descriptions` | 多语言描述生成 |
| POST | `/api/images/generate` | AI 图片生成/编辑 |
| POST | `/api/images/upload` | 上传图片到 R2 |

### 导出与统计
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/download-images` | ZIP 打包下载 |
| GET | `/api/stats` | 仪表盘统计数据 |

---

## 📁 项目结构

```
phone-accessories-studio/
├── app/                        # Next.js App Router
│   ├── api/                    # API 路由
│   │   ├── admin/              # 登录/登出
│   │   ├── analyze/            # AI 分析
│   │   ├── descriptions/       # 描述生成
│   │   ├── download-images/    # ZIP 导出
│   │   ├── images/              # 图片生成/编辑/上传
│   │   ├── miaoshou/           # 妙手 ERP 对接
│   │   ├── products/           # 商品 CRUD
│   │   ├── scrape-1688/        # 1688 采集
│   │   ├── setup/              # 数据库初始化
│   │   ├── stats/              # 统计数据
│   │   └── titles/             # 标题生成
│   ├── batch/                  # 批量操作页面
│   ├── dashboard/              # 主仪表盘
│   ├── login/                  # 登录页
│   ├── products/               # 商品列表/详情/新建
│   └── workshop/               # Workshop 可视化编辑
├── components/                 # React 组件
├── lib/                        # 工具库
│   ├── categories.ts           # 22 种配件类目定义
│   ├── cost.ts                 # 成本计算
│   ├── db.ts                   # SQLite 数据库操作
│   ├── image-ai.ts             # Gemini 图片 API
│   ├── prompts-3c.ts           # AI Prompt 模板
│   ├── r2.ts                   # Cloudflare R2 客户端
│   ├── text-ai.ts              # Gemini 文本 API
│   └── verify-admin.ts         # 认证中间件
├── supabase/migrations/        # 数据库 Schema
├── Dockerfile                  # Docker 构建
├── docker-compose.yml          # Docker Compose 配置
├── .env.example                # 环境变量模板
└── package.json
```

---

## 📱 支持的商品类目（22 种）

| 类目 | 英文 | 中文 | 马来文 |
|------|------|------|--------|
| 📱 手机壳 | Phone Case | 手机壳 | Kes Telefon |
| 🛡️ 手机膜 | Screen Protector | 手机膜 | Penapis Skrin |
| 🎧 蓝牙耳机 | Earbuds | 蓝牙耳机 | Earbud |
| 🎵 耳机壳 | Earbuds Case | 耳机壳 | Kes Earbud |
| 🔌 数据线 | Cable | 数据线 | Kabel |
| ⚡ 充电器 | Charger | 充电器 | Pengecas |
| 🔋 无线充电器 | Wireless Charger | 无线充电器 | Pengecas Tanpa Wayar |
| 🔋 充电宝 | Power Bank | 充电宝 | Power Bank |
| 🏟️ 手机支架 | Phone Holder | 手机支架 | Pemegang Telefon |
| 📊 手机支架 | Phone Stand | 手机支架 | Tudung Telefon |
| 🚗 车载支架 | Car Mount | 车载支架 | Pemegang Kereta |
| 💍 指环扣 | Phone Ring Holder | 手机指环扣 | Cincin Telefon |
| 🔗 手机挂绳 | Phone Lanyard | 手机挂绳 | Tali Telefon |
| 🌀 USB风扇 | USB Fan | USB风扇 | Kipas USB |
| 🎛️ USB扩展坞 | USB Hub | USB扩展坞 | USB Hub |
| ✏️ 触控笔 | Stylus Pen | 触控笔 | Pen Stylus |
| 👝 收纳袋 | Phone Pouch | 手机收纳袋 | Beg Telefon |
| 📟 平板保护套 | Tablet Case | 平板保护套 | Kes Tablet |
| ⌚ 智能手表 | Smart Watch | 智能手表 | Jam Pintar |
| 📱 智能手环 | Smart Band | 智能手环 | Gelang Pintar |
| 🧹 清洁套装 | Cleaning Kit | 清洁套装 | Kit Pembersihan |
| 📦 其他 | Other | 其他配件 | Aksesori Lain |

---

## 🐳 Docker 部署

```bash
# 构建并启动
docker compose up -d --build

# 查看日志
docker logs phone-accessories-studio --tail 50

# 重启
docker restart phone-accessories-studio
```

### 配置要点
- 端口映射：默认 `3011:3000`（可通过 `PORT` 环境变量调整）
- 数据持久化：`./data:/app/data`（SQLite 数据库）
- 网络模式：`web-network`（与 Nginx 等服务共享）
- 重启策略：`unless-stopped`

---

## 📜 License

MIT
