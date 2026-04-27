const archiveIndexUrl = "./data/archive-index.json";
const archiveBaseUrl = "./data/archive/";
const fmt = new Intl.NumberFormat("en-US");

const state = {
  selectedDate: null,
  category: "All",
  datasets: new Map()
};

async function loadJson(url, fallbackValue) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch {
    return fallbackValue;
  }
}

async function loadDataset(date) {
  if (state.datasets.has(date)) return state.datasets.get(date);
  const fallback = window.__TRENDING_BOOTSTRAP__.datasets[date];
  const data = await loadJson(`${archiveBaseUrl}${date}.json`, fallback);
  state.datasets.set(date, data);
  return data;
}

function filterRepos(repos = []) {
  if (state.category === "All") return repos;
  return repos.filter((repo) => repo.category === state.category);
}

async function render() {
  const dataset = await loadDataset(state.selectedDate);
  const growthRepos = filterRepos(dataset.fastestGrowth).slice(0, 10);
  const starredRepos = [...growthRepos].sort((a, b) => b.starsTotal - a.starsTotal).slice(0, 10);
  const favorites = filterRepos(dataset.favorites);

  document.querySelector("#lastUpdated").textContent = dataset.meta.lastUpdated;
  document.querySelector("#mainTheme").textContent = dataset.overview.theme;
  document.querySelector("#projectCount").textContent = `${growthRepos.length} 个`;

  renderOverview(dataset.overview, growthRepos);
  renderSpotlight(dataset.spotlight);
  renderReportList("#growthReportList", growthRepos, "增长榜");
  renderReportList("#starsReportList", starredRepos, "总星榜");
  renderSignals(dataset.signals);
  renderFavorites(favorites);
}

function renderOverview(overview, repos) {
  const top = repos[0];
  const cards = [
    ["观察日期", overview.observedDate, "今天这期在看什么", overview.note],
    ["今日主线", overview.theme, "最近的 AI 热点", overview.themeNote],
    ["最猛项目", top ? top.name.split("/")[1] : "--", top ? top.name : "当前筛选无结果", top ? top.summary : "可以切换分类。"],
    ["今日数量", String(repos.length), "今天值得看的项目数", overview.scope]
  ];

  document.querySelector("#overviewGrid").innerHTML = cards
    .map(
      ([label, value, title, note]) => `
        <article class="overview-card">
          <span class="toolbar-label">${label}</span>
          <div class="overview-value">${value}</div>
          <h3>${title}</h3>
          <p class="overview-note">${note}</p>
        </article>
      `
    )
    .join("");
}

function renderSpotlight(items) {
  document.querySelector("#spotlightGrid").innerHTML = items
    .map(
      (item) => `
        <article class="spotlight-item">
          <h3>${item.title}</h3>
          <p>${item.description}</p>
        </article>
      `
    )
    .join("");
}

function renderReportList(selector, repos, label) {
  const root = document.querySelector(selector);
  if (!repos.length) {
    root.innerHTML = `<p class="empty-state">当前筛选下没有项目，可以切换回 All。</p>`;
    return;
  }

  root.innerHTML = repos
    .map(
      (repo, index) => `
        <article class="report-card">
          <div class="report-topline">
            <div>
              <div class="report-rank">${label} No. ${label === "增长榜" ? repo.rank : index + 1}</div>
              <h3>${repo.name}</h3>
            </div>
            <span class="category-pill">${repo.category}</span>
          </div>
          <div class="tag-row">
            <span class="metric-chip">+${fmt.format(repo.starsToday)} 今日新增</span>
            <span class="metric-chip">${fmt.format(repo.starsTotal)} Stars</span>
            <span class="metric-chip">${fmt.format(repo.forks)} Forks</span>
          </div>
          <p class="report-summary">${repo.summary}</p>
          <div class="report-links">
            <a class="report-link" href="${repo.url}" target="_blank" rel="noreferrer">打开 GitHub 仓库</a>
          </div>
          <details>
            <summary>展开详细解读</summary>
            <p class="report-body"><strong>这个项目在做什么：</strong>${repo.beginnerGuide}</p>
            <p class="report-body"><strong>为什么这算一种新玩法：</strong>${repo.whyItMatters}</p>
            <p class="report-body"><strong>建议怎么继续看：</strong>先看 README、演示图、安装方式、最近提交和 Issues。</p>
          </details>
        </article>
      `
    )
    .join("");
}

function renderSignals(signals) {
  document.querySelector("#signalList").innerHTML = signals
    .map(
      (signal) => `
        <article class="signal-item">
          <h3>${signal.title}</h3>
          <details>
            <summary>查看详细解释</summary>
            <p class="signal-copy">${signal.description}</p>
          </details>
        </article>
      `
    )
    .join("");
}

function renderFavorites(repos) {
  const root = document.querySelector("#favoriteList");
  if (!repos.length) {
    root.innerHTML = `<p class="empty-state">当前筛选下没有长期跟踪项目。</p>`;
    return;
  }

  root.innerHTML = repos
    .map(
      (repo) => `
        <article class="favorite-item">
          <h3>${repo.name}</h3>
          <div class="tag-row">
            <span class="metric-chip">${repo.reason}</span>
            <span class="category-pill">${repo.category}</span>
          </div>
          <p>${repo.summary}</p>
          <div class="report-links">
            <a class="report-link" href="${repo.url}" target="_blank" rel="noreferrer">去 GitHub 看看</a>
          </div>
        </article>
      `
    )
    .join("");
}

async function boot() {
  const fallback = window.__TRENDING_BOOTSTRAP__;
  const index = await loadJson(archiveIndexUrl, fallback.index);
  state.selectedDate = index.defaultDate;

  document.querySelector("#dateSelect").innerHTML = index.dates
    .map((date) => `<option value="${date.value}">${date.label}</option>`)
    .join("");

  document.querySelector("#filterChips").innerHTML = index.categories
    .map((category) => `<button class="filter-chip${category === "All" ? " is-active" : ""}" data-category="${category}">${category}</button>`)
    .join("");

  document.querySelector("#dateSelect").addEventListener("change", async (event) => {
    state.selectedDate = event.target.value;
    await render();
  });

  document.querySelector("#filterChips").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    document.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.toggle("is-active", chip === button));
    await render();
  });

  await render();
}

boot().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main style="padding:24px;font-family:sans-serif"><h1>页面加载失败</h1><p>请检查数据文件。</p></main>`;
});
