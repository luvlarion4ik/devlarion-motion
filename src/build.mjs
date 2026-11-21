// Сборка Devlarion Motion: читает данные из content/ и пишет docs/index.html (RU) и docs/en/index.html (EN).
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { identity as id, copy } from "../content/profile.mjs";
import { cases, products, contacts } from "../content/work.mjs";
import { starterPackages, serviceCards } from "../content/pricing.mjs";

const root = new URL("../", import.meta.url);
const icons = {};
for (const f of await readdir(new URL("docs/assets/icons/", root))) {
  icons[f.slice(0, -4)] = (await readFile(new URL("docs/assets/icons/" + f, root), "utf8")).trim().replace(/^<svg /, '<svg class="ai-icon" ');
}
const USD = 81.929; // курс ЦБ на 20.11.2026, как в основном сайте
const classic = id.portfolio; // https://luvlarion4ik.github.io/luvlarion4ik/
const esc = v => String(v).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const serviceIcon = { agents: "ai", "private-ai": "server", web: "web", platform: "layers", mini: "mini", mobile: "mobile", automation: "bot", design: "design", custom: "spark" };
const packageIcon = { web: "web", automation: "bot", mini: "mini" };
const productIcon = { city: "layers", cognivue: "design", axenta: "ai" };

for (const lang of ["ru", "en"]) {
  const ru = lang === "ru", l = (a, b) => (ru ? a : b), t = copy[lang];
  const A = ru ? "assets/" : "../assets/";
  const self = ru ? "./" : "../";
  const other = ru ? "en/" : "../";
  const old = ru ? classic + "ru/" : classic;
  const tg = (text = "") => id.telegram + (text ? "?text=" + encodeURIComponent(text) : "");
  const price = rub => ru ? "от " + rub.toLocaleString("ru-RU") + " ₽"
    : "from ≈ " + new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(rub / USD);

  const nav = [
    ["1", "services", l("Услуги", "Services")],
    ["2", "work", l("Кейсы", "Work")],
    ["3", "process", l("Процесс", "Process")],
    ["4", "products", l("Продукты", "Products")],
    ["5", "about", l("Студия", "Studio")],
    ["6", "contact", l("Контакт", "Contact")],
  ];
  const keys = nav.map(([k, href, label]) => `<a href="#${href}" data-key="${k}"><kbd>${k}</kbd>${label}</a>`).join("")
    + `<a href="${tg()}" data-key="t" class="key-tg"><kbd>T</kbd>Telegram</a>`
    + `<a href="${other}" data-key="l" hreflang="${ru ? "en" : "ru"}" lang="${ru ? "en" : "ru"}"><kbd>L</kbd>${ru ? "EN" : "RU"}</a>`;

  const channels = [
    ["telegram", "Telegram", "t.me/LuvLarion4ik", id.telegram],
    ["mail", l("Почта", "Email"), contacts.email, "mailto:" + contacts.email],
    ["github", "GitHub", "github.com/luvlarion4ik", id.github],
    ["threads", "Threads", "threads.com/@luvlarion4ik", id.threads],
  ];
  const command = `<div class="command" data-command>
    <div class="cmd-pick">
      <button type="button" class="cmd-current" aria-haspopup="listbox" aria-expanded="false" data-cmd-toggle>
        <span class="cmd-icon" data-cmd-icon>${icons.telegram}</span><span data-cmd-label>Telegram</span><span class="chev" aria-hidden="true">▾</span>
      </button>
      <ul role="listbox" class="cmd-list" hidden>${channels.map(([icon, label, text, href], i) =>
        `<li role="option" tabindex="-1" aria-selected="${i === 0}" data-icon="${icon}" data-label="${esc(label)}" data-text="${esc(text)}" data-href="${esc(href)}">${icons[icon]}<span>${esc(label)}</span></li>`).join("")}</ul>
    </div>
    <a class="cmd-text" data-cmd-link href="${id.telegram}"><span class="prompt" aria-hidden="true">$</span> <code data-cmd-text>t.me/LuvLarion4ik</code></a>
    <button type="button" class="cmd-copy" data-copy aria-label="${l("Скопировать", "Copy")}" title="${l("Скопировать", "Copy")}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8"/><path class="tick" d="m10.5 14 2.2 2.2 4.3-4.4"/></svg>
    </button>
  </div>`;

  const services = serviceCards(lang);
  const tabs = `<div class="tabs" role="tablist" aria-label="${esc(t.services)}">${services.map((s, i) =>
    `<button type="button" role="tab" id="tab-${s.id}" aria-controls="tp-${s.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(s.title)}</button>`).join("")}</div>
    ${services.map((s, i) => `<div class="tabpanel" role="tabpanel" id="tp-${s.id}" aria-labelledby="tab-${s.id}" ${i ? "hidden" : ""}>
      <div class="tp-icon" aria-hidden="true">${icons[serviceIcon[s.id]] || icons.spark}</div>
      <div class="tp-copy"><h3>${esc(s.title)}</h3><p>${esc(s.description)}</p>
        <a class="btn ghost" href="${tg(l("Здравствуйте! Интересует направление: ", "Hello! I'm interested in: ") + s.title)}">${l("Обсудить направление", "Discuss this")} <span aria-hidden="true">↗</span></a></div>
    </div>`).join("")}`;

  const packs = starterPackages(lang).map(p => `<article class="pack" data-reveal>
    <span class="pack-icon" aria-hidden="true">${icons[packageIcon[p.id]]}</span>
    <h4>${esc(p.title)}</h4><p>${esc(p.description)}</p><strong class="price">${esc(price(p.rub))}</strong>
  </article>`).join("");

  const work = cases[lang].map((c, i) => `<article class="case panel" id="${c.id}" data-reveal>
    <a class="case-media" href="${esc(c.href)}" target="_blank" rel="noopener" aria-label="${esc(c.name)} — ${l("открыть сайт", "open site")}">
      <div class="browser"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="url">${esc(new URL(c.href).host + new URL(c.href).pathname.replace(/\/$/, ""))}</span>
        <img src="${A + c.image}" width="${c.size[0]}" height="${c.size[1]}" alt="${esc(c.alt)}" loading="lazy" decoding="async"></div>
      <img class="phone" src="${A + c.mobile}" width="390" height="844" alt="" loading="lazy" decoding="async">
    </a>
    <div class="case-body">
      <p class="mono">${String(i + 1).padStart(2, "0")} · ${esc(c.type)}${c.concept ? ` <span class="badge">${l("Демо-данные", "Demo data")}</span>` : ""}</p>
      <h3>${esc(c.name)}</h3>
      <dl><dt>${l("Задача", "Brief")}</dt><dd>${esc(c.task)}</dd><dt>${l("Решение", "Build")}</dt><dd>${esc(c.solution)}</dd><dt>${l("Результат", "Outcome")}</dt><dd>${esc(c.result)}</dd></dl>
      ${c.flow ? `<ol class="flow" aria-label="${l("Как устроено", "How it flows")}">${c.flow.map(f => `<li>${esc(f)}</li>`).join("")}</ol>` : ""}
      ${c.demoNote ? `<p class="note">${esc(c.demoNote)}</p>` : ""}
      <p class="chips">${(c.tags || []).concat(Object.values(c.stack || {}).flat()).filter((v, k, a) => a.indexOf(v) === k).slice(0, 6).map(tag => `<span>${esc(tag)}</span>`).join("")}</p>
      <div class="row"><a class="btn" href="${esc(c.href)}" target="_blank" rel="noopener">${l("Открыть сайт", "Open the site")} <span aria-hidden="true">↗</span></a>
      <a class="btn ghost" href="${old}work/${c.id}/">${l("Подробнее о кейсе", "Case study")}</a></div>
    </div>
  </article>`).join("");

  const steps = t.steps.map(([h, p], i) => `<li data-reveal><span class="num">${String(i + 1).padStart(2, "0")}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join("");

  const watchIntro = l("Ассистент для iPhone и Apple Watch в закрытом бета-тестировании. В режиме «Тихий суфлёр» подсказка появляется на затемнённом экране часов.", "An assistant for iPhone and Apple Watch, currently in closed beta. Silent Prompter displays a suggestion on the dimmed watch face.");
  const lab = products[lang].map(p => `<article class="product panel" data-reveal>
    <span class="product-icon" aria-hidden="true">${icons[productIcon[p.preview]] || icons.spark}</span>
    <p class="mono status">${esc(p.status)}</p><h3>${esc(p.name)}</h3><p>${esc(p.summary)}</p>
    ${p.details ? `<details><summary>${esc(p.details.title)}</summary><p>${esc(p.details.description)}</p>${p.details.roles ? `<ul class="roles">${p.details.roles.map(([r, d]) => `<li><b>${esc(r)}</b> — ${esc(d)}</li>`).join("")}</ul>` : ""}</details>` : ""}
    ${p.links.length ? `<p class="row">${p.links.map(k => `<a class="link" href="${esc(k.href)}" target="_blank" rel="noopener">${esc(k.label)} ↗</a>`).join("")}</p>` : ""}
  </article>`).join("");

  const faq = t.faqs.map(([q, a]) => `<details class="qa"><summary>${esc(q)}<span aria-hidden="true">+</span></summary><p>${esc(a)}</p></details>`).join("");
  const stack = ["Next.js", "TypeScript", "FastAPI", "SwiftUI", "Telegram", "MAX"];

  const sticker = (text, center, cls) => `<div class="sticker ${cls}" aria-hidden="true"><svg viewBox="0 0 200 200"><defs><path id="c-${cls}" d="M100 100m-78 0a78 78 0 1 1 156 0a78 78 0 1 1-156 0"/></defs>
    <circle cx="100" cy="100" r="96" class="ring"/><circle cx="100" cy="100" r="60" class="ring inner"/>
    <text><textPath href="#c-${cls}" startOffset="0">${esc(text)}</textPath></text></svg><b>${esc(center)}</b></div>`;

  const socials = [["Telegram", id.telegram, "telegram"], ["Threads", id.threads, "threads"], ["GitHub", id.github, "github"], [l("Почта", "Email"), "mailto:" + contacts.email, "mail"]];
  const title = `Devlarion — ${t.title}`;
  const html = `<!doctype html>
<html lang="${lang}" data-tint="copper">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(t.intro)}">
<meta name="theme-color" content="#05070f">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(t.intro)}">
<meta property="og:image" content="${A}brand/og-${lang}.jpg">
<link rel="alternate" hreflang="${ru ? "en" : "ru"}" href="${other}">
<link rel="icon" href="${A}brand/favicon.svg" type="image/svg+xml">
<link rel="icon" href="${A}brand/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="${A}brand/apple-touch-icon.png">
<link rel="preload" href="${A}fonts/golos-text-${ru ? "cyrillic" : "latin"}.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${A}style.css">
<script defer src="${A}field.js"></script>
<script defer src="${A}app.js"></script>
</head>
<body>
<a class="skip" href="#main">${l("К содержанию", "Skip to content")}</a>
<canvas class="field" data-field data-icons="${A}icons/" aria-hidden="true"></canvas>
<div class="fx-glow" aria-hidden="true"></div><div class="fx-grain" aria-hidden="true"></div>
<header class="top">
  <a class="brand" href="#top" aria-label="${l("Devlarion — наверх", "Devlarion — top")}"><span class="brand-word" data-text="DEVLARION">DEVLARION</span></a>
  <p class="hint mono">${l("Листайте или жмите", "Scroll or press")} <kbd>↓</kbd> ${l("и", "and")} <kbd>↑</kbd></p>
  <nav class="keys mono" aria-label="${l("Разделы", "Sections")}">${keys}</nav>
</header>
<main id="main">
<section class="hero" id="top" data-scene="mark" data-tint="copper">
  <h1 class="mega" data-tilt><span class="sr">Devlarion — </span><span class="mega-word" data-text="DEVLARION" aria-hidden="true">DEVLARION</span><span class="sr">${esc(t.title)}</span></h1>
  <div class="hero-copy">
    <p class="eyebrow mono">${esc(t.eyebrow)} · ${esc(id.founder[lang])}</p>
    <p class="glow headline">${esc(t.title)}</p>
    <p class="lead">${esc(t.intro)}</p>
    ${command}
    <div class="row cta"><a class="btn primary" href="${tg()}">${esc(t.cta)} <span aria-hidden="true">↗</span></a><a class="btn" href="#work">${esc(t.cases)}</a></div>
  </div>
</section>

<section class="section" id="services" data-scene="kit" data-tint="ice">
  ${sticker(l("САЙТЫ · БОТЫ · ИИ · МИНИ-ПРИЛОЖЕНИЯ · ", "WEBSITES · BOTS · AI · MINI APPS · "), "D/L", "s1")}
  <div class="stage"><div class="sec-head" data-reveal><p class="eyebrow mono">01 · ${esc(t.nav[0])}</p><h2 class="glow">${esc(t.services)}</h2>
    <p class="drive-hint mono"><span class="pulse" aria-hidden="true"></span>${l("Конструктор из того, что мы собираем", "A kit of everything we build")}</p></div></div>
  <div class="panel tabbed" data-reveal>
    ${tabs}
  </div>
  <div class="packs-head" data-reveal><h2 class="glow">${esc(t.fees)}</h2><p>${l("Стартовые пакеты для небольшого бизнеса. Для компаний любого масштаба подберём условия и обсудим скидку — итоговую стоимость пришлём после созвона.", "Starter packages for small businesses. For companies of any size we tailor the terms and discuss any discount; the final quote follows our call.")}</p></div>
  <div class="packs">${packs}</div>
  <p class="center" data-reveal><a class="btn primary" href="${old}#quiz">${esc(t.estimate)} <span aria-hidden="true">↗</span></a></p>
</section>

<section class="section" id="work" data-scene="car" data-tint="wine">
  ${sticker(l("ЗАЯВКИ · CRM · КАБИНЕТЫ · ЗАПУСК · ", "ENQUIRIES · CRM · PORTALS · LAUNCH · "), "02", "s2")}
  <div class="stage"><div class="sec-head" data-reveal><p class="eyebrow mono">02 · ${esc(t.nav[1])}</p><h2 class="glow">${esc(t.work)}</h2>
    <p class="drive-hint mono"><span class="pulse" aria-hidden="true"></span>${l("Машина едет за курсором. Кликните по фону — она распылит искры.", "The car follows your cursor. Click the background to make it spray sparks.")}</p></div></div>
  <div class="cases">${work}</div>
</section>

<section class="section" id="process" data-scene="sphere" data-tint="sage">
  <div class="stage"><div class="sec-head" data-reveal><p class="eyebrow mono">03 · ${l("Процесс", "Process")}</p><h2 class="glow">${esc(t.process)}</h2></div></div>
  <div class="panel wide" data-reveal>
    <p class="lead">${esc(t.bio)}</p>
    <ol class="steps">${steps}</ol>
  </div>
</section>

<section class="section" id="products" data-scene="galaxy" data-tint="copper">
  ${sticker(l("ПРОДУКТЫ DEVLARION · В РАЗРАБОТКЕ · ", "DEVLARION PRODUCTS · IN THE LAB · "), "LAB", "s3")}
  <div class="stage"><div class="sec-head" data-reveal><p class="eyebrow mono">04 · ${l("Продукты", "Products")}</p><h2 class="glow">${esc(t.products)}</h2></div></div>
  <article class="panel aura" data-reveal>
    <div class="aura-copy"><p class="mono status">${l("Закрытая бета", "Closed beta")}</p><h3>AuraWatch</h3><p>${esc(watchIntro)}</p>
      <div class="row"><a class="btn primary" href="${tg(l("Хочу участвовать в закрытой бете AuraWatch.", "I'd like to join the AuraWatch closed beta."))}">${l("Хочу в закрытую бету", "Join the closed beta")} <span aria-hidden="true">↗</span></a>
      <a class="btn ghost" href="${old}aurawatch/">${l("Подробнее", "Learn more")}</a></div></div>
    <div class="watch" role="img" aria-label="${l("Демонстрация экрана AuraWatch", "AuraWatch screen demo")}"><div class="watch-face"><small>AuraWatch</small><b data-type="${esc(l("Какие следующие шаги?|Уточните сроки и бюджет.|Предложите созвон в четверг.", "What are the next steps?|Confirm the timeline and budget.|Suggest a call on Thursday."))}">${l("Какие следующие шаги?", "What are the next steps?")}</b><i></i></div></div>
  </article>
  <div class="products">${lab}</div>
</section>

<section class="section" id="about" data-scene="wave" data-tint="ice">
  <div class="stage short"></div>
  <div class="split">
    <div class="panel" data-reveal>
      <p class="eyebrow mono">05 · ${l("Студия", "Studio")}</p>
      <h2 class="glow">${l("О студии", "About the studio")}</h2>
      <p class="lead">${l("Devlarion разрабатывает сайты, ботов, мобильные приложения и ИИ-сервисы для бизнеса. Ведём проект от аналитики и дизайна до запуска и поддержки. Работаем по договору с ИП. Состав, смету и этапы согласуем до начала работ.", "Devlarion builds websites, bots, mobile apps and AI services for businesses. We cover discovery, design, delivery and support, with the scope, budget and milestones agreed before work begins.")}</p>
      <div class="founder"><span class="avatar" aria-hidden="true"><img src="${A}brand/mark.svg" alt="" width="50" height="52"></span>
        <div><b>${esc(id.founder[lang])}</b><small>${l("Основатель · архитектор и разработчик", "Founder · architect and developer")}</small></div></div>
      <p class="chips">${stack.map(s => `<span>${s}</span>`).join("")}</p>
    </div>
    <div class="panel" data-reveal>
      <h2 class="glow">${esc(t.faq)}</h2>
      <div class="faq">${faq}</div>
    </div>
  </div>
</section>

<section class="section finale" id="contact" data-scene="road" data-tint="red">
  <div class="split" data-reveal>
    <div class="panel">
      <h2 class="glow">${esc(t.estimate)}</h2>
      <p>${l("Выберите тип проекта, масштаб и опции — калькулятор покажет вилку стоимости в рублях, долларах, евро, BYN или KZT.", "Pick the project type, scale and options; the calculator shows a price range in RUB, USD, EUR, BYN or KZT.")}</p>
      <a class="btn" href="${old}#quiz">${l("Открыть калькулятор", "Open the calculator")} <span aria-hidden="true">↗</span></a>
    </div>
    <div class="panel">
      <h2 class="glow">${esc(t.ask)}</h2>
      <p>${esc(t.close)}</p>
      <div class="row"><a class="btn primary" href="${tg()}">${esc(t.cta)} <span aria-hidden="true">↗</span></a><a class="btn ghost" href="mailto:${contacts.email}">${l("Написать на почту", "Send an email")}</a></div>
    </div>
  </div>
  <div class="road-space" aria-hidden="true"></div>
  <footer class="foot">
    <div class="foot-brand"><span class="brand-word" data-text="DEVLARION">DEVLARION</span>
      <div class="social">${socials.map(([label, href, icon]) => `<a href="${esc(href)}" aria-label="${esc(label)}" title="${esc(label)}">${icons[icon]}</a>`).join("")}</div></div>
    <p class="mono fine">© 2026 Devlarion · <a href="${old}">${l("Классическая версия сайта", "Classic site")}</a> · <a href="${old}privacy/">${l("Конфиденциальность", "Privacy")}</a> · <a href="${old}licenses/">${l("Лицензии", "Licences")}</a></p>
  </footer>
</section>
</main>
</body>
</html>
`;
  const out = new URL(ru ? "docs/index.html" : "docs/en/index.html", root);
  await mkdir(new URL(".", out), { recursive: true });
  await writeFile(out, html);
  console.log("wrote", out.pathname);
}
