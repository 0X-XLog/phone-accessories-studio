# TikTok OAuth 回调转接站（部署到 Vercel）

单个 serverless 函数，把 TikTok 授权码签名转发给阿里云主应用，自己不做任何 token 处理。

## 部署步骤

1. 注册/登录 [vercel.com](https://vercel.com)（可用 GitHub 账号）
2. Add New → Project → 把 `vercel-tt-callback` 这个文件夹上传（或推到 GitHub 后导入）
3. 项目 Settings → Environment Variables 添加两个：
   - `INTERNAL_SECRET` = 主应用 `.env` 里的 `INTERNAL_SECRET` 值
   - `ECS_BASE_URL` = `http://你的阿里云IP:3001`
4. 部署完成后 → 项目 Settings → Domains → 添加 `tt.你的域名`
5. **以 Vercel Domains 页面显示的记录为准**，去你的域名 DNS 后台添加对应的 CNAME（不要凭记忆填 cname.vercel-dns.com，Vercel 可能给项目专属的值）
6. 等 DNS 生效、Vercel 显示证书签发成功

## 验证

浏览器打开 `https://tt.你的域名/api/callback`（不带参数）→ 应显示"参数缺失"页面 = 部署成功。
