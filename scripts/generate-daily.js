const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const REPORTS_DIR = path.join(ROOT, "reports");
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

const POSITIVE_KEYWORDS = [
  "ai", "agent", "agents", "llm", "gpt", "claude", "openai", "gemini", "rag",
  "prompt", "workflow", "automation", "copilot", "coding", "code", "chatbot",
  "voice", "video", "image", "vision", "embedding", "inference", "model",
  "computer use", "mcp", "tool use", "browser", "assistant"
];

const PRODUCT_KEYWORDS = [
  "app", "agent", "assistant", "workflow", "automation", "tool", "desktop",
  "browser", "code", "ppt", "video", "voice", "knowledge", "search", "rag",
  "dashboard", "platform", "client", "ui", "studio"
];

const APPLICATION_KEYWORDS = [
  "image", "video", "audio", "voice", "photo", "music", "design", "ppt", "slides",
  "presentation", "office", "document", "docs", "pdf", "excel", "content",
  "creator", "creative", "poster", "avatar", "animation", "shorts", "edit",
  "editor", "studio", "canvas", "writing", "copywriting", "marketing", "social",
  "website", "landing page", "chatbot", "notion", "email",
  "generator", "generate", "caption", "subtitle", "transcription", "template",
  "mockup", "thumbnail", "meme", "story", "resume", "meeting"
];

const TECHNICAL_KEYWORDS = [
  "agent", "llm", "rag", "mcp", "workflow", "automation", "coding", "code",
  "developer", "inference", "embedding", "model", "framework", "sdk", "api"
];

const CORE_AI_KEYWORDS = [
  "ai", "agent", "agents", "llm", "gpt", "claude", "openai", "gemini", "rag",
  "prompt", "copilot", "chatbot", "embedding", "inference", "mcp", "computer use"
];

const NEGATIVE_KEYWORDS = [
  "awesome", "paper-list", "roadmap", "interview", "leetcode", "wallpaper",
  "theme", "dotfiles", "config", "crypto", "blockchain", "token", "nft"
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function formatShanghaiDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function dayLabel(dateText) {
  const date = new Date(`${dateText}T00:00:00+08:00`);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    weekday: "short"
  }).format(date);
}

async function fetchText(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "ai-playbook-daily",
      ...headers
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

async function fetchJson(url) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "ai-playbook-daily",
      ...headers
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function scrapeTrending() {
  const urls = [
    "https://github.com/trending?since=daily",
    "https://github.com/trending/javascript?since=daily",
    "https://github.com/trending/typescript?since=daily",
    "https://github.com/trending/python?since=daily"
  ];
  const repos = [];

  for (const url of urls) {
    try {
      const html = await fetchText(url);
      const blocks = html.split('<article class="Box-row"').slice(1);
      for (const block of blocks) {
        const href = block.match(/<h2[\s\S]*?<a[^>]+href="\/([^"\/]+\/[^"\/]+)"/);
        if (!href) continue;
        const name = decodeHtml(href[1]).replace(/\s/g, "");
        const desc = block.match(/<p class="col-9 color-fg-muted my-1 pr-4">([\s\S]*?)<\/p>/);
        const stars = block.match(/([\d,]+)\s+stars today/);
        repos.push({
          name,
          summary: desc ? decodeHtml(desc[1].replace(/<[^>]*>/g, "")) : "",
          starsToday: stars ? Number(stars[1].replace(/,/g, "")) : 0,
          source: "trending"
        });
      }
    } catch (error) {
      console.warn(`跳过 Trending 数据源：${error.message}`);
    }
  }

  return repos;
}

async function searchRepositories(since) {
  const queries = [
    `topic:ai pushed:>=${since} stars:>50`,
    `topic:llm pushed:>=${since} stars:>50`,
    `topic:agent pushed:>=${since} stars:>30`,
    `topic:rag pushed:>=${since} stars:>30`,
    `ai app in:name,description pushed:>=${since} stars:>50`,
    `ai image in:name,description pushed:>=${since} stars:>20`,
    `ai image generator in:name,description pushed:>=${since} stars:>10`,
    `ai video in:name,description pushed:>=${since} stars:>20`,
    `ai video generator in:name,description pushed:>=${since} stars:>10`,
    `ai ppt OR slides in:name,description pushed:>=${since} stars:>20`,
    `ai presentation in:name,description pushed:>=${since} stars:>10`,
    `ai design in:name,description pushed:>=${since} stars:>20`,
    `ai photo editor in:name,description pushed:>=${since} stars:>10`,
    `ai content in:name,description pushed:>=${since} stars:>20`,
    `ai writing in:name,description pushed:>=${since} stars:>10`,
    `ai subtitle in:name,description pushed:>=${since} stars:>10`,
    `ai voice in:name,description pushed:>=${since} stars:>10`,
    `ai website builder in:name,description pushed:>=${since} stars:>10`,
    `ai office in:name,description pushed:>=${since} stars:>20`,
    `ai tool in:name,description pushed:>=${since} stars:>30`,
    `llm agent in:name,description pushed:>=${since} stars:>30`,
    `ai workflow in:name,description pushed:>=${since} stars:>30`
  ];
  const repos = [];

  for (const query of queries) {
    try {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=20`;
      const result = await fetchJson(url);
      for (const repo of result.items || []) {
        repos.push({
          name: repo.full_name,
          summary: repo.description || "",
          starsToday: 0,
          source: "search"
        });
      }
    } catch (error) {
      console.warn(`跳过 Search 数据源：${error.message}`);
    }
  }

  return repos;
}

async function enrichRepo(candidate) {
  const detail = await fetchJson(`https://api.github.com/repos/${candidate.name}`);
  const topics = detail.topics || [];
  return {
    name: detail.full_name,
    url: detail.html_url,
    description: detail.description || candidate.summary || "",
    starsToday: candidate.starsToday || 0,
    starsTotal: detail.stargazers_count || 0,
    forks: detail.forks_count || 0,
    language: detail.language || "",
    topics,
    pushedAt: detail.pushed_at,
    source: candidate.source
  };
}

function scoreRepo(repo) {
  const text = `${repo.name} ${repo.description} ${repo.language} ${(repo.topics || []).join(" ")}`.toLowerCase();
  const positive = POSITIVE_KEYWORDS.filter((keyword) => hasKeyword(text, keyword)).length;
  const product = PRODUCT_KEYWORDS.filter((keyword) => hasKeyword(text, keyword)).length;
  const application = APPLICATION_KEYWORDS.filter((keyword) => hasKeyword(text, keyword)).length;
  const negative = NEGATIVE_KEYWORDS.filter((keyword) => hasKeyword(text, keyword)).length;
  const trendingBoost = repo.starsToday >= 50 ? 3 : repo.source === "trending" ? 1 : 0;
  return positive * 2 + product + application * 2 + trendingBoost - negative * 4;
}

function hasKeyword(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[\\s-]+");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}

function categoryFor(repo) {
  const text = `${repo.name} ${repo.description} ${(repo.topics || []).join(" ")}`.toLowerCase();
  if (/(ppt|slides|presentation|deck)/.test(text)) return "Presentation";
  if (/(design|poster|avatar|canvas|creative|creator|studio|website|landing page)/.test(text)) return "Creative";
  if (/(video|image|audio|voice|media|diffusion|vision)/.test(text)) return "Media";
  if (/(code|coding|developer|devtool|claude code|copilot|mcp)/.test(text)) return "AI Coding";
  if (/(rag|knowledge|search|graph|docs|database)/.test(text)) return "Knowledge";
  if (/(agent|workflow|automation|browser|computer use)/.test(text)) return "Agent";
  if (/(ppt|office|productivity|note|desktop)/.test(text)) return "Productivity";
  return "AI";
}

function isStrictAiApplication(repo) {
  const score = scoreRepo(repo);
  const text = `${repo.name} ${repo.description} ${(repo.topics || []).join(" ")}`.toLowerCase();
  const hasAiSignal = CORE_AI_KEYWORDS.some((keyword) => hasKeyword(text, keyword));
  const looksLikePureList = NEGATIVE_KEYWORDS.some((keyword) => hasKeyword(text, keyword));
  const hasProductSignal = PRODUCT_KEYWORDS.some((keyword) => hasKeyword(text, keyword));
  return score >= 4 && hasAiSignal && hasProductSignal && !looksLikePureList;
}

function isActualApplicationPlay(repo) {
  const text = `${repo.name} ${repo.description} ${(repo.topics || []).join(" ")}`.toLowerCase();
  const appishCategories = new Set(["Media", "Creative", "Presentation", "Productivity"]);
  const hasAiSignal = CORE_AI_KEYWORDS.some((keyword) => hasKeyword(text, keyword));
  const hasApplicationSignal = APPLICATION_KEYWORDS.some((keyword) => hasKeyword(text, keyword));
  const looksLikePureList = NEGATIVE_KEYWORDS.some((keyword) => hasKeyword(text, keyword));
  return hasAiSignal && hasApplicationSignal && appishCategories.has(categoryFor(repo)) && !looksLikePureList && scoreRepo(repo) >= 5;
}

function isTechnicalAiProject(repo) {
  const text = `${repo.name} ${repo.description} ${repo.language} ${(repo.topics || []).join(" ")}`.toLowerCase();
  const hasAiSignal = CORE_AI_KEYWORDS.some((keyword) => hasKeyword(text, keyword));
  const hasTechnicalSignal = TECHNICAL_KEYWORDS.some((keyword) => hasKeyword(text, keyword));
  const looksLikePureList = NEGATIVE_KEYWORDS.some((keyword) => hasKeyword(text, keyword));
  return hasAiSignal && hasTechnicalSignal && !looksLikePureList && scoreRepo(repo) >= 4;
}

function explain(repo) {
  const text = `${repo.name} ${repo.description} ${(repo.topics || []).join(" ")}`.toLowerCase();
  const summary = repo.description || "一个正在增长的 AI 相关开源项目。";

  if (/(code|coding|developer|claude code|copilot|mcp)/.test(text)) {
    return {
      problem: "AI 编程工具已经很多，但用户真正缺的是稳定流程、上下文组织和可复用的高质量操作方法。",
      play: "把 AI 嵌进编码、调试、工具调用或技能模板里，让它不只是回答问题，而是参与真实开发流程。",
      inspiration: "适合关注“AI 工作流模板化”和“开发者工具产品化”：把高手经验封装成普通人能直接使用的功能。"
    };
  }
  if (/(agent|workflow|automation|browser|computer use)/.test(text)) {
    return {
      problem: "很多任务不是问一句就结束，而是需要多步骤执行、观察结果、再继续调整。",
      play: "用 Agent、自动化流程或浏览器/桌面操作，把 AI 从对话变成能连续完成任务的执行者。",
      inspiration: "产品机会在任务编排、权限控制、过程可视化和结果验收，让用户放心把一段流程交给 AI。"
    };
  }
  if (/(rag|knowledge|search|graph|docs|database)/.test(text)) {
    return {
      problem: "用户资料越来越多，但 AI 如果拿不到结构化上下文，就很难给出可靠结果。",
      play: "围绕知识库、检索、图谱或文档理解，让 AI 先理解资料关系，再回答或生成。",
      inspiration: "谁能管理好用户上下文，谁就更容易做出高粘性的 AI 产品。"
    };
  }
  if (/(video|image|audio|voice|media|diffusion|vision)/.test(text)) {
    return {
      problem: "内容生产链路长，从素材、脚本到生成、编辑、交付都有大量重复劳动。",
      play: "把生成式 AI 放进图像、视频、语音或多媒体流水线里，减少创作和编辑成本。",
      inspiration: "内容类 AI 不只拼生成质量，更要拼端到端工作流和可交付结果。"
    };
  }
  return {
    problem: "用户不是缺一个新聊天框，而是缺能解决具体工作麻烦的 AI 能力。",
    play: "把模型能力包装进具体场景，让 AI 直接服务一个明确任务。",
    inspiration: "判断项目价值时，重点看它替谁省了哪一步，而不是只看用了什么模型。"
  };
}

function normalizeRepo(repo, rank) {
  const explanation = explain(repo);
  return {
    rank,
    name: repo.name,
    url: repo.url,
    starsToday: repo.starsToday || Math.max(1, Math.round(repo.starsTotal * 0.005)),
    starsTotal: repo.starsTotal,
    forks: repo.forks,
    category: categoryFor(repo),
    summary: repo.description || "一个正在增长的 AI 相关开源项目。",
    problem: explanation.problem,
    play: explanation.play,
    inspiration: explanation.inspiration,
    topics: repo.topics || [],
    pushedAt: repo.pushedAt
  };
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderTable(repos, mode) {
  const metric = mode === "growth" ? "今日新增" : "总 Stars";
  const rows = repos.map((repo, index) => `
          <tr>
            <td class="rank">${index + 1}</td>
            <td><a href="${repo.url}" target="_blank" rel="noreferrer">${escapeHtml(repo.name)}</a></td>
            <td class="metric">${mode === "growth" ? `+${repo.starsToday.toLocaleString("en-US")}` : repo.starsTotal.toLocaleString("en-US")}</td>
            <td><span class="tag">${escapeHtml(repo.category)}</span></td>
            <td class="summary">${escapeHtml(repo.summary)}</td>
            <td class="summary">${escapeHtml(productInspiration(repo))}</td>
          </tr>`).join("");
  return `<thead><tr><th>#</th><th>项目</th><th>${metric}</th><th>分类</th><th>它是做什么的</th><th>产品启发</th></tr></thead><tbody>${rows}</tbody>`;
}

function projectProblem(repo) {
  return repo.problem || repo.beginnerGuide || "这个项目试图把 AI 能力放进一个更具体的使用场景。";
}

function projectPlay(repo) {
  return repo.play || repo.whyItMatters || "它的看点在于把模型能力、工具调用或工作流组织成可复用的产品能力。";
}

function productInspiration(repo) {
  return repo.inspiration || repo.whyItMatters || "重点观察它替用户省掉了哪一步，以及这个流程能否被产品化。";
}

function renderHtml(dataset, currentDate, isReport = false) {
  const repos = dataset.aiProjects || dataset.fastestGrowth;
  const playbooks = dataset.applicationPlaybooks || dataset.mostStarred || [];
  const prefix = isReport ? ".." : ".";
  const nav = isReport
    ? `<a class="nav-link" href="../index.html">返回最新日报</a><a class="nav-link" href="../archive.html">查看历史归档</a><a class="nav-link" href="../data/${currentDate}.json">查看当天原始数据</a>`
    : `<a class="nav-link" href="./archive.html">查看历史归档</a><a class="nav-link" href="./data/${currentDate}.json">查看今日原始数据</a>`;
  const projectCards = [...repos, ...playbooks.filter((repo) => !repos.some((item) => item.name === repo.name))].map((repo) => `
          <article class="project-card">
            <h3><a href="${repo.url}" target="_blank" rel="noreferrer">${escapeHtml(repo.name)}</a></h3>
            <span class="tag">${escapeHtml(repo.category)}</span>
            <p><strong>它是做什么的：</strong>${escapeHtml(repo.summary)}</p>
            <p><strong>解决什么问题：</strong>${escapeHtml(projectProblem(repo))}</p>
            <p><strong>AI 玩法：</strong>${escapeHtml(projectPlay(repo))}</p>
            <p><strong>产品启发：</strong>${escapeHtml(productInspiration(repo))}</p>
          </article>`).join("");

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Cache-Control" content="no-store" />
    <title>AI 产品灵感日报</title>
    <style>
      :root { --bg:#f7f7f4; --paper:#fff; --ink:#18221d; --muted:#65716b; --line:#dfe4df; --green:#0f7a55; --green-soft:#e8f4ee; --amber-soft:#fff3df; }
      *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--ink);font-family:"Segoe UI","Microsoft YaHei",Arial,sans-serif;line-height:1.65}.page{width:min(1080px,calc(100% - 32px));margin:0 auto;padding:28px 0 56px}header{padding:28px 0 22px;border-bottom:3px solid var(--ink)}.eyebrow{color:var(--green);font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}h1{margin:8px 0 10px;font-size:42px;line-height:1.15}.intro{max-width:860px;margin:0;color:var(--muted);font-size:17px}.meta,.top-nav{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}.top-nav{margin-top:14px}.pill,.nav-link{display:inline-flex;align-items:center;border:1px solid var(--line);background:var(--paper);border-radius:999px;padding:7px 11px;color:var(--muted);font-size:13px;font-weight:700}.nav-link{color:var(--green)}main{display:grid;gap:34px;margin-top:28px}section{background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:22px}.plain-section{background:transparent;border:0;border-radius:0;padding:0}.section-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:16px}h2{margin:0;font-size:26px}.note{margin:0;max-width:44ch;color:var(--muted);text-align:right}table{width:100%;border-collapse:collapse}th,td{padding:12px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{color:var(--muted);font-size:13px;white-space:nowrap}tr:last-child td{border-bottom:0}.rank{width:44px;color:var(--green);font-weight:800}a{color:var(--green);font-weight:800;text-decoration:none}a:hover{text-decoration:underline}.metric{white-space:nowrap;font-weight:800}.summary{color:var(--muted)}.tag{display:inline-flex;border-radius:999px;padding:4px 8px;background:var(--green-soft);color:var(--green);font-size:12px;font-weight:800}.signals{display:grid;gap:12px;margin:0;padding:0;list-style:none}.signals li{border-left:4px solid var(--green);background:var(--paper);border-radius:6px;padding:14px 16px}.signals strong{display:block;margin-bottom:4px}.project-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.project-card{border:1px solid var(--line);border-radius:8px;padding:16px;background:var(--paper)}.project-card h3{margin:0 0 8px;font-size:18px}.project-card p{margin:8px 0;color:var(--muted)}.callout{background:var(--amber-soft);border-color:#f1d7aa}@media(max-width:780px){.section-head{align-items:start;flex-direction:column}.note{text-align:left}.table-wrap{overflow-x:auto}table{min-width:860px}.project-grid{grid-template-columns:1fr}}
    </style>
  </head>
  <body>
    <div class="page">
      <header>
        <div class="eyebrow">AI Product Radar</div>
        <h1>AI 产品灵感日报</h1>
        <p class="intro">帮你从 GitHub 上的 AI 项目里提炼产品灵感。每天固定 10 条，重点回答：大神们在用 AI 解决什么问题，具体怎么玩，以及这些项目能给 AI 产品设计带来什么启发。</p>
        <div class="meta"><span class="pill">更新时间：${dataset.meta.lastUpdated}</span><span class="pill">主题：AI 产品灵感</span><span class="pill">AI 项目：${repos.length} 条</span><span class="pill">应用玩法：${playbooks.length} 条</span></div>
        <nav class="top-nav" aria-label="页面导航">${nav}</nav>
      </header>
      <main>
        <section class="callout"><div class="section-head"><h2>今天先看什么</h2><p class="note">先看 AI 项目榜判断风向，再看应用玩法榜找产品灵感。</p></div><p>${escapeHtml(dataset.overview.themeNote)}</p></section>
        <section><div class="section-head"><h2>24 小时星数最高的 AI 项目</h2><p class="note">偏技术、工具、Agent、工作流和基础能力，帮你看 GitHub 大神们在搭什么。</p></div><div class="table-wrap"><table>${renderTable(repos, "growth")}</table></div></section>
        <section><div class="section-head"><h2>24 小时星数最高的实际应用玩法</h2><p class="note">偏图片、视频、PPT、设计、内容生产、办公工具和可直接上手的 AI 用法。</p></div><div class="table-wrap"><table>${renderTable(playbooks, "growth")}</table></div></section>
        <section class="plain-section"><div class="section-head"><h2>今天的产品信号</h2><p class="note">产品经理视角的结论，不需要逐个仓库深挖也能看懂趋势。</p></div><ul class="signals">${dataset.signals.map((signal) => `<li><strong>${escapeHtml(signal.title)}</strong>${escapeHtml(signal.description)}</li>`).join("")}</ul></section>
        <section><div class="section-head"><h2>项目详情与产品启发</h2><p class="note">合并两张榜单并去重，先看它是做什么的，再看解决的问题、AI 用法和可借鉴点。</p></div><div class="project-grid">${projectCards}</div></section>
      </main>
    </div>
  </body>
</html>
`;
}

function renderArchive(dates) {
  const cards = dates.map((entry) => `
        <article class="archive-card">
          <div class="archive-top">
            <div>
              <div class="date">${entry.value} ${entry.weekday}</div>
              <p class="summary">${escapeHtml(entry.summary)}</p>
            </div>
            <span class="pill">${entry.count} 条</span>
          </div>
          <div class="links">
            <a href="./reports/${entry.value}.html">打开当天报告</a>
            <a href="./data/${entry.value}.json">查看原始 JSON</a>
          </div>
        </article>`).join("");

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Cache-Control" content="no-store" />
    <title>AI 产品灵感日报归档</title>
    <style>
      :root { --bg:#f7f7f4; --paper:#fff; --ink:#18221d; --muted:#65716b; --line:#dfe4df; --green:#0f7a55; --amber-soft:#fff3df; }
      *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--ink);font-family:"Segoe UI","Microsoft YaHei",Arial,sans-serif;line-height:1.7}.page{width:min(960px,calc(100% - 32px));margin:0 auto;padding:32px 0 56px}header{padding:28px 0 22px;border-bottom:3px solid var(--ink)}.eyebrow{color:var(--green);font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}h1{margin:8px 0 10px;font-size:42px;line-height:1.15}.intro{max-width:760px;margin:0;color:var(--muted);font-size:17px}.nav{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}.nav a,.pill{display:inline-flex;align-items:center;border:1px solid var(--line);background:var(--paper);border-radius:999px;padding:7px 11px;color:var(--green);font-size:13px;font-weight:800;text-decoration:none}.archive-list{display:grid;gap:16px;margin-top:28px}.archive-card{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:20px}.archive-top{display:flex;justify-content:space-between;gap:16px;align-items:start}.date{font-size:26px;font-weight:900}.summary{margin:8px 0 0;color:var(--muted)}.links{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}.links a{color:var(--green);font-weight:800;text-decoration:none}.links a:hover{text-decoration:underline}@media(max-width:720px){.archive-top{display:block}.date{font-size:23px}}
    </style>
  </head>
  <body>
    <div class="page">
      <header>
        <div class="eyebrow">Archive</div>
        <h1>历史日报归档</h1>
        <p class="intro">这里保存每天的 AI 产品灵感日报。首页只展示最新一期，历史报告和原始数据都放在这里，方便你回看趋势、复盘项目、积累自己的 AI 产品灵感库。</p>
        <nav class="nav" aria-label="页面导航"><a href="./index.html">返回最新日报</a><span class="pill">归档不覆盖历史</span></nav>
      </header>
      <main class="archive-list">${cards}</main>
    </div>
  </body>
</html>
`;
}

function writeArchiveIndexAndPage(defaultDate) {
  const dateEntries = fs.readdirSync(DATA_DIR)
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .map((name) => name.replace(".json", ""))
    .sort()
    .reverse()
    .map((date) => {
      const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${date}.json`), "utf8"));
      return {
        value: date,
        weekday: dayLabel(date),
        count: data.fastestGrowth?.length || 0,
        summary: data.overview?.themeNote || data.overview?.theme || "AI 产品灵感日报"
      };
    });

  fs.writeFileSync(path.join(ROOT, "archive.html"), renderArchive(dateEntries), "utf8");
  fs.writeFileSync(path.join(DATA_DIR, "archive-index.json"), `${JSON.stringify({
    defaultDate,
    dates: dateEntries.map((entry) => ({ value: entry.value, label: `${entry.value} ${entry.weekday}` }))
  }, null, 2)}\n`, "utf8");
}

function renderExisting(date) {
  ensureDir(DATA_DIR);
  ensureDir(REPORTS_DIR);
  const dataPath = path.join(DATA_DIR, `${date}.json`);
  const dataset = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  fs.writeFileSync(path.join(ROOT, "index.html"), renderHtml(dataset, date, false), "utf8");
  fs.writeFileSync(path.join(REPORTS_DIR, `${date}.html`), renderHtml(dataset, date, true), "utf8");
  writeArchiveIndexAndPage(date);
  console.log(`根据已有数据重新渲染完成：${date}`);
}

function buildSignals(repos) {
  const topCategories = [...new Set(repos.slice(0, 5).map((repo) => repo.category))].join("、");
  return [
    {
      title: "今天的 AI 热度集中在具体场景，而不是泛模型概念",
      description: `增长靠前的项目主要落在 ${topCategories || "AI 应用"}，说明用户更关心 AI 能不能进入真实工作流。`
    },
    {
      title: "值得看的项目通常能说清楚替用户省了哪一步",
      description: "如果一个项目只是技术展示但没有明确任务，本日报会尽量过滤；留下来的项目更偏可学习、可借鉴的产品玩法。"
    },
    {
      title: "产品灵感优先看交付结果和使用门槛",
      description: "同样是 AI 项目，能直接生成可用结果、接入现有工具或降低使用成本的项目，更可能变成真实产品机会。"
    }
  ];
}

async function main() {
  ensureDir(DATA_DIR);
  ensureDir(REPORTS_DIR);

  const today = formatShanghaiDate();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const candidates = [...await scrapeTrending(), ...await searchRepositories(since)];
  const unique = new Map();
  for (const candidate of candidates) {
    if (!unique.has(candidate.name)) unique.set(candidate.name, candidate);
  }

  const enriched = [];
  for (const candidate of unique.values()) {
    try {
      const repo = await enrichRepo(candidate);
      if (isStrictAiApplication(repo)) enriched.push(repo);
    } catch (error) {
      console.warn(`跳过 ${candidate.name}：${error.message}`);
    }
    if (enriched.length >= 30) break;
  }

  const aiProjects = enriched
    .filter(isTechnicalAiProject)
    .sort((a, b) => (b.starsToday - a.starsToday) || (b.starsTotal - a.starsTotal))
    .slice(0, 10)
    .map((repo, index) => normalizeRepo(repo, index + 1));

  const aiProjectNames = new Set(aiProjects.map((repo) => repo.name));
  const applicationPlaybooks = enriched
    .filter(isActualApplicationPlay)
    .filter((repo) => !aiProjectNames.has(repo.name))
    .sort((a, b) => (b.starsToday - a.starsToday) || (b.starsTotal - a.starsTotal))
    .slice(0, 10)
    .map((repo, index) => normalizeRepo(repo, index + 1));

  if (aiProjects.length < 5 || applicationPlaybooks.length < 3) {
    throw new Error(`严格筛选后 AI 项目 ${aiProjects.length} 个、应用玩法 ${applicationPlaybooks.length} 个，低于最低质量线，停止更新以免生成低质量日报。`);
  }

  const dataset = {
    meta: {
      lastUpdated: `${today} 08:00`,
      nextUpdate: "每天 08:00",
      source: "GitHub Trending + GitHub Search API",
      selectionRule: "每天分成两张榜：10 条 24 小时星数最高的 AI 项目，10 条 24 小时星数最高的实际应用玩法。应用玩法优先图片、视频、PPT、设计、内容生产、办公工具和可直接上手的 AI 用法。"
    },
    overview: {
      observedDate: today.slice(5).replace("-", "/"),
      theme: "AI 项目 + 实际应用玩法",
      themeNote: `今天分成两张榜：${aiProjects.length} 条 AI 项目用来看技术风向，${applicationPlaybooks.length} 条实际应用玩法用来看图片、视频、PPT、内容生产和工具类灵感。`,
      scope: "每天两张榜各最多 10 条，宁缺毋滥。",
      note: "先看 AI 项目榜前 3，再看应用玩法榜前 3。"
    },
    aiProjects,
    applicationPlaybooks,
    fastestGrowth: aiProjects,
    mostStarred: applicationPlaybooks,
    signals: buildSignals([...aiProjects, ...applicationPlaybooks])
  };

  const dataPath = path.join(DATA_DIR, `${today}.json`);
  const reportPath = path.join(REPORTS_DIR, `${today}.html`);
  fs.writeFileSync(dataPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(ROOT, "index.html"), renderHtml(dataset, today, false), "utf8");
  fs.writeFileSync(reportPath, renderHtml(dataset, today, true), "utf8");

  writeArchiveIndexAndPage(today);

  console.log(`生成完成：${today}，项目数：${selected.length}`);
}

const renderExistingIndex = process.argv.indexOf("--render-existing");
const runner = renderExistingIndex >= 0
  ? Promise.resolve().then(() => renderExisting(process.argv[renderExistingIndex + 1] || formatShanghaiDate()))
  : main();

runner.catch((error) => {
  console.error(error);
  process.exit(1);
});
