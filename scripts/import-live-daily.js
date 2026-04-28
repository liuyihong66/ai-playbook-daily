const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");

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

async function readSource(source) {
  if (source.startsWith("http://") || source.startsWith("https://")) {
    const response = await fetch(source, {
      headers: { "User-Agent": "ai-playbook-daily-importer" }
    });
    if (!response.ok) throw new Error(`${response.status} ${source}`);
    return response.json();
  }

  return JSON.parse(fs.readFileSync(path.resolve(ROOT, source), "utf8").replace(/^\uFEFF/, ""));
}

function normalizeSignals(signals = []) {
  if (signals.length && typeof signals[0] === "object" && signals[0].title) {
    return signals;
  }

  const titles = ["今天最值得注意的趋势", "可以借鉴的产品机会", "建议长期观察的方向"];
  return signals.map((signal, index) => ({
    title: titles[index] || "值得继续观察的信号",
    description: String(signal)
  }));
}

async function main() {
  const source = process.argv[2] || "https://ai-playbook-daily.vercel.app/api/daily";
  const raw = await readSource(source);
  const date = (raw.meta?.lastUpdated || "").slice(0, 10) || formatShanghaiDate();
  const aiProjects = raw.aiProjects || raw.repos || [];
  const applicationPlaybooks = raw.applicationPlaybooks || raw.mostStarred || [];

  const dataset = {
    meta: {
      lastUpdated: raw.meta?.lastUpdated || `${date} 08:00`,
      nextUpdate: "每天 08:00",
      source: raw.meta?.source || "Vercel Cron + GitHub Trending",
      selectionRule: "每天分成两张榜：10 条 24 小时星数最高的 AI 项目，10 条 24 小时星数最高的实际应用玩法。"
    },
    overview: {
      observedDate: date.slice(5).replace("-", "/"),
      theme: "AI 项目 + 实际应用玩法",
      themeNote: "今天分成两张榜：AI 项目榜用来看技术风向，实际应用玩法榜用来看图片、视频、PPT、内容生产和工具类灵感。",
      scope: "每天两张榜各最多 10 条，宁缺毋滥。",
      note: "先看 AI 项目榜前 3，再看应用玩法榜前 3。"
    },
    aiProjects,
    applicationPlaybooks,
    fastestGrowth: aiProjects,
    mostStarred: applicationPlaybooks,
    signals: normalizeSignals(raw.signals)
  };

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, `${date}.json`), `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  console.log(`Imported ${date}: ${aiProjects.length} AI projects, ${applicationPlaybooks.length} application playbooks.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
