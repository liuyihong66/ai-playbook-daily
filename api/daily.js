const TRENDING_URLS = [
  "https://github.com/trending?since=daily",
  "https://github.com/trending/javascript?since=daily",
  "https://github.com/trending/typescript?since=daily",
  "https://github.com/trending/python?since=daily"
];

const CORE_AI = [
  "ai", "agent", "llm", "gpt", "claude", "openai", "gemini", "rag", "prompt",
  "copilot", "chatbot", "embedding", "inference", "mcp", "computer use"
];

const PRODUCT = [
  "app", "agent", "assistant", "workflow", "automation", "tool", "desktop",
  "browser", "code", "ppt", "video", "voice", "knowledge", "search", "rag",
  "dashboard", "platform", "client", "ui", "studio"
];

const APPLICATION = [
  "image", "video", "audio", "voice", "photo", "music", "design", "ppt", "slides",
  "presentation", "office", "document", "docs", "pdf", "excel", "content",
  "creator", "creative", "poster", "avatar", "animation", "shorts", "edit",
  "editor", "studio", "canvas", "writing", "copywriting", "marketing", "social",
  "website", "landing page", "chatbot", "assistant", "email"
];

const TECHNICAL = [
  "agent", "llm", "rag", "mcp", "workflow", "automation", "coding", "code",
  "developer", "inference", "embedding", "model", "framework", "sdk", "api"
];

const NEGATIVE = [
  "awesome", "paper-list", "roadmap", "interview", "leetcode", "wallpaper",
  "theme", "dotfiles", "config", "crypto", "blockchain", "token", "nft"
];

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

function hasKeyword(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[\\s-]+");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}

function parseNumber(value = "0") {
  return Number(value.replace(/[^\d]/g, "")) || 0;
}

async function fetchTrending(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "ai-playbook-daily" }
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const html = await response.text();
  return html.split('<article class="Box-row"').slice(1).map((block) => {
    const href = block.match(/<h2[\s\S]*?<a[^>]+href="\/([^"\/]+\/[^"\/]+)"/);
    if (!href) return null;
    const description = block.match(/<p class="col-9 color-fg-muted my-1 pr-4">([\s\S]*?)<\/p>/);
    const starsToday = block.match(/([\d,]+)\s+stars today/);
    const numberLinks = [...block.matchAll(/<a[\s\S]*?Link--muted[\s\S]*?>\s*([\d,]+)\s*<\/a>/g)].map((match) => parseNumber(match[1]));
    return {
      name: decodeHtml(href[1]).replace(/\s/g, ""),
      url: `https://github.com/${decodeHtml(href[1]).replace(/\s/g, "")}`,
      summary: description ? decodeHtml(description[1].replace(/<[^>]*>/g, "")) : "一个正在增长的 AI 相关开源项目。",
      starsToday: starsToday ? parseNumber(starsToday[1]) : 0,
      starsTotal: numberLinks[0] || 0,
      forks: numberLinks[1] || 0
    };
  }).filter(Boolean);
}

async function fetchSearchRepos(query) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=20`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "ai-playbook-daily"
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const result = await response.json();
  return (result.items || []).map((repo) => ({
    name: repo.full_name,
    url: repo.html_url,
    summary: repo.description || "一个正在增长的 AI 相关开源项目。",
    starsToday: 0,
    starsTotal: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    topics: repo.topics || []
  }));
}

function categoryFor(repo) {
  const text = `${repo.name} ${repo.summary}`.toLowerCase();
  if (/(ppt|slides|presentation|deck)/.test(text)) return "Presentation";
  if (/(design|poster|avatar|canvas|creative|creator|studio|website|landing page)/.test(text)) return "Creative";
  if (/(video|image|audio|voice|media|diffusion|vision)/.test(text)) return "Media";
  if (/(code|coding|developer|devtool|claude code|copilot|mcp)/.test(text)) return "AI Coding";
  if (/(rag|knowledge|search|graph|docs|database)/.test(text)) return "Knowledge";
  if (/(agent|workflow|automation|browser|computer use)/.test(text)) return "Agent";
  if (/(ppt|office|productivity|note|desktop)/.test(text)) return "Productivity";
  return "AI";
}

function isUsefulAiProject(repo) {
  const text = `${repo.name} ${repo.summary}`.toLowerCase();
  const hasAi = CORE_AI.some((keyword) => hasKeyword(text, keyword));
  const hasProduct = PRODUCT.some((keyword) => hasKeyword(text, keyword));
  const bad = NEGATIVE.some((keyword) => hasKeyword(text, keyword));
  return hasAi && hasProduct && !bad;
}

function isTechnicalAiProject(repo) {
  const text = `${repo.name} ${repo.summary}`.toLowerCase();
  const hasAi = CORE_AI.some((keyword) => hasKeyword(text, keyword));
  const hasTechnical = TECHNICAL.some((keyword) => hasKeyword(text, keyword));
  const bad = NEGATIVE.some((keyword) => hasKeyword(text, keyword));
  return hasAi && hasTechnical && !bad;
}

function isApplicationPlaybook(repo) {
  const text = `${repo.name} ${repo.summary}`.toLowerCase();
  const hasAi = CORE_AI.some((keyword) => hasKeyword(text, keyword));
  const hasApplication = APPLICATION.some((keyword) => hasKeyword(text, keyword));
  const bad = NEGATIVE.some((keyword) => hasKeyword(text, keyword));
  return hasAi && hasApplication && !bad;
}

function explain(repo) {
  const text = `${repo.name} ${repo.summary}`.toLowerCase();
  if (/(code|coding|developer|claude code|copilot|mcp)/.test(text)) {
    return {
      problem: "AI 编程工具很多，但普通用户缺少稳定流程、上下文组织和可复用方法。",
      play: "把 AI 放进编码、调试、工具调用或技能模板里，参与真实开发流程。",
      inspiration: "可以学习如何把高手经验封装成普通人可直接使用的 AI 工作流。"
    };
  }
  if (/(agent|workflow|automation|browser|computer use)/.test(text)) {
    return {
      problem: "很多任务需要多步骤执行，而不是问一句就结束。",
      play: "用 Agent 或自动化流程，让 AI 从对话者变成执行者。",
      inspiration: "产品机会在任务编排、过程可视化、权限控制和结果验收。"
    };
  }
  if (/(rag|knowledge|search|graph|docs|database)/.test(text)) {
    return {
      problem: "资料越来越多，AI 没有好上下文就很难给出可靠答案。",
      play: "用知识库、检索、图谱或文档理解，让 AI 先理解资料再输出。",
      inspiration: "谁能管理好用户上下文，谁就更容易做出高粘性的 AI 产品。"
    };
  }
  if (/(video|image|audio|voice|media|diffusion|vision)/.test(text)) {
    return {
      problem: "内容生产链路长，素材、脚本、生成、编辑和交付都费时间。",
      play: "把生成式 AI 放进多媒体生产流水线，减少创作成本。",
      inspiration: "内容类 AI 不只拼生成质量，更要拼端到端工作流。"
    };
  }
  return {
    problem: "用户不是缺一个新聊天框，而是缺能解决具体麻烦的 AI 能力。",
    play: "把模型能力包装进具体场景，让 AI 服务一个明确任务。",
    inspiration: "重点看它替谁省了哪一步，以及这个流程能否被产品化。"
  };
}

function todayShanghai() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export default async function handler(_request, response) {
  try {
    const all = [];
    for (const url of TRENDING_URLS) {
      try {
        all.push(...await fetchTrending(url));
      } catch (error) {
        console.warn(error.message);
      }
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const searchQueries = [
      `topic:ai pushed:>=${since} stars:>50`,
      `topic:agent pushed:>=${since} stars:>30`,
      `ai workflow in:name,description pushed:>=${since} stars:>30`,
      `ai image in:name,description pushed:>=${since} stars:>20`,
      `ai video in:name,description pushed:>=${since} stars:>20`,
      `ai ppt OR slides in:name,description pushed:>=${since} stars:>20`,
      `ai design in:name,description pushed:>=${since} stars:>20`,
      `ai content in:name,description pushed:>=${since} stars:>20`,
      `ai office in:name,description pushed:>=${since} stars:>20`,
      `ai tool in:name,description pushed:>=${since} stars:>20`
    ];
    for (const query of searchQueries) {
      try {
        all.push(...await fetchSearchRepos(query));
      } catch (error) {
        console.warn(error.message);
      }
    }
    const unique = [...new Map(all.map((repo) => [repo.name, repo])).values()];
    const filtered = unique
      .filter(isUsefulAiProject)
      .map((repo) => ({
        ...repo,
        category: categoryFor(repo),
        ...explain(repo)
      }));

    let repos = [...filtered]
      .filter(isTechnicalAiProject)
      .sort((a, b) => (b.starsToday - a.starsToday) || (b.starsTotal - a.starsTotal))
      .slice(0, 10)
      .map((repo, index) => ({
        rank: index + 1,
        ...repo
      }));
    if (repos.length < 10) {
      const picked = new Set(repos.map((repo) => repo.name));
      repos = [
        ...repos,
        ...filtered
          .filter((repo) => !picked.has(repo.name))
          .sort((a, b) => (b.starsToday - a.starsToday) || (b.starsTotal - a.starsTotal))
          .slice(0, 10 - repos.length)
          .map((repo, index) => ({ rank: repos.length + index + 1, ...repo }))
      ];
    }
    const growthNames = new Set(repos.map((repo) => repo.name));
    let applicationPlaybooks = filtered
      .filter(isApplicationPlaybook)
      .filter((repo) => !growthNames.has(repo.name))
      .sort((a, b) => (b.starsToday - a.starsToday) || (b.starsTotal - a.starsTotal))
      .slice(0, 10)
      .map((repo, index) => ({
        rank: index + 1,
        ...repo
      }));
    if (applicationPlaybooks.length < 10) {
      const picked = new Set([...growthNames, ...applicationPlaybooks.map((repo) => repo.name)]);
      applicationPlaybooks = [
        ...applicationPlaybooks,
        ...filtered
          .filter((repo) => !picked.has(repo.name))
          .sort((a, b) => (b.starsToday - a.starsToday) || (b.starsTotal - a.starsTotal))
          .slice(0, 10 - applicationPlaybooks.length)
          .map((repo, index) => ({ rank: applicationPlaybooks.length + index + 1, ...repo }))
      ];
    }

    const date = todayShanghai();
    response.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=3600");
    response.status(200).json({
      meta: {
        lastUpdated: `${date} 08:00`,
        source: "Vercel Cron + GitHub Trending",
        count: repos.length + applicationPlaybooks.length,
        note: "线上自动更新版：每天北京时间 08:00 由 Vercel Cron 预热；分成 AI 项目榜和实际应用玩法榜。"
      },
      repos,
      aiProjects: repos,
      applicationPlaybooks,
      mostStarred: applicationPlaybooks,
      signals: [
        "今天分两条线看：AI 项目榜看技术风向，应用玩法榜看图片、视频、PPT、内容生产和工具灵感。",
        "判断产品机会：它是否替用户省掉一个真实、重复、费时间的步骤。",
        "应用玩法榜优先保留能直接产出结果或嵌入已有工作流的项目。"
      ]
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
}
