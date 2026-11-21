/* Интерфейс Devlarion Motion: цвет бренда по секциям, клавиатурная навигация, вкладки услуг,
   анимированные иконки, появление блоков, стикеры, блики за курсором, выбор канала связи. */
(() => {
  const root = document.documentElement;
  root.classList.add("js");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // Иконки рисуются штрихом: нормализуем длину каждого контура.
  for (const shape of $$(".ai-icon :is(path, rect, circle, ellipse, line, polyline, polygon)")) shape.setAttribute("pathLength", "1");

  // ---------- секции: цвет, активный пункт, прокрутка ----------
  const sections = $$("main > section");
  const keyLinks = $$(".keys a[href^='#']");
  const stickers = $$(".sticker");
  let ticking = false;
  function onScroll() {
    ticking = false;
    root.classList.toggle("scrolled", scrollY > 12);
    const mid = innerHeight * 0.5;
    let current = sections[0];
    for (const s of sections) if (s.getBoundingClientRect().top <= mid) current = s;
    if (current.dataset.tint && root.dataset.tint !== current.dataset.tint) root.dataset.tint = current.dataset.tint;
    for (const a of keyLinks) a.classList.toggle("is-on", a.getAttribute("href") === "#" + current.id);
    if (!reduced) for (const st of stickers) st.style.setProperty("--spin", (scrollY * 0.12).toFixed(1) + "deg");
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // ---------- клавиатура ----------
  const jump = dir => {
    const mid = innerHeight * 0.5;
    let idx = 0;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top <= mid) idx = i; });
    const next = sections[Math.max(0, Math.min(sections.length - 1, idx + dir))];
    next.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  };
  addEventListener("keydown", e => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
    if (e.target.closest("input, textarea, select, [contenteditable], [role=tablist], [role=listbox]")) return;
    const key = e.key.toLowerCase();
    const code = e.code;
    if (key === "arrowdown" || code === "KeyJ") { e.preventDefault(); jump(1); return; }
    if (key === "arrowup" || code === "KeyK") { e.preventDefault(); jump(-1); return; }
    const byKey = k => document.querySelector(`[data-key="${k}"]`);
    let link = null;
    if (/^(Digit|Numpad)[1-9]$/.test(code)) link = byKey(code.slice(-1));
    else if (code === "KeyT") link = byKey("t");
    else if (code === "KeyL") link = byKey("l");
    if (link) { e.preventDefault(); link.click(); }
  });

  // ---------- вкладки услуг ----------
  const tablist = document.querySelector("[role=tablist]");
  if (tablist) {
    const tabs = $$("[role=tab]", tablist);
    const select = (tab, focus = false) => {
      for (const t of tabs) {
        const on = t === tab;
        t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        panel.hidden = !on;
        if (on) { const icon = panel.querySelector(".tp-icon"); icon.classList.remove("draw"); void icon.offsetWidth; icon.classList.add("draw"); }
      }
      if (focus) tab.focus();
      tab.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduced ? "auto" : "smooth" });
    };
    tablist.addEventListener("click", e => { const t = e.target.closest("[role=tab]"); if (t) select(t); });
    tablist.addEventListener("keydown", e => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const map = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in map)) return;
      e.preventDefault();
      select(tabs[(map[e.key] + tabs.length) % tabs.length], true);
    });
    // авто-перелистывание, пока пользователь не тронул вкладки
    let auto = !reduced, timer;
    const stop = () => { auto = false; clearInterval(timer); };
    tablist.parentElement.addEventListener("pointerenter", stop, { once: true });
    tablist.addEventListener("focusin", stop, { once: true });
    if (auto) timer = setInterval(() => {
      const r = tablist.getBoundingClientRect();
      if (r.top > innerHeight || r.bottom < 0) return;
      const i = tabs.findIndex(t => t.getAttribute("aria-selected") === "true");
      select(tabs[(i + 1) % tabs.length]);
    }, 4200);
  }

  // ---------- появление и прорисовка иконок ----------
  const reveal = $$("[data-reveal]");
  for (const el of reveal) {
    const sib = [...el.parentElement.children].filter(c => c.hasAttribute("data-reveal"));
    el.style.setProperty("--i", Math.min(sib.indexOf(el), 4));
  }
  const drawTargets = $$(".tp-icon, .pack-icon");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    reveal.forEach(el => io.observe(el));
    const io2 = new IntersectionObserver(entries => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        en.target.classList.remove("draw"); void en.target.offsetWidth; en.target.classList.add("draw");
      }
    }, { threshold: 0.6 });
    drawTargets.forEach(el => io2.observe(el));
  } else reveal.forEach(el => el.classList.add("in"));
  for (const el of drawTargets) el.closest(".pack, .product, .panel")?.addEventListener("pointerenter", () => { el.classList.remove("draw"); void el.offsetWidth; el.classList.add("draw"); });

  // ---------- блики и наклоны за курсором ----------
  if (fine && !reduced) {
    for (const card of $$(".panel, .pack, .product")) card.addEventListener("pointermove", e => {
      const b = card.getBoundingClientRect();
      card.style.setProperty("--gx", e.clientX - b.left + "px"); card.style.setProperty("--gy", e.clientY - b.top + "px");
    });
    for (const m of $$(".case-stage")) {
      m.addEventListener("pointermove", e => {
        const b = m.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
        m.style.setProperty("--ty", (x * 5).toFixed(2) + "deg"); m.style.setProperty("--tx", (-y * 4).toFixed(2) + "deg");
      });
      m.addEventListener("pointerleave", () => { m.style.setProperty("--ty", "0deg"); m.style.setProperty("--tx", "0deg"); });
    }
    const mega = document.querySelector(".mega-word"), glow = document.querySelector(".fx-glow");
    addEventListener("pointermove", e => {
      const x = e.clientX / innerWidth, y = e.clientY / innerHeight;
      glow?.style.setProperty("--mx", (x * 100).toFixed(1) + "%"); glow?.style.setProperty("--my", (y * 100).toFixed(1) + "%");
      if (mega && scrollY < innerHeight) { mega.style.setProperty("--ry", ((x - 0.5) * 14).toFixed(2) + "deg"); mega.style.setProperty("--rx", ((0.5 - y) * 10).toFixed(2) + "deg"); }
    }, { passive: true });
  }

  // ---------- командная строка: выбор канала и копирование ----------
  const cmd = document.querySelector("[data-command]");
  if (cmd) {
    const toggle = cmd.querySelector("[data-cmd-toggle]"), list = cmd.querySelector(".cmd-list");
    const items = $$("li", list);
    const open = state => { list.hidden = !state; toggle.setAttribute("aria-expanded", state); if (state) (items.find(i => i.getAttribute("aria-selected") === "true") || items[0]).focus(); };
    const choose = li => {
      for (const i of items) i.setAttribute("aria-selected", i === li);
      cmd.querySelector("[data-cmd-label]").textContent = li.dataset.label;
      cmd.querySelector("[data-cmd-icon]").innerHTML = li.querySelector("svg").outerHTML;
      cmd.querySelector("[data-cmd-text]").textContent = li.dataset.text;
      cmd.querySelector("[data-cmd-link]").href = li.dataset.href;
      open(false); toggle.focus();
    };
    toggle.addEventListener("click", () => open(list.hidden));
    list.addEventListener("click", e => { const li = e.target.closest("li"); if (li) choose(li); });
    list.addEventListener("keydown", e => {
      const i = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (i >= 0) choose(items[i]); }
      else if (e.key === "Escape") { open(false); toggle.focus(); }
    });
    document.addEventListener("click", e => { if (!cmd.contains(e.target)) open(false); });
    const copyBtn = cmd.querySelector("[data-copy]");
    copyBtn.addEventListener("click", async () => {
      const text = cmd.querySelector("[data-cmd-link]").href.replace(/^mailto:/, "");
      try { await navigator.clipboard.writeText(text); } catch { /* буфер недоступен — просто показываем отметку */ }
      copyBtn.classList.add("copied"); setTimeout(() => copyBtn.classList.remove("copied"), 1600);
    });
  }

  // ---------- часы AuraWatch печатают подсказки ----------
  const typer = document.querySelector("[data-type]");
  if (typer && !reduced) {
    const lines = typer.dataset.type.split("|");
    let li = 0;
    const type = async () => {
      const text = lines[li % lines.length]; li++;
      for (let n = typer.textContent.length; n >= 0; n--) { typer.textContent = typer.textContent.slice(0, n); await new Promise(r => setTimeout(r, 18)); }
      for (let n = 1; n <= text.length; n++) { typer.textContent = text.slice(0, n); await new Promise(r => setTimeout(r, 45)); }
      setTimeout(type, 2600);
    };
    setTimeout(type, 2600);
  }

  // ---------- всплывающее сообщение и «Поделиться» ----------
  const toastEl = document.querySelector("[data-toast]");
  let toastTimer;
  const toast = text => {
    if (!toastEl) return;
    toastEl.textContent = text; toastEl.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
  };
  const ru = root.lang === "ru";
  const share = async (url, title) => {
    if (navigator.share) { try { await navigator.share({ url, title }); return; } catch (err) { if (err.name === "AbortError") return; } }
    try { await navigator.clipboard.writeText(url); toast(ru ? "Ссылка скопирована" : "Link copied"); }
    catch { toast(url); }
  };
  document.addEventListener("click", e => {
    if (e.target.closest("[data-share-page]")) share(location.href.split("#")[0], document.title);
    const quizShare = e.target.closest("[data-estimate] [data-share]");
    if (quizShare) share(quizShare.dataset.shareUrl || location.href, document.title);
    const menuLink = e.target.closest(".menu nav a");
    if (menuLink) menuLink.closest(".menu").open = false;
  });

  // ---------- знак Devlarion ----------
  // play — полное появление (контур → заливка → вырез L → блик), shine — только мягкий блик.
  const restart = (el, cls) => { el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls); };
  if (!reduced) {
    const headerMark = document.querySelector(".brand .dl-mark");
    if (headerMark) setTimeout(() => restart(headerMark, "play"), 300);
    // наведение (или касание) на логотип в шапке и подвале — полное проигрывание знака
    for (const host of $$(".brand, .foot-brand, .founder")) {
      const m = host.querySelector(".dl-mark");
      if (!m) continue;
      host.addEventListener("pointerenter", () => restart(m, "play"));
      host.addEventListener("focusin", () => restart(m, "play"));
    }
  }

  // ---------- «О студии»: знак собирается по мере прокрутки, текст раскрывается по строчкам ----------
  // 0–30% — прорисовывается контур, 30–55% — заливка, 55–75% — вырез L, дальше — финальный блик и карточка основателя.
  const story = document.querySelector("[data-story]");
  if (story) {
    const svg = story.querySelector(".story-svg");
    const lines = $$(".story-lines li", story);
    const end = story.querySelector(".story-end");
    const clamp = v => Math.min(Math.max(v, 0), 1);
    let shone = false;
    const update = () => {
      const r = story.getBoundingClientRect();
      const p = reduced ? 1 : clamp(-r.top / Math.max(r.height - innerHeight, 1));
      svg.style.setProperty("--p1", clamp(p / 0.3).toFixed(3));
      svg.style.setProperty("--p2", clamp((p - 0.3) / 0.25).toFixed(3));
      svg.style.setProperty("--p3", clamp((p - 0.55) / 0.2).toFixed(3));
      svg.style.setProperty("--p4", clamp((p - 0.78) / 0.1).toFixed(3));
      lines.forEach((li, k) => li.classList.toggle("on", p >= [0.02, 0.3, 0.55, 0.75][k]));
      end.classList.toggle("on", p >= 0.82);
      if (p >= 0.82 && !shone && !reduced) { shone = true; restart(svg, "shine"); }
      if (p < 0.6) shone = false;
    };
    addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
    addEventListener("resize", update);
    update();
    // наведение или касание собранного знака — полное проигрывание анимации
    const mark = story.querySelector("[data-logo-hover]");
    mark?.addEventListener("pointerenter", () => restart(svg, "play"));
    mark?.addEventListener("click", () => restart(svg, "play"));
  }
})();
