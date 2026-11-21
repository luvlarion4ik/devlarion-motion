// Курсы Банка России: https://www.cbr.ru/scripts/XML_daily.asp → docs/assets/rates.json
// Запуск: npm run rates. GitHub Action вызывает его каждый день.
import { writeFile } from "node:fs/promises";

const res = await fetch("https://www.cbr.ru/scripts/XML_daily.asp", { headers: { "user-agent": "devlarion-site-rates" } });
if (!res.ok) throw new Error("CBR responded " + res.status);
const xml = new TextDecoder("windows-1251").decode(await res.arrayBuffer());
const [, d, m, y] = xml.match(/Date="(\d{2})\.(\d{2})\.(\d{4})"/) ?? [];
if (!y) throw new Error("No date in CBR response");
const rates = {}, names = {};
for (const [, body] of xml.matchAll(/<Valute[^>]*>([\s\S]*?)<\/Valute>/g)) {
  const tag = name => body.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1];
  const code = tag("CharCode"), nominal = Number(tag("Nominal")), value = Number(tag("Value")?.replace(",", "."));
  if (!code || !(nominal > 0) || !(value > 0)) continue;
  rates[code] = Number((value / nominal).toFixed(6)); // рублей за 1 единицу валюты
  names[code] = tag("Name");
}
if (!rates.USD || !rates.EUR) throw new Error("USD/EUR missing in CBR response");
const out = { source: "cbr.ru", date: `${y}-${m}-${d}`, rates, names };
await writeFile(new URL("../docs/assets/rates.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log("CBR rates", out.date, Object.keys(rates).length, "currencies, USD", rates.USD);
