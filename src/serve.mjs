// Локальный просмотр: node src/serve.mjs → http://127.0.0.1:4180
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
const dir = new URL("../docs/", import.meta.url);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8" };
const port = Number(process.env.PORT || 4180);
createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "");
  if (path.includes("..")) { res.writeHead(400).end(); return; }
  if (path === "" || path.endsWith("/")) path += "index.html";
  try {
    const body = await readFile(new URL(path, dir));
    res.writeHead(200, { "content-type": types[extname(path)] || "application/octet-stream" }).end(body);
  } catch {
    console.log("404", path);
    res.writeHead(404, { "content-type": "text/plain" }).end("not found");
  }
}).listen(port, "127.0.0.1", () => console.log("http://127.0.0.1:" + port));
