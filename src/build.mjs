// Сборка Devlarion Motion: читает данные из content/ и пишет docs/index.html (RU), docs/en/index.html (EN) и docs/404.html.
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { identity as id, copy } from "../content/profile.mjs";
import { cases, products, contacts } from "../content/work.mjs";
import { starterPackages, serviceCards, renderQuiz, estimator } from "../content/pricing.mjs";

const root = new URL("../", import.meta.url);
const SITE = process.env.DEVLARION_MOTION_URL || "https://luvlarion4ik.github.io/devlarion-motion/";
const BASE = new URL(SITE).pathname; // /devlarion-motion/
const classic = id.portfolio;
const icons = {};
for (const f of await readdir(new URL("docs/assets/icons/", root))) {
  icons[f.slice(0, -4)] = (await readFile(new URL("docs/assets/icons/" + f, root), "utf8")).trim().replace(/^<svg /, '<svg class="ai-icon" ');
}
// Версии ресурсов по хешу содержимого: после деплоя браузер не держит старые скрипты и стили.
const ver = {};
for (const f of ["style.css", "field.js", "currency.js", "quiz.js", "app.js"]) {
  ver[f] = createHash("sha256").update(await readFile(new URL("docs/assets/" + f, root))).digest("hex").slice(0, 10);
}
const esc = v => String(v).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const service3d = { agents: "robot", "private-ai": "desktop", web: "globe", platform: "chart", mini: "bags", mobile: "phone", automation: "gear", design: "palette", custom: "gem" };
const package3d = { web: "globe", automation: "speech", mini: "bags" };
// Знак Devlarion: D с вырезом L. Слои: заливка, контур, вырез и блик — их анимирует CSS.
const MARK_D = "M8 6h20c18 0 30 10 30 26S46 58 28 58H8V6Z", MARK_L = "M20 16h9v23h13v9H20V16Z";
let markId = 0;
const mark = (cls = "") => {
  const k = "m" + (++markId);
  return `<svg class="dl-mark ${cls}" viewBox="6 4 54 56" aria-hidden="true" focusable="false"><defs>
    <linearGradient id="${k}g" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="${k}c"><path clip-rule="evenodd" d="${MARK_D}${MARK_L}"/></clipPath></defs>
    <path class="dl-fill" fill-rule="evenodd" d="${MARK_D}${MARK_L}"/>
    <path class="dl-line" pathLength="1" d="${MARK_D}"/><path class="dl-cut" pathLength="1" d="${MARK_L}"/>
    <g clip-path="url(#${k}c)"><rect class="dl-sheen" x="-6" y="0" width="18" height="70" fill="url(#${k}g)"/></g></svg>`;
};
const brandmark = (cls = "") => `<span class="brandmark ${cls}">${mark()}<span class="brandword">Devlarion</span></span>`;
const productImage = { city: "city", cognivue: "cognivue", axenta: "axenta" };

function page(lang, A) {
  const ru = lang === "ru", l = (a, b) => (ru ? a : b), t = copy[lang];
  const self = ru ? SITE : SITE + "en/";
  const other = ru ? "en/" : "../";
  const old = ru ? classic + "ru/" : classic;
  const tg = (text = "") => id.telegram + (text ? "?text=" + encodeURIComponent(text) : "");
  const d3 = (name, cls = "") => `<img class="e3d ${cls}" src="${A}3d/${name}.png" width="256" height="256" alt="" loading="lazy" decoding="async">`;
  const head = (num, label, title, extra = "") => `<div class="sec-head" data-reveal><p class="label">${num} · ${esc(label)}</p><h2 class="glow">${esc(title)}</h2>${extra}</div>`;
  const rub = (v, prefix = "") => v == null ? l("по ТЗ", "quoted") : `<span data-rub="${v}" data-prefix="${prefix}">${prefix ? prefix + " " : ""}${ru ? v.toLocaleString("ru-RU") + " ₽" : "RUB " + v.toLocaleString("en-US")}</span>`;

  const nav = [
    ["1", "services", l("Услуги", "Services")],
    ["2", "work", l("Кейсы", "Work")],
    ["3", "products", l("Продукты", "Products")],
    ["4", "process", l("Процесс", "Process")],
    ["5", "about", l("Студия", "Studio")],
    ["6", "quiz", l("Расчёт", "Estimate")],
    ["7", "contact", l("Контакт", "Contact")],
  ];
  const keys = nav.map(([k, href, label]) => `<a href="#${href}" data-key="${k}"><kbd>${k}</kbd>${label}</a>`).join("");

  const currency = `<div class="currency" data-currency data-rates="${A}rates.json">
    <details><summary aria-label="${l("Валюта цен", "Price currency")}" title="${l("Валюта цен", "Price currency")}"><span data-currency-label>${l("RUB", "USD")}</span><span class="chev" aria-hidden="true">▾</span></summary>
      <div class="currency-panel">
        <p class="label">${l("Валюта цен · курс ЦБ РФ", "Price currency · Bank of Russia rate")}</p>
        <div class="currency-quick" data-currency-quick></div>
        <input type="search" data-currency-search placeholder="${l("Поиск: код или название", "Search code or name")}" aria-label="${l("Поиск валюты", "Search currencies")}" autocomplete="off">
        <ul data-currency-list></ul>
        <p class="muted" data-currency-empty hidden>${l("Ничего не найдено.", "No matches.")}</p>
      </div></details></div>`;
  const langSwitch = `<div class="lang" role="group" aria-label="${l("Язык", "Language")}">
    <a href="${ru ? "./" : "../"}" ${ru ? 'aria-current="true"' : ""} hreflang="ru" lang="ru" ${ru ? "" : 'data-key="l"'}>RU</a><a href="${ru ? "en/" : "./"}" ${ru ? "" : 'aria-current="true"'} hreflang="en" lang="en" ${ru ? 'data-key="l"' : ""}>EN</a></div>`;

  const channels = [
    ["telegram", "Telegram", "t.me/LuvLarion4ik", id.telegram],
    ["threads", "Threads", "threads.com/@luvlarion4ik", id.threads],
    ["mail", l("Почта", "Email"), contacts.email, "mailto:" + contacts.email],
    ["github", "GitHub", "github.com/luvlarion4ik", id.github],
  ];
  const command = `<div class="command" data-command>
    <div class="cmd-pick">
      <button type="button" class="cmd-current" aria-haspopup="listbox" aria-expanded="false" data-cmd-toggle>
        <span class="cmd-icon" data-cmd-icon>${icons.telegram}</span><span data-cmd-label>Telegram</span><span class="chev" aria-hidden="true">▾</span>
      </button>
      <ul role="listbox" class="cmd-list" hidden aria-label="${l("Канал связи", "Contact channel")}">${channels.map(([icon, label, text, href], i) =>
        `<li role="option" tabindex="-1" aria-selected="${i === 0}" data-label="${esc(label)}" data-text="${esc(text)}" data-href="${esc(href)}">${icons[icon]}<span>${esc(label)}</span></li>`).join("")}</ul>
    </div>
    <a class="cmd-text" data-cmd-link href="${id.telegram}"><span class="prompt" aria-hidden="true">›</span><code data-cmd-text>t.me/LuvLarion4ik</code></a>
    <button type="button" class="cmd-copy" data-copy aria-label="${l("Скопировать адрес", "Copy address")}" title="${l("Скопировать адрес", "Copy address")}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8"/><path class="tick" d="m10.5 14 2.2 2.2 4.3-4.4"/></svg>
    </button>
  </div>`;

  // ---------- услуги: окно-бриф в духе редактора кода ----------
  const services = serviceCards(lang);
  const flowWords = l(["созвон", "смета", "договор", "этапы", "запуск"], ["call", "estimate", "agreement", "milestones", "launch"]);
  const brief = s => {
    const tiers = estimator[s.id] || {};
    const mid = Array.isArray(tiers.medium) ? `${rub(tiers.medium[0])} – ${rub(tiers.medium[1])}` : l("по ТЗ", "quoted");
    const q = v => `<span class="s">"${v}"</span>`;
    return `<figure class="window"><figcaption><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>${esc(s.id)}.brief</figcaption>
<pre><code><span class="k">export const</span> project = {
  service: ${q(esc(s.title))},
  from: <span class="s">${rub(tiers.small)}</span>,
  typical: <span class="s">${mid}</span>,
  flow: [${flowWords.map(q).join(", ")}],
  nda: <span class="k">true</span>,
}</code></pre></figure>`;
  };
  const tabs = `<div class="tabs" role="tablist" aria-label="${esc(t.services)}">${services.map((s, i) =>
    `<button type="button" role="tab" id="tab-${s.id}" aria-controls="tp-${s.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(s.title)}</button>`).join("")}</div>
    ${services.map((s, i) => `<div class="tabpanel" role="tabpanel" id="tp-${s.id}" aria-labelledby="tab-${s.id}" ${i ? "hidden" : ""}>
      <div class="tp-copy">${d3(service3d[s.id], "tp-3d")}<p class="label">${String(i + 1).padStart(2, "0")} / ${String(services.length).padStart(2, "0")}</p><h3>${esc(s.title)}</h3><p>${esc(s.description)}</p>
        <div class="row"><a class="btn primary" href="${tg(l("Здравствуйте! Интересует направление: ", "Hello! I'm interested in: ") + s.title)}">${l("Обсудить задачу", "Discuss your project")}</a><a class="btn ghost" href="#quiz">${esc(t.estimate)}</a></div></div>
      ${brief(s)}
    </div>`).join("")}`;
  const packs = starterPackages(lang).map(p => `<article class="pack" data-reveal>
    ${d3(package3d[p.id], "pack-3d")}
    <h3>${esc(p.title)}</h3><p>${esc(p.description)}</p>
    <strong class="price" data-rub="${p.rub}" data-prefix="${l("от", "from")}">${esc(p.price)}</strong>
    <a class="link" href="#quiz" data-estimate-services="${p.estimateId}" data-estimate-tier="small">${l("Рассчитать с опциями", "Estimate with options")}</a>
  </article>`).join("");

  // ---------- кейсы ----------
  const work = cases[lang].map((c, i) => {
    const host = new URL(c.href).host + new URL(c.href).pathname.replace(/\/$/, "");
    const stack = [...new Set((c.tags || []).concat(Object.values(c.stack || {}).flat()))].slice(0, 7);
    return `<article class="case" id="${c.id}">
    <header class="case-head" data-reveal>
      <span class="case-num" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
      <div><p class="label">${esc(c.type)}</p><h3>${esc(c.name)}</h3></div>
      <span class="status ${c.concept ? "demo" : "live"}"><i aria-hidden="true"></i>${c.concept ? l("Демо-версия", "Demo") : l("Работает", "Live")}</span>
    </header>
    <a class="case-stage" href="${esc(c.href)}" target="_blank" rel="noopener" data-reveal aria-label="${esc(c.name)} — ${l("открыть сайт в новой вкладке", "open the site in a new tab")}">
      <div class="browser"><div class="bar"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="url">${esc(host)}</span></div>
        <div class="screen"><img src="${A + c.image}" width="${c.size[0]}" height="${c.size[1]}" alt="${esc(c.alt)}" loading="lazy" decoding="async"></div></div>
      <div class="phone"><div class="screen"><img src="${A + c.mobile}" width="390" height="844" alt="" loading="lazy" decoding="async"></div></div>
      <span class="stage-cta">${l("Открыть сайт", "Open the site")}</span>
    </a>
    <div class="case-story" data-reveal>
      <section><h4><span>01</span>${l("Задача", "Brief")}</h4><p>${esc(c.task)}</p></section>
      <section><h4><span>02</span>${l("Решение", "Build")}</h4><p>${esc(c.solution)}</p></section>
      <section class="accent"><h4><span>03</span>${l("Результат", "Outcome")}</h4><p>${esc(c.result)}</p></section>
    </div>
    ${c.flow ? `<ol class="flow" data-reveal aria-label="${l("Как устроен процесс", "How the workflow runs")}">${c.flow.map((f, k) => `<li><b>${k + 1}</b><span>${esc(f)}</span></li>`).join("")}</ol>` : ""}
    <footer class="case-foot" data-reveal>
      <p class="chips">${stack.map(tag => `<span>${esc(tag)}</span>`).join("")}</p>
      ${c.demoNote ? `<p class="note">${esc(c.demoNote)}</p>` : ""}
      <div class="row"><a class="btn" href="${esc(c.href)}" target="_blank" rel="noopener">${l("Открыть сайт", "Open the site")}</a><a class="btn ghost" href="${old}work/${c.id}/">${l("Полный разбор кейса", "Full case study")}</a></div>
    </footer>
  </article>`;
  }).join("");

  // ---------- продукты ----------
  const watchIntro = l("Ассистент для iPhone и Apple Watch в закрытом бета-тестировании. В режиме «Тихий суфлёр» подсказка появляется на затемнённом экране часов.", "An assistant for iPhone and Apple Watch, currently in closed beta. Silent Prompter displays a suggestion on the dimmed watch face.");
  const lab = products[lang].map(p => {
    const img = productImage[p.preview];
    const media = img ? `<img src="${A}products/${img}.webp" width="768" height="512" alt="" loading="lazy" decoding="async">`
      : `<div class="keyrow" aria-hidden="true">${["⌘", "⌥", "⇧"].map((k, n) => `<kbd style="--k:${n}">${k}</kbd>`).join("")}<kbd class="hot" style="--k:3">K</kbd></div><div class="keyrow" aria-hidden="true">${["Esc", "↵"].map((k, n) => `<kbd style="--k:${n + 4}">${k}</kbd>`).join("")}</div>`;
    return `<article class="product" data-reveal>
    <div class="product-media${img ? "" : " keys-art"}">${media}<span class="status-chip">${esc(p.status)}</span></div>
    <div class="product-body"><h3>${esc(p.name)}</h3><p>${esc(p.summary)}</p>
    ${p.details ? `<details><summary>${esc(p.details.title)}</summary><p>${esc(p.details.description)}</p>${p.details.roles ? `<ul class="roles">${p.details.roles.map(([r, d]) => `<li><b>${esc(r)}</b><span>${esc(d)}</span></li>`).join("")}</ul>` : ""}</details>` : ""}
    ${p.links.length ? `<p class="row">${p.links.map(k => `<a class="link" href="${esc(k.href)}" target="_blank" rel="noopener">${esc(k.label)}</a>`).join("")}</p>` : ""}</div>
  </article>`;
  }).join("");

  const steps = t.steps.map(([h, p], i) => `<li data-reveal><span class="num">${String(i + 1).padStart(2, "0")}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join("");
  const faq = t.faqs.map(([q, a]) => `<details class="qa"><summary>${esc(q)}<span aria-hidden="true">+</span></summary><p>${esc(a)}</p></details>`).join("");
  const stack = ["Next.js", "TypeScript", "FastAPI", "SwiftUI", "Telegram", "MAX"];
  const sticker = (text, center, cls) => `<div class="sticker ${cls}" aria-hidden="true"><svg viewBox="0 0 200 200"><defs><path id="c-${cls}" d="M100 100m-78 0a78 78 0 1 1 156 0a78 78 0 1 1-156 0"/></defs>
    <circle cx="100" cy="100" r="96" class="ring"/><circle cx="100" cy="100" r="60" class="ring inner"/>
    <text><textPath href="#c-${cls}">${esc(text)}</textPath></text></svg><b>${esc(center)}</b></div>`;
  const socials = [["Telegram", id.telegram, "telegram"], ["Threads", id.threads, "threads"], ["GitHub", id.github, "github"], [l("Почта", "Email"), "mailto:" + contacts.email, "mail"]];
  const title = `Devlarion — ${t.title}`;

  return `<!doctype html>
<html lang="${lang}" data-tint="copper">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(t.intro)}">
<meta name="theme-color" content="#05070f">
<link rel="canonical" href="${self}">
<link rel="alternate" hreflang="ru" href="${SITE}"><link rel="alternate" hreflang="en" href="${SITE}en/"><link rel="alternate" hreflang="x-default" href="${SITE}">
<meta property="og:type" content="website"><meta property="og:url" content="${self}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(t.intro)}">
<meta property="og:image" content="${SITE}assets/brand/og-${lang}.jpg"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${A}brand/favicon.svg" type="image/svg+xml"><link rel="icon" href="${A}brand/favicon-32.png" sizes="32x32"><link rel="apple-touch-icon" href="${A}brand/apple-touch-icon.png">
<link rel="preload" href="${A}fonts/golos-text-${ru ? "cyrillic" : "latin"}.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${A}style.css?v=${ver["style.css"]}">
<script defer src="${A}field.js?v=${ver["field.js"]}"></script>
<script defer src="${A}currency.js?v=${ver["currency.js"]}"></script>
<script defer src="${A}quiz.js?v=${ver["quiz.js"]}"></script>
<script defer src="${A}app.js?v=${ver["app.js"]}"></script>
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "ProfessionalService", name: "Devlarion", url: self, founder: { "@type": "Person", name: id.founder[lang] }, sameAs: [id.telegram, id.threads, id.github, classic] }).replaceAll("<", "\\u003c")}</script>
</head>
<body>
<a class="skip" href="#main">${l("К содержанию", "Skip to content")}</a>
<canvas class="field" data-field data-icons="${A}icons/" aria-hidden="true"></canvas>
<div class="fx-glow" aria-hidden="true"></div><div class="fx-grain" aria-hidden="true"></div>
<header class="top">
  <a class="brand" href="#top" aria-label="${l("Devlarion — наверх", "Devlarion — back to top")}">${brandmark("intro")}</a>
  <p class="hint label" aria-hidden="true">${l("Листайте или жмите", "Scroll or press")} <kbd>↓</kbd> <kbd>↑</kbd></p>
  <nav class="keys" aria-label="${l("Разделы", "Sections")}">${keys}</nav>
  <div class="tools">
    ${currency}
    ${langSwitch}
    <a class="icon-btn" href="${id.threads}" target="_blank" rel="noopener" aria-label="Threads" title="Threads">${icons.threads}</a>
    <a class="btn primary small" href="${tg()}" data-key="t">Telegram</a>
    <details class="menu"><summary aria-label="${l("Меню", "Menu")}"><span></span><span></span></summary>
      <nav aria-label="${l("Меню", "Menu")}">${nav.map(([, href, label]) => `<a href="#${href}">${label}</a>`).join("")}<a href="${id.threads}" target="_blank" rel="noopener">Threads</a><a href="${old}">${l("Классическая версия", "Classic site")}</a></nav></details>
  </div>
</header>
<main id="main">
<section class="hero" id="top" data-scene="mark" data-tint="copper">
  <h1 class="mega"><span class="sr">Devlarion — ${esc(t.title)}</span><span class="mega-word" data-text="DEVLARION" aria-hidden="true">DEVLARION</span></h1>
  <div class="hero-copy">
    <p class="label eyebrow">${esc(t.eyebrow)} · ${esc(id.founder[lang])}</p>
    <p class="glow headline">${esc(t.title)}</p>
    <p class="lead">${esc(t.intro)}</p>
    ${command}
    <div class="row cta"><a class="btn primary" href="${tg()}">${esc(t.cta)}</a><a class="btn" href="#work">${esc(t.cases)}</a><a class="btn ghost" href="${id.threads}" target="_blank" rel="noopener">Threads</a></div>
  </div>
  <a class="scroll-cue" href="#services" aria-label="${l("К услугам", "To services")}"><span></span></a>
</section>

<section class="section" id="services" data-scene="kit" data-tint="ice">
  ${sticker(l("САЙТЫ · БОТЫ · ИИ · МИНИ-ПРИЛОЖЕНИЯ · ", "WEBSITES · BOTS · AI · MINI APPS · "), "D/L", "s1")}
  <div class="stage">${head("01", t.nav[0], t.services, `<p class="lead center-text">${l("Девять направлений — от сайта для заявок до ИИ в вашем контуре.", "Nine capabilities, from an enquiry website to AI on your own infrastructure.")}</p>`)}</div>
  <div class="panel tabbed" data-reveal>${tabs}</div>
  <div class="packs-head" data-reveal><h2 class="glow">${esc(t.fees)}</h2><p>${l("Стартовые пакеты для небольшого бизнеса. Для компаний любого масштаба подберём условия и обсудим скидку — итоговую стоимость пришлём после созвона.", "Starter packages for small businesses. For companies of any size we tailor the terms and discuss any discount; the final quote follows our call.")}</p></div>
  <div class="packs">${packs}</div>
  <p class="rate-note muted" data-rate-note data-reveal></p>
</section>

<section class="section" id="work" data-tint="wine">
  <div class="stage tall" data-scene="car">${head("02", t.nav[1], t.work, `<p class="drive-hint label"><span class="pulse" aria-hidden="true"></span>${l("Седан на подиуме поворачивается за курсором. Клик по фону — сноп искр.", "The sedan turns with your cursor. Click the background for sparks.")}</p>`)}</div>
  <div class="cases" data-scene="screens">${work}</div>
</section>

<section class="section" id="products" data-scene="galaxy" data-tint="copper">
  ${sticker(l("ПРОДУКТЫ DEVLARION · В РАЗРАБОТКЕ · ", "DEVLARION PRODUCTS · IN THE LAB · "), "LAB", "s3")}
  <div class="stage">${head("03", l("Продукты", "Products"), t.products, `<p class="lead center-text">${l("Над чем студия работает помимо клиентских проектов.", "What the studio builds alongside client work.")}</p>`)}</div>
  <article class="aura" data-reveal>
    <div class="aura-media"><img src="${A}brand/watch.webp" width="1050" height="700" alt="${l("Apple Watch на руке", "Apple Watch on a wrist")}" loading="lazy" decoding="async">
      <div class="aura-screen" role="img" aria-label="${l("Подсказка AuraWatch на экране часов", "AuraWatch suggestion on the watch face")}"><small>AuraWatch</small><b data-type="${esc(l("Какие следующие шаги?|Уточните сроки и бюджет.|Предложите созвон в четверг.", "What are the next steps?|Confirm timeline and budget.|Suggest a call on Thursday."))}">${l("Какие следующие шаги?", "What are the next steps?")}</b></div></div>
    <div class="aura-copy"><p class="label status-line"><i aria-hidden="true"></i>${l("Закрытая бета · iPhone + Apple Watch", "Closed beta · iPhone + Apple Watch")}</p><h3>AuraWatch</h3><p>${esc(watchIntro)}</p>
      <div class="row"><a class="btn primary" href="${tg(l("Хочу участвовать в закрытой бете AuraWatch.", "I'd like to join the AuraWatch closed beta."))}">${l("Хочу в закрытую бету", "Join the closed beta")}</a><a class="btn ghost" href="${old}aurawatch/">${l("Подробнее", "Learn more")}</a></div></div>
  </article>
  <div class="products">${lab}</div>
</section>

<section class="section" id="process" data-scene="sphere" data-tint="sage">
  <div class="stage">${head("04", l("Процесс", "Process"), t.process)}</div>
  <div class="panel wide" data-reveal><p class="lead">${esc(t.bio)}</p><ol class="steps">${steps}</ol></div>
</section>

<section class="section" id="about" data-scene="wave" data-tint="ice">
  <div class="stage short"></div>
  <div class="about panel" data-reveal>
    <div class="logo-show" data-logo-show aria-hidden="true"><div class="logo-tilt">${mark("big")}</div><span class="logo-floor"></span></div>
    <div class="about-copy">
      <p class="label">05 · ${l("Студия", "Studio")}</p>
      <h2 class="glow">${l("О студии", "About the studio")}</h2>
      <p class="lead">${l("Devlarion разрабатывает сайты, ботов, мобильные приложения и ИИ-сервисы для бизнеса. Ведём проект от аналитики и дизайна до запуска и поддержки. Работаем по договору с ИП. Состав, смету и этапы согласуем до начала работ.", "Devlarion builds websites, bots, mobile apps and AI services for businesses. We cover discovery, design, delivery and support, with the scope, budget and milestones agreed before work begins.")}</p>
      <div class="founder">${mark("small")}<div><b>${esc(id.founder[lang])}</b><small>${l("Основатель · архитектор и разработчик", "Founder · architect and developer")}</small></div></div>
      <p class="chips">${stack.map(s => `<span>${s}</span>`).join("")}</p>
      <div class="row"><a class="btn" href="${id.threads}" target="_blank" rel="noopener">${l("Читать в Threads", "Follow on Threads")}</a><a class="btn ghost" href="${id.github}" target="_blank" rel="noopener">GitHub</a></div>
    </div>
  </div>
  <div class="panel faq-panel" data-reveal><h2 class="glow">${esc(t.faq)}</h2><div class="faq">${faq}</div></div>
</section>

<section class="section" id="quiz" data-scene="wave" data-tint="sage">
  <div class="stage short">${head("06", l("Расчёт", "Estimate"), t.estimate, `<p class="lead center-text">${l("Три шага — и вилка стоимости в выбранной валюте по курсу ЦБ. Расчёт можно сразу отправить в Telegram.", "Three steps to a price range in your currency at the Bank of Russia rate. Send it straight to Telegram.")}</p>`)}</div>
  <div class="panel quiz" data-reveal>${renderQuiz(lang, id.telegram)}<p class="rate-note muted" data-rate-note></p></div>
</section>

<section class="section finale" id="contact" data-scene="road" data-tint="red">
  <div class="stage short">${head("07", l("Контакт", "Contact"), t.ask)}</div>
  <div class="split" data-reveal>
    <div class="panel"><p>${esc(t.close)}</p><div class="row"><a class="btn primary" href="${tg()}">${esc(t.cta)}</a><a class="btn ghost" href="mailto:${contacts.email}">${contacts.email}</a></div></div>
    <div class="panel"><p class="label">${l("Ещё каналы", "More channels")}</p>
      <ul class="channels">${socials.map(([label, href, icon]) => `<li><a href="${esc(href)}" target="_blank" rel="noopener">${icons[icon]}<span>${esc(label)}</span></a></li>`).join("")}</ul></div>
  </div>
  <div class="road-space" aria-hidden="true"></div>
  <footer class="foot">
    <div class="foot-brand">${brandmark("foot-mark")}
      <div class="social">${socials.map(([label, href, icon]) => `<a href="${esc(href)}" aria-label="${esc(label)}" title="${esc(label)}" target="_blank" rel="noopener">${icons[icon]}</a>`).join("")}</div></div>
    <div class="foot-links">
      <p class="fine">© 2026 Devlarion · ${esc(id.founder[lang])}</p>
      <p class="fine"><a href="${old}">${l("Классическая версия сайта", "Classic site")}</a> · <a href="${old}privacy/">${l("Конфиденциальность", "Privacy")}</a> · <a href="${A}licenses/fluent-emoji.txt">${l("Лицензии", "Licences")}</a> · <button type="button" class="linkish" data-share-page>${l("Поделиться", "Share")}</button> · <a href="${other}" hreflang="${ru ? "en" : "ru"}">${ru ? "English" : "Русский"}</a></p>
    </div>
  </footer>
</section>
</main>
<div class="toast" role="status" aria-live="polite" data-toast></div>
</body>
</html>
`;
}

function notFound() {
  const A = BASE + "assets/";
  return `<!doctype html>
<html lang="ru" data-tint="red">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>404 — Devlarion</title><meta name="robots" content="noindex">
<link rel="icon" href="${A}brand/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${A}style.css?v=${ver["style.css"]}">
<script defer src="${A}field.js?v=${ver["field.js"]}"></script>
</head>
<body class="nf-page">
<canvas class="field" data-field data-icons="${A}icons/" aria-hidden="true"></canvas>
<div class="fx-grain" aria-hidden="true"></div>
<main class="nf" data-scene="mark">
  <div class="nf-unfold" aria-hidden="true">${mark("big unfold play")}<span class="nf-code">404</span></div>
  <h1 class="glow">Страница не найдена</h1>
  <p class="lead" lang="en">Page not found. The address may have changed.</p>
  <div class="row cta"><a class="btn primary" href="${BASE}">На главную</a><a class="btn" href="${BASE}en/" lang="en">English</a><a class="btn ghost" href="${id.telegram}">Telegram</a></div>
</main>
</body>
</html>
`;
}

const out = async (path, html) => {
  const url = new URL("docs/" + path, root);
  await mkdir(new URL(".", url), { recursive: true });
  await writeFile(url, html);
  console.log("wrote docs/" + path);
};
await out("index.html", page("ru", "assets/"));
await out("en/index.html", page("en", "../assets/"));
await out("404.html", notFound());
await out("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${SITE}</loc></url>\n<url><loc>${SITE}en/</loc></url>\n</urlset>\n`);
await out("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);
