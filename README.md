# AI 应用玩法日报

一个更适合每天阅读的 AI 趋势简报页，重点不是泛技术热榜，而是：

- 过去 24 小时增长最快的 AI 实际应用和玩法
- 这批项目里总星数最高、采用度更强的项目
- 每天固定 10 条
- 每个项目都带 GitHub 直达链接
- 用更适合小白的方式解释“它在做什么、为什么值得看”

## 当前结构

- `index.html`
  最新日报入口，永远展示最近一次更新的 10 条项目
- `archive.html`
  历史日报入口，用来按日期回看
- `reports/YYYY-MM-DD.html`
  每天归档一份 HTML 报告，不覆盖历史
- `data/YYYY-MM-DD.json`
  每天保存原始结构化数据，方便后续搜索、筛选和趋势分析
- `styles.css`
  旧版动态页面样式，先保留
- `app.js`
  旧版动态页面渲染逻辑，先保留
- `data/archive-index.json`
  旧版动态页面日期和分类索引，先保留
- `data/archive/YYYY-MM-DD.json`
  旧版动态页面每日榜单数据，先保留
- `data/bootstrap.js`
  本地 `file://` 打开时的兜底数据

## 每天更新时怎么写

1. 生成当天结构化数据：`data/YYYY-MM-DD.json`
2. 生成当天 HTML 归档：`reports/YYYY-MM-DD.html`
3. 更新首页：`index.html` 展示最新一天
4. 更新归档入口：`archive.html` 增加当天链接

这样明天更新时，今天的报告不会被覆盖，只会成为历史归档的一条。

## 自动化更新

### 当前已启用：Vercel 线上自动更新

已经新增 Vercel Cron 配置：`vercel.json`

- 线上首页：`https://ai-playbook-daily.vercel.app`
- 自动接口：`/api/daily`
- 运行时间：每天 UTC 00:00，也就是北京时间 08:00
- 作用：Vercel 每天自动请求 `/api/daily`，让最新 AI 项目数据在云端更新缓存
- 好处：不需要本地电脑开机

注意：Vercel 函数本身不能永久改写已经部署好的静态文件，所以这套方式负责“最新日报自动更新”。如果要每天永久新增 `reports/YYYY-MM-DD.html` 和 `data/YYYY-MM-DD.json`，仍然需要 GitHub Actions 或数据库作为持久化存储。

### 完整归档方案：GitHub Actions

已经内置 GitHub Actions 定时任务：`.github/workflows/daily.yml`

- 运行时间：每天 UTC 00:00，也就是北京时间 08:00
- 执行命令：`node scripts/generate-daily.js`
- 更新内容：`index.html`、`archive.html`、`data/YYYY-MM-DD.json`、`reports/YYYY-MM-DD.html`
- 提交方式：自动提交到 GitHub 仓库

生成脚本在 `scripts/generate-daily.js`。它会从 GitHub Trending 和 GitHub Search API 抓取候选项目，并用更严格的规则只保留 AI 实际应用、Agent、工作流、内容生产、AI Coding、知识库等方向；如果严格筛选后项目少于 5 个，会直接停止，避免生成低质量日报。

如果要让 GitHub Actions 更新后自动部署到 Vercel，需要在 GitHub 仓库的 `Settings -> Secrets and variables -> Actions` 里配置：

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

当前 Vercel 项目信息：

- `VERCEL_ORG_ID`: `team_yhUllWYERcmgtlK2YHir4EUd`
- `VERCEL_PROJECT_ID`: `prj_tWeEAqNLzSLoLMycJFgh2h5lK5I0`

`VERCEL_TOKEN` 需要在 Vercel 账号里创建，不要写进代码仓库。

本地手动测试：

- `npm run generate`
- `node scripts/generate-daily.js --render-existing 2026-04-27`

## 使用方式

直接打开 `index.html` 即可。

如果后续你想把它发布到 GitHub Pages，或挂到自己的服务器，这套结构也可以直接用。

## 后续建议

1. 每天 08:00 自动生成新的 `data/archive/YYYY-MM-DD.json`
2. 在页面里增加“今天比昨天多了什么新玩法”
3. 增加“我建议你先点开的 3 个项目”
4. 后续把数据源接成 GitHub + OSSInsight 的自动抓取脚本
