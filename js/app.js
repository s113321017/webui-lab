const navElement = document.querySelector("#primaryNav");
const metricsElement = document.querySelector("#metricsGrid");
const scheduleElement = document.querySelector("#scheduleList");
const noticesElement = document.querySelector("#noticeList");
const moduleView = document.createElement("section");
const messageDemoElement = document.querySelector("#messageDemo");
const detailDemoElement = document.querySelector("#detailDemo");
const dashboardSections = [messageDemoElement, detailDemoElement, metricsElement, document.querySelector(".lower-grid")];
const sidebar = document.querySelector("#sidebar");
const menuToggle = document.querySelector("#menuToggle");
const sidebarBackdrop = document.querySelector("#sidebarBackdrop");
const navigationPreview = document.querySelector("#preview");
const changeButton = document.querySelector("#changeButton");
const messageElement = document.querySelector("#message");
const detailButton = document.querySelector("#detailButton");
const detailPanel = document.querySelector("#detailPanel");
const toast = document.querySelector("#toast");
let toastTimer;

moduleView.className = "module-view";
moduleView.hidden = true;
moduleView.setAttribute("aria-live", "polite");
document.querySelector("#mainContent").insertBefore(moduleView, document.querySelector(".page-footer"));

function makeElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function showMessage(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function showNavigationPreview(item) {
    navigationPreview.textContent = item.label;
}

function changeMessage() {
    messageElement.textContent = "已完成更新";
}

function toggleDetail() {
    detailPanel.hidden = !detailPanel.hidden;
    detailButton.setAttribute("aria-expanded", String(!detailPanel.hidden));
}

function showLoadError(target, message) {
    target.replaceChildren(makeElement("p", "empty-state", message));
}

async function loadJson(path) {
    const response = await fetch(new URL(path, document.baseURI), { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

function renderNavigation(items) {
    navElement.replaceChildren();
    for (const item of items) {
        const button = makeElement("button", "nav-link", "");
        button.type = "button";
        button.dataset.page = item.id;
        if (item.depth) button.style.paddingLeft = `${11 + item.depth * 14}px`;
        button.setAttribute("aria-current", item.id === "dashboard" ? "page" : "false");
        const icon = makeElement("span", "nav-icon", item.icon);
        icon.setAttribute("aria-hidden", "true");
        button.append(icon, makeElement("span", "nav-label", item.label));
        button.addEventListener("mouseenter", () => showNavigationPreview(item));
        button.addEventListener("mouseleave", () => { navigationPreview.textContent = ""; });
        if (item.id === "dashboard") button.classList.add("is-active");
        navElement.append(button);
    }
}

async function loadSubclassBranch(item, ancestors = new Set()) {
    const label = item.child_name || `目錄 ${item.cid}`;
    const navigationItem = {
        id: `class-${item.cid}`,
        label,
        icon: label.slice(0, 1),
        description: `「${item.parent_name || "未命名目錄"}」下的功能目錄。`,
        depth: ancestors.size,
    };

    if (ancestors.has(item.cid)) return [navigationItem];

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(item.cid);
    const children = await loadJson(`api/subclass/pcid/${item.cid}`);
    const descendantGroups = await Promise.all(
        children.map((child) => loadSubclassBranch(child, nextAncestors))
    );
    return [navigationItem, ...descendantGroups.flat()];
}

async function loadSubclassNavigation() {
    const roots = await loadJson("api/subclass/pcid/0");
    const branches = await Promise.all(roots.map((item) => loadSubclassBranch(item)));
    return branches.flat();
}

function renderMetrics(metrics) {
    metricsElement.replaceChildren();
    for (const metric of metrics) {
        const card = makeElement("article", "metric-card");
        card.style.setProperty("--metric-accent", metric.accent);
        card.style.setProperty("--metric-tint", metric.tint);
        const top = makeElement("div", "metric-topline");
        top.append(makeElement("span", "metric-label", metric.label));
        const icon = makeElement("span", "metric-icon", metric.icon);
        icon.setAttribute("aria-hidden", "true");
        top.append(icon);
        const value = makeElement("div", "metric-value-row");
        value.append(makeElement("strong", "metric-value", metric.value));
        if (metric.unit) value.append(makeElement("span", "metric-unit", metric.unit));
        const footnote = makeElement("p", "metric-footnote");
        if (metric.change) {
            footnote.append(makeElement("span", "metric-change", metric.change), document.createTextNode(` ${metric.note}`));
        } else {
            footnote.textContent = metric.note;
        }
        card.append(top, value, footnote);
        metricsElement.append(card);
    }
}

function selectDashboardCard(card) {
    card.classList.toggle("is-selected");
}

function renderSchedule(items) {
    scheduleElement.replaceChildren();
    for (const item of items) {
        const row = makeElement("div", "schedule-item");
        const day = makeElement("span", "schedule-day");
        day.append(makeElement("span", "", item.weekday), makeElement("strong", "", item.day));
        const info = makeElement("div", "schedule-info");
        info.append(makeElement("strong", "", item.title), makeElement("span", "", item.detail));
        row.append(day, info, makeElement("span", "schedule-time", item.time));
        scheduleElement.append(row);
    }
}

function renderNotices(items) {
    noticesElement.replaceChildren();
    for (const item of items) {
        const row = makeElement("article", "notice-item");
        const marker = makeElement("span", "notice-marker");
        marker.style.setProperty("--notice-accent", item.accent);
        marker.setAttribute("aria-hidden", "true");
        const content = makeElement("div", "");
        content.append(makeElement("strong", "", item.title));
        const meta = makeElement("div", "notice-meta");
        meta.append(makeElement("span", "", item.category), makeElement("time", "", item.date));
        content.append(meta);
        row.append(marker, content);
        noticesElement.append(row);
    }
}

function setCurrentPage(item) {
    document.querySelectorAll(".nav-link").forEach((button) => {
        const active = button.dataset.page === item.id;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-current", active ? "page" : "false");
    });
    const isDashboard = item.id === "dashboard";
    dashboardSections.forEach((section) => { section.hidden = !isDashboard; });
    moduleView.hidden = isDashboard;
    document.querySelector("#pageLabel").textContent = item.label;
    document.querySelector("#pageTitle").textContent = isDashboard ? "教務總覽" : item.label;
    if (!isDashboard) {
        moduleView.replaceChildren(
            makeElement("p", "eyebrow", "ACADEMIC OPERATIONS"),
            makeElement("h2", "", item.label),
            makeElement("p", "", item.description),
            makeElement("div", "module-note", "此功能頁面將於教務服務串接後提供。")
        );
    }
}

function closeSidebar() {
    sidebar.classList.remove("is-open");
    sidebarBackdrop.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "開啟導覽選單");
}

menuToggle.addEventListener("click", () => {
    const willOpen = !sidebar.classList.contains("is-open");
    sidebar.classList.toggle("is-open", willOpen);
    sidebarBackdrop.hidden = !willOpen;
    menuToggle.setAttribute("aria-expanded", String(willOpen));
    menuToggle.setAttribute("aria-label", willOpen ? "關閉導覽選單" : "開啟導覽選單");
});

sidebarBackdrop.addEventListener("click", closeSidebar);
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSidebar();
});

changeButton.addEventListener("click", changeMessage);
detailButton.addEventListener("click", toggleDetail);

metricsElement.addEventListener("click", (event) => {
    const card = event.target.closest(".metric-card");
    if (card) selectDashboardCard(card);
});

navElement.addEventListener("click", (event) => {
    const button = event.target.closest(".nav-link");
    if (!button) return;
    const item = navigationItems.find((entry) => entry.id === button.dataset.page);
    if (item) setCurrentPage(item);
    closeSidebar();
});

document.querySelectorAll("[data-nav-target]").forEach((button) => {
    button.addEventListener("click", () => {
        const item = navigationItems.find((entry) => entry.id === button.dataset.navTarget);
        if (item) setCurrentPage(item);
    });
});

document.querySelector("#loginButton").addEventListener("click", () => {
    showMessage("登入服務尚未串接，請由校務身分驗證入口登入。");
});

const now = new Date();
document.querySelector("#todayLabel").textContent = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric", month: "long", day: "numeric", weekday: "short"
}).format(now);

let navigationItems = [];
loadJson("json/dashboard_cards.json")
    .then((dashboard) => {
        renderMetrics(dashboard.metrics);
        renderSchedule(dashboard.schedule);
        renderNotices(dashboard.notices);
        document.querySelector("#termLabel").textContent = dashboard.term;
    })
    .catch((error) => {
        console.error("無法載入教務資料：", error);
        showLoadError(metricsElement, "教務資料載入失敗，請稍後重新整理。");
        showLoadError(scheduleElement, "課務資料暫時無法載入。");
        showLoadError(noticesElement, "公告資料暫時無法載入。");
        document.querySelector("#termLabel").textContent = "資料尚未載入";
    });

loadSubclassNavigation()
    .then((subclassItems) => {
        const dashboardItem = {
            id: "dashboard",
            label: "教務總覽",
            icon: "總",
            description: "查看教務指標、近期課務與最新公告。",
        };
        navigationItems = [dashboardItem, ...subclassItems];
        renderNavigation(navigationItems);
    })
    .catch((error) => {
        console.error("無法載入資料庫功能選單：", error);
        showLoadError(navElement, "目錄載入失敗，請確認 API、資料庫與 view 權限。");
    });