/* Валюта цен по курсу Банка России.
   Базовые цены хранятся в рублях (data-rub). Курсы: assets/rates.json (обновляется GitHub Action
   из официального XML ЦБ). Если файлу больше полутора суток, браузер подтягивает свежие курсы ЦБ
   через зеркало cbr-xml-daily.ru. Выбор сохраняется в localStorage и передаётся калькулятору
   через window.devlarionRegion и событие devlarion:regionchange. */
(() => {
  const control = document.querySelector("[data-currency]");
  const ru = document.documentElement.lang === "ru";
  const t = (a, b) => (ru ? a : b);
  const locale = t("ru-RU", "en-US");
  const KEY = "devlarion-motion-currency";
  const quick = ["RUB", "USD", "EUR", "CNY", "BYN", "KZT"];
  let data = { date: null, rates: {}, names: {} };
  let current = null;
  let names;
  try { names = new Intl.DisplayNames([locale], { type: "currency" }); } catch { names = null; }
  const nameOf = code => code === "RUB" ? t("Российский рубль", "Russian ruble") : (names?.of(code) || data.names[code] || code);
  const dateText = iso => iso ? new Intl.DateTimeFormat(t("ru-RU", "en-GB"), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso + "T00:00:00Z")) : "";

  function format(rub, code, prefix) {
    const perUnit = code === "RUB" ? 1 : data.rates[code];
    if (!perUnit) return null;
    const amount = rub / perUnit;
    const digits = amount < 100 ? 1 : 0;
    let text;
    try { text = new Intl.NumberFormat(locale, { style: "currency", currency: code, maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(amount); }
    catch { text = Math.round(amount).toLocaleString(locale) + " " + code; }
    const approx = code === "RUB" ? "" : "≈ ";
    return (prefix ? prefix + " " : "") + approx + text;
  }

  function apply(code, save = true) {
    if (code !== "RUB" && !data.rates[code]) code = "RUB";
    current = code;
    if (save) try { localStorage.setItem(KEY, code); } catch { /* приватный режим */ }
    for (const node of document.querySelectorAll("[data-rub]")) {
      const text = format(Number(node.dataset.rub), code, node.dataset.prefix || "");
      if (text) node.textContent = text;
    }
    for (const note of document.querySelectorAll("[data-rate-note]")) {
      note.textContent = code === "RUB" ? t("Цены в рублях. Итог фиксируем в договоре.", "Prices in rubles. The final amount is fixed in the contract.")
        : t(`Пересчёт по курсу Банка России на ${dateText(data.date)}: 1 ${code} = ${data.rates[code].toLocaleString("ru-RU")} ₽. Валюту счёта согласуем в договоре.`,
            `Converted at the Bank of Russia rate for ${dateText(data.date)}: 1 ${code} = RUB ${data.rates[code].toLocaleString("en-US")}. The billing currency is agreed in the contract.`);
    }
    if (control) {
      control.querySelector("[data-currency-label]").textContent = code;
      for (const b of control.querySelectorAll("[data-code]")) b.setAttribute("aria-pressed", b.dataset.code === code);
    }
    window.devlarionRegion = { code: code.toLowerCase(), currency: code, rate: code === "RUB" ? 1 : 1 / data.rates[code], date: data.date, source: t("Банка России", "the Bank of Russia") };
    document.dispatchEvent(new CustomEvent("devlarion:regionchange", { detail: window.devlarionRegion }));
  }

  function renderList(filter = "") {
    if (!control) return;
    const list = control.querySelector("[data-currency-list]");
    const q = filter.trim().toLowerCase();
    const codes = ["RUB", ...Object.keys(data.rates).sort()].filter(c => !q || c.toLowerCase().includes(q) || nameOf(c).toLowerCase().includes(q));
    list.replaceChildren(...codes.map(code => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button"; b.dataset.code = code; b.setAttribute("aria-pressed", code === current);
      b.innerHTML = `<b>${code}</b><span></span>`;
      b.querySelector("span").textContent = nameOf(code);
      li.append(b);
      return li;
    }));
    control.querySelector("[data-currency-empty]").hidden = codes.length > 0;
  }

  async function load() {
    const url = control?.dataset.rates || document.querySelector("[data-rates-url]")?.dataset.ratesUrl;
    try { if (url) data = await (await fetch(url, { cache: "no-cache" })).json(); } catch { /* остаёмся на рублях */ }
    const age = data.date ? Date.now() - Date.parse(data.date + "T00:00:00Z") : Infinity;
    if (age > 36 * 3600e3) {
      try {
        const live = await (await fetch("https://www.cbr-xml-daily.ru/daily_json.js", { cache: "no-cache" })).json();
        const rates = {}, nm = {};
        for (const [code, v] of Object.entries(live.Valute || {})) { rates[code] = v.Value / v.Nominal; nm[code] = v.Name; }
        if (rates.USD) data = { date: String(live.Date).slice(0, 10), rates, names: nm, source: "cbr-xml-daily.ru" };
      } catch { /* сеть недоступна — используем сохранённые курсы */ }
    }
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch { saved = null; }
    const param = new URLSearchParams(location.search).get("currency")?.toUpperCase();
    apply(param || saved || t("RUB", "USD"), Boolean(param));
    renderList();
  }

  if (control) {
    const details = control.querySelector("details");
    control.addEventListener("click", e => {
      const b = e.target.closest("[data-code]");
      if (!b) return;
      apply(b.dataset.code);
      renderList(control.querySelector("[data-currency-search]").value);
      details.open = false;
    });
    control.querySelector("[data-currency-search]").addEventListener("input", e => renderList(e.target.value));
    details.addEventListener("toggle", () => { if (details.open) control.querySelector("[data-currency-search]").focus({ preventScroll: true }); });
    document.addEventListener("click", e => { if (!control.contains(e.target)) details.open = false; });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && details.open) { details.open = false; control.querySelector("summary").focus(); } });
    control.querySelector("[data-currency-quick]").innerHTML = quick.map(c => `<button type="button" data-code="${c}">${c}</button>`).join("");
  }
  load();
})();
