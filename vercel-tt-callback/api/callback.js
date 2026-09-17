// TikTok OAuth relay — deploy this folder to Vercel as its own project.
// Responsibilities (deliberately minimal, no secrets beyond INTERNAL_SECRET):
//   1. Receive ?code & ?state from TikTok after seller authorization
//   2. Forward them (HMAC-signed) to the ECS internal endpoint
//   3. Show the user a success/failure page
// The ECS side does the code→token exchange itself, so no token ever
// travels over this (HTTP) leg, and the app secret lives only on the ECS.
const crypto = require('crypto');

module.exports = async (req, res) => {
  const { code, state, error } = req.query;

  const page = (title, detail, ok) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(ok ? 200 : 400).send(`<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5}
.card{background:#fff;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,.08);padding:40px;max-width:420px;text-align:center}
h1{font-size:20px;margin:0 0 12px}p{color:#666;font-size:14px;line-height:1.6;word-break:break-all}
.ok{color:#16a34a}.bad{color:#dc2626}</style></head>
<body><div class="card"><h1 class="${ok ? 'ok' : 'bad'}">${title}</h1><p>${detail}</p></div></body></html>`);
  };

  if (error) return page('授权未完成', `TikTok 返回: ${error}`, false);
  if (!code || !state) return page('参数缺失', '缺少 code 或 state，请从应用里重新发起授权', false);

  const secret = process.env.INTERNAL_SECRET;
  const ecsBase = process.env.ECS_BASE_URL; // e.g. http://1.2.3.4:3001
  if (!secret || !ecsBase) return page('配置缺失', 'Vercel 环境变量 INTERNAL_SECRET / ECS_BASE_URL 未设置', false);

  try {
    const timestamp = Date.now().toString();
    const body = JSON.stringify({ auth_code: code, state });
    const signature = crypto.createHmac('sha256', secret).update(`${timestamp}\n${body}`).digest('hex');

    const r = await fetch(`${ecsBase}/api/tiktok/token-callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-timestamp': timestamp, 'x-signature': signature },
      body,
    });
    const data = await r.json().catch(() => ({}));

    if (r.ok && data.ok) {
      const shop = data.shop ? `${data.shop.shop_name || data.shop.shop_id || ''} (${data.shop.site || ''})` : '';
      return page('✅ 授权成功', `店铺: ${shop}<br>可以关闭此页面，回到应用查看授权状态`, true);
    }
    return page('❌ 授权失败', `应用返回: ${data.error || r.status}`, false);
  } catch (e) {
    return page('❌ 转发失败', String(e.message || e).slice(0, 200), false);
  }
};
