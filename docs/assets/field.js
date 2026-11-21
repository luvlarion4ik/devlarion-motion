/* Devlarion Field — фоновое облако частиц на чистом WebGL.
   Каждая секция страницы с атрибутом data-scene задаёт сцену: знак D, «литник» с иконками услуг,
   седан на подиуме, экраны проектов, сфера процесса, галактика продуктов, волна и дорога в финале.
   При смене секции точки перелетают из одной фигуры в другую. На подиуме седан поворачивается за курсором,
   на дороге перестраивается влево-вправо и пускает искры; клик по фону даёт залп. */
(() => {
  const canvas = document.querySelector("[data-field]");
  if (!canvas) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gl = canvas.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance" });
  if (!gl) { document.documentElement.classList.add("no-webgl"); return; }

  const small = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
  const N = small ? 11000 : 26000;
  const SPRAY = small ? 900 : 2600;
  const TAU = Math.PI * 2;

  // ---------- палитра ----------
  const C = {
    blue: [0.36, 0.52, 0.95], ice: [0.72, 0.84, 1.0], dim: [0.16, 0.24, 0.48],
    copper: [0.95, 0.6, 0.42], wine: [0.78, 0.22, 0.36], red: [1.0, 0.22, 0.28],
    white: [1, 1, 1], sage: [0.45, 0.85, 0.55], glass: [0.22, 0.34, 0.7],
  };
  const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const pick = arr => arr[(Math.random() * arr.length) | 0];
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  // ---------- сборщик сцены ----------
  function builder(n) {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), flag = new Float32Array(n);
    let i = 0;
    const put = (x, y, z, c, f = 0) => {
      if (i >= n) return false;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      flag[i] = f; i++;
      return true;
    };
    const count = () => i;
    const done = () => { while (i < n) put(rnd(-30, 30), rnd(-12, 18), rnd(-40, -10), C.dim, 0); return { pos, col, flag }; };
    return { put, count, done };
  }

  // Растеризуем 2D-рисунок и возвращаем координаты закрашенных и краевых пикселей.
  function raster(w, h, draw) {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    draw(ctx);
    const data = ctx.getImageData(0, 0, w, h).data;
    const fill = [], edge = [];
    const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 110;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!on(x, y)) continue;
      const p = [x / w - 0.5, 0.5 - y / h];
      fill.push(p);
      if (!on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1)) edge.push(p);
    }
    if (!fill.length) fill.push([0, 0]);
    if (!edge.length) edge.push(fill[0]);
    return { fill, edge, aspect: w / h };
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ---------- сцена: знак Devlarion с орбитами ----------
  function sceneMark() {
    const b = builder(N);
    const mark = new Path2D("M8 6h20c18 0 30 10 30 26S46 58 28 58H8V6ZM20 16h9v23h13v9H20V16Z");
    const r = raster(260, 270, ctx => { ctx.translate(5, 5); ctx.scale(5, 5); ctx.translate(-8, -6); ctx.fill(mark, "evenodd"); });
    const S = 7.2, depth = 0.55;
    while (b.count() < N * 0.62) {
      const edge = Math.random() < 0.55;
      const [x, y] = pick(edge ? r.edge : r.fill);
      const z = edge ? rnd(-depth, depth) : pick([-depth, depth]) + gauss() * 0.04;
      const c = edge ? (Math.random() < 0.18 ? C.copper : C.ice) : mixc(C.blue, C.ice, Math.random() * 0.4);
      b.put(x * S + gauss() * 0.02, y * S + gauss() * 0.02 + 0.4, z, c, 3);
    }
    const rings = [[5.4, 0.35, C.blue], [6.8, -0.25, C.copper], [8.6, 0.15, C.dim]];
    while (b.count() < N * 0.94) {
      const [R, tilt, c] = pick(rings);
      const a = rnd(0, TAU), rr = R + gauss() * 0.05;
      const x = Math.cos(a) * rr, z0 = Math.sin(a) * rr;
      b.put(x, z0 * Math.sin(tilt) + 0.4, z0 * Math.cos(tilt), Math.random() < 0.06 ? C.white : c, 3);
    }
    while (b.count() < N) b.put(rnd(-22, 22), rnd(-12, 14), rnd(-30, -6), C.dim, 3);
    return b.done();
  }

  // ---------- сцена: «литник» конструктора с иконками услуг ----------
  let icons = [];
  function sceneKit() {
    const b = builder(N);
    const W = 1100, H = 600;
    const r = raster(W, H, ctx => {
      ctx.strokeStyle = "#fff"; ctx.fillStyle = "#fff"; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.lineWidth = 14; roundRect(ctx, 22, 22, W - 44, H - 44, 38); ctx.stroke();
      ctx.lineWidth = 8;
      const cols = 5, rows = 2, cw = (W - 44) / cols, rh = (H - 44) / rows;
      ctx.beginPath(); ctx.moveTo(22, 22 + rh); ctx.lineTo(W - 22, 22 + rh); ctx.stroke();
      for (let c = 1; c < cols; c++) { ctx.beginPath(); ctx.moveTo(22 + c * cw, 22); ctx.lineTo(22 + c * cw, H - 22); ctx.stroke(); }
      for (let k = 0; k < cols * rows; k++) {
        const cx = 22 + (k % cols + 0.5) * cw, cy = 22 + (((k / cols) | 0) + 0.5) * rh;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(cx, cy - 82); ctx.lineTo(cx, cy - rh / 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 82, cy); ctx.lineTo(cx + cw / 2, cy); ctx.stroke();
        const img = icons[k % Math.max(icons.length, 1)];
        if (img) ctx.drawImage(img, cx - 80, cy - 80, 160, 160);
        else { ctx.lineWidth = 8; roundRect(ctx, cx - 55, cy - 55, 110, 110, 22); ctx.stroke(); }
      }
    });
    const SX = 17, SY = SX / r.aspect;
    const ry = 0.32, rx = -0.95;
    const cyr = Math.cos(ry), syr = Math.sin(ry), cxr = Math.cos(rx), sxr = Math.sin(rx);
    while (b.count() < N * 0.9) {
      const [u, v] = pick(r.fill);
      const x = u * SX, y = v * SY, z = pick([-0.14, 0.14]) + gauss() * 0.05;
      const y1 = y * cxr - z * sxr, z1 = y * sxr + z * cxr;
      const x2 = x * cyr + z1 * syr, z2 = -x * syr + z1 * cyr;
      const frame = Math.abs(u) > 0.47 || Math.abs(v) > 0.44;
      const c = frame ? C.blue : (Math.random() < 0.12 ? C.copper : C.ice);
      b.put(x2, y1 - 0.6, z2, c, 5);
    }
    while (b.count() < N) b.put(rnd(-24, 24), rnd(-10, 14), rnd(-34, -8), C.dim, 5);
    return b.done();
  }

  // ---------- седан представительского класса из точек (вперёд = −z, длина ≈ 5.3) ----------
  const lerp1 = (pts, z) => {
    if (z <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (z <= pts[i][0]) {
      const [z0, y0] = pts[i - 1], [z1, y1] = pts[i], k = (z - z0) / (z1 - z0);
      return y0 + (y1 - y0) * (k * k * (3 - 2 * k));
    }
    return pts[pts.length - 1][1];
  };
  const TOP = [[-2.66, 0.6], [-2.58, 0.72], [-2.25, 0.79], [-1.2, 0.86], [-0.95, 0.9], [-0.2, 1.38], [0.35, 1.44], [0.95, 1.39], [1.75, 1.0], [2.42, 0.97], [2.6, 0.9], [2.68, 0.66]];
  const BOTTOM = [[-2.68, 0.44], [-2.3, 0.3], [2.3, 0.3], [2.68, 0.46]];
  const BELT = 0.95, WHEELS = [-1.62, 1.56], WR = 0.37;
  const halfW = z => 0.96 * (1 - 0.2 * Math.max(0, Math.min(1, (Math.abs(z) - 1.9) / 0.78)) ** 2);
  const sideW = (z, y) => {
    const top = lerp1(TOP, z), w = halfW(z);
    if (y <= BELT) return w * (1 - 0.06 * Math.max(0, (0.5 - y) / 0.25));
    return w * (1 - 0.26 * Math.min(1, (y - BELT) / Math.max(top - BELT, 0.05)));
  };
  const inArch = (z, y) => WHEELS.some(wz => Math.hypot(z - wz, y - WR) < WR + 0.09);
  function putCar(b, n, flag) {
    const end = b.count() + n;
    const surfEnd = b.count() + n * 0.5, lineEnd = b.count() + n * 0.8;
    const paint = () => mixc(C.blue, C.ice, 0.3 + Math.random() * 0.5);
    // поверхность кузова
    while (b.count() < surfEnd) {
      const z = rnd(-2.66, 2.66), top = lerp1(TOP, z), bot = lerp1(BOTTOM, z);
      const th = rnd(0, TAU), c = Math.cos(th), s = Math.sin(th);
      const ey = Math.sign(s) * Math.pow(Math.abs(s), 0.35);
      const y = (bot + top) / 2 + (top - bot) / 2 * ey;
      const ex = Math.sign(c) * Math.pow(Math.abs(c), 0.35);
      const x = ex * sideW(z, y);
      if (Math.abs(ex) > 0.7 && inArch(z, y)) continue;
      const glass = y > BELT + 0.05 && y < top - 0.05 && z > -0.9 && z < 1.7;
      if (glass) { if (Math.random() < 0.6) continue; b.put(x, y, z, C.glass, flag); continue; }
      b.put(x, y, z, paint(), flag);
    }
    // характерные линии: пояс, окна, крыша, пороги, арки, оптика
    const lines = [];
    const line = (w, fn) => lines.push([w, fn]);
    line(3, () => { const z = rnd(-2.5, 2.5), sd = pick([-1, 1]); return [sd * halfW(z) * 0.995, BELT, z, C.copper]; });
    line(3, () => { // рамка бокового окна
      const sd = pick([-1, 1]), k = Math.random();
      let z, y;
      if (k < 0.5) { z = rnd(-0.82, 1.62); y = lerp1(TOP, z) - 0.07; }
      else if (k < 0.8) { z = rnd(-0.82, 1.62); y = BELT + 0.04; }
      else { z = pick([-0.82, 0.35, 1.62]) + gauss() * 0.01; y = rnd(BELT + 0.04, lerp1(TOP, z) - 0.07); }
      return [sd * sideW(z, y), y, z, C.ice];
    });
    line(2, () => { const z = rnd(-0.2, 1.0), sd = pick([-1, 1]); const y = lerp1(TOP, z); return [sd * sideW(z, y - 0.01) * 0.98, y, z, C.ice]; });
    line(1.5, () => { const z = rnd(-1.2, 1.15), sd = pick([-1, 1]); return [sd * halfW(z) * 0.96, 0.36, z, C.blue]; });
    line(2.5, () => { // арки колёс
      const wz = pick(WHEELS), a = rnd(-0.1, Math.PI + 0.1), sd = pick([-1, 1]);
      const z = wz + Math.cos(a) * (WR + 0.1), y = WR + Math.sin(a) * (WR + 0.1);
      return [sd * sideW(z, y), y, z, C.ice];
    });
    line(1.6, () => { const sd = pick([-1, 1]), x = sd * rnd(0.45, 0.9); return [x, 0.71 + gauss() * 0.012, -2.56 - (0.9 - Math.abs(x)) * 0.05, [1.6, 1.6, 1.7]]; }); // фары
    line(1.4, () => { const x = rnd(-0.34, 0.34), k = Math.random() < 0.5; return [k ? Math.round(x * 14) / 14 : x, k ? rnd(0.44, 0.66) : pick([0.44, 0.66]), -2.66, C.ice]; }); // решётка
    line(2, () => [rnd(-0.92, 0.92), 0.86 + gauss() * 0.012, 2.63, [1.9, 0.3, 0.35]]); // сплошная полоса фонарей
    line(0.8, () => [rnd(-0.6, 0.6), pick([0.5, 0.55]), 2.68, C.ice]);
    const total = lines.reduce((sum, [w]) => sum + w, 0);
    while (b.count() < lineEnd) {
      let r = Math.random() * total, fn = lines[0][1];
      for (const [w, f] of lines) { r -= w; if (r <= 0) { fn = f; break; } }
      const [x, y, z, col] = fn();
      b.put(x + gauss() * 0.008, y + gauss() * 0.008, z, col, flag);
    }
    // колёса: шина, диск с десятью спицами, тормоз
    while (b.count() < end) {
      const sd = pick([-1, 1]), wz = pick(WHEELS), a = rnd(0, TAU);
      const cx = sd * 0.86, k = Math.random();
      if (k < 0.4) b.put(cx + rnd(-0.13, 0.13), WR + Math.cos(a) * WR, wz + Math.sin(a) * WR, C.dim, flag);
      else if (k < 0.75) {
        const spoke = Math.round(a / (TAU / 10)) * (TAU / 10), rr = rnd(0.06, WR * 0.78);
        b.put(cx + sd * 0.12, WR + Math.cos(spoke) * rr, wz + Math.sin(spoke) * rr, C.ice, flag);
      } else {
        const rr = WR * pick([0.8, 0.82, 0.3]);
        b.put(cx + sd * 0.12, WR + Math.cos(a) * rr, wz + Math.sin(a) * rr, k < 0.9 ? C.copper : C.ice, flag);
      }
    }
  }

  // ---------- шоурум: седан на поворотном подиуме ----------
  function sceneCar() {
    const b = builder(N);
    putCar(b, N * 0.62, 1);
    while (b.count() < N * 0.72) { // кольцо подиума
      const a = rnd(0, TAU), r = pick([3.4, 3.55]) + gauss() * 0.02;
      b.put(Math.cos(a) * r, 0.02, Math.sin(a) * r, Math.random() < 0.3 ? C.copper : C.blue, 0);
    }
    while (b.count() < N * 0.98) { // пол-сетка
      const r = 3.8 + Math.sqrt(Math.random()) * 10, a = rnd(0, TAU);
      let x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.random() < 0.7) { x = Math.round(x * 2) / 2; z = Math.round(z * 2) / 2; }
      b.put(x, 0, z, mixc(C.dim, C.blue, Math.max(0, 1 - r / 14) * 0.5), 0);
    }
    return b.done();
  }

  // ---------- экраны проектов: окна браузера в глубине ----------
  function sceneScreens() {
    const b = builder(N);
    const wins = [];
    for (let i = 0; i < 11; i++) wins.push({ x: rnd(-11, 11), y: rnd(-4.5, 5.5), z: rnd(-16, -3), w: rnd(2.6, 4.2), r: rnd(-0.5, 0.5), mob: Math.random() < 0.3 });
    while (b.count() < N * 0.92) {
      const win = pick(wins);
      const w = win.mob ? win.w * 0.38 : win.w, h = win.mob ? win.w * 0.8 : win.w * 0.62;
      const k = Math.random();
      let u, v, col = C.ice;
      if (k < 0.45) { // рамка
        const p = rnd(0, 2 * (w + h));
        if (p < w) { u = p; v = 0; } else if (p < w + h) { u = w; v = p - w; } else if (p < 2 * w + h) { u = p - w - h; v = h; } else { u = 0; v = p - 2 * w - h; }
      } else if (k < 0.55) { u = rnd(0, w); v = h * 0.12; col = C.blue; }
      else if (k < 0.8) { u = rnd(w * 0.08, w * (0.4 + Math.random() * 0.5)); v = h * pick([0.3, 0.42, 0.54]); col = C.blue; }
      else { u = rnd(w * 0.08, w * 0.45); v = rnd(h * 0.62, h * 0.88); col = Math.random() < 0.5 ? C.copper : C.blue; }
      const lx = u - w / 2, ly = h / 2 - v, c = Math.cos(win.r), s = Math.sin(win.r);
      b.put(win.x + lx * c, win.y + ly, win.z - lx * s, col, 5);
    }
    while (b.count() < N) b.put(rnd(-24, 24), rnd(-10, 14), rnd(-34, -8), C.dim, 5);
    return b.done();
  }

  function sceneSphere() {
    const b = builder(N);
    const n1 = Math.floor(N * 0.66), R = 4.3, g = Math.PI * (3 - Math.sqrt(5));
    for (let k = 0; k < n1; k++) {
      const y = 1 - (k / (n1 - 1)) * 2, r = Math.sqrt(1 - y * y), a = g * k;
      const shell = R + gauss() * 0.06;
      b.put(Math.cos(a) * r * shell, y * shell, Math.sin(a) * r * shell, mixc(C.blue, C.ice, (y + 1) / 2 * 0.7), 3);
    }
    const rings = [-0.66, -0.33, 0, 0.33, 0.66];
    while (b.count() < N * 0.95) {
      const lat = pick(rings), a = rnd(0, TAU), rr = 5.6 * Math.sqrt(1 - lat * lat * 0.6);
      b.put(Math.cos(a) * rr, lat * 5.6 * 0.8, Math.sin(a) * rr, Math.random() < 0.2 ? C.white : C.copper, 3);
    }
    while (b.count() < N) b.put(rnd(-22, 22), rnd(-12, 14), rnd(-30, -8), C.dim, 3);
    return b.done();
  }

  function sceneGalaxy() {
    const b = builder(N);
    const arms = 4;
    while (b.count() < N) {
      const r = Math.pow(Math.random(), 0.7) * 10;
      const arm = (Math.random() * arms) | 0;
      const a = arm * TAU / arms + r * 0.55 + gauss() * (0.35 - r * 0.015);
      const y = gauss() * 0.45 * (1 - r / 11);
      const c = Math.random() < 0.04 ? C.white : mixc(C.copper, C.blue, Math.min(r / 9, 1));
      b.put(Math.cos(a) * r, y, Math.sin(a) * r, c, 3);
    }
    return b.done();
  }

  function sceneWave() {
    const b = builder(N);
    while (b.count() < N) {
      const x = rnd(-18, 18), z = rnd(-36, 6);
      const on = Math.random() < 0.7;
      const gx = Math.round(x * 2.2) / 2.2, gz = Math.round(z * 2.2) / 2.2;
      b.put(on ? gx : x, 0, on ? gz : z, Math.random() < 0.05 ? C.copper : mixc(C.sage, C.blue, (z + 36) / 42), 4);
    }
    return b.done();
  }

  function sceneRoad() {
    const b = builder(N);
    putCar(b, N * 0.3, 1);
    const Z0 = -70, L = 80;
    while (b.count() < N * 0.97) {
      const z = Z0 + Math.random() * L;
      const k = Math.random();
      if (k < 0.33) b.put(rnd(-6, 6), 0, z, mixc(C.dim, C.blue, Math.random() * 0.3), 2);
      else if (k < 0.47) {
        if (((z - Z0) % 6) < 3) b.put(pick([-2, 2]) + gauss() * 0.06, 0.01, z, [1.6, 1.6, 1.7], 2);
      } else if (k < 0.65) {
        const red = Math.floor((z - Z0) / 1.6) % 2 === 0;
        b.put(pick([-6.3, 6.3]) + rnd(-0.35, 0.35), 0.02, z, red ? [1.8, 0.35, 0.4] : [1.6, 1.6, 1.6], 2);
      } else {
        b.put(pick([-1, 1]) * rnd(7, 22), gauss() * 0.15, z, Math.random() < 0.12 ? C.copper : mixc(C.sage, C.dim, Math.random() * 0.6), 2);
      }
    }
    return b.done();
  }

  const builders = { mark: sceneMark, kit: sceneKit, car: sceneCar, screens: sceneScreens, sphere: sceneSphere, galaxy: sceneGalaxy, wave: sceneWave, road: sceneRoad };
  const cameras = {
    mark: { eye: [0, 0.6, 15], at: [0, 0.2, 0], fov: 50 },
    kit: { eye: [0, 5.5, 11.5], at: [0, -1.2, 0], fov: 50 },
    car: { eye: [-6.4, 2.5, -5.4], at: [0, 0.1, 0.3], fov: 44 },
    screens: { eye: [0, 0.5, 9], at: [0, 0.4, -8], fov: 55 },
    sphere: { eye: [0, 1.4, 14], at: [0, 0, 0], fov: 50 },
    galaxy: { eye: [0, 7.5, 12], at: [0, -0.5, 0], fov: 52 },
    wave: { eye: [0, 3.6, 9], at: [0, 0, -6], fov: 55 },
    road: { eye: [0, 3.6, 12.5], at: [0, 0.2, -12], fov: 55 },
  };
  const cache = {};
  const scene = name => cache[name] || (cache[name] = builders[name]());

  // ---------- шейдеры ----------
  const VS = `
  attribute vec3 aFrom, aTo, aCF, aCT; attribute vec3 aMeta;
  uniform mat4 uProj, uView; uniform float uMix, uTime, uSize, uAspect, uPush, uRoad, uSpin, uSway;
  uniform vec3 uCar; uniform vec2 uMouse;
  varying vec3 vCol; varying float vAlpha;
  vec3 rotY(vec3 p, float a){ float c=cos(a), s=sin(a); return vec3(p.x*c+p.z*s, p.y, -p.x*s+p.z*c); }
  vec3 place(vec3 p, float f){
    if (f > 0.5 && f < 1.5) { p = rotY(p, uCar.z); p.x += uCar.x; p.z += uCar.y; }
    else if (f > 1.5 && f < 2.5) { p.z = mod(p.z + 70.0 + uRoad, 80.0) - 70.0; }
    else if (f > 2.5 && f < 3.5) { p = rotY(p, uSpin); }
    else if (f > 3.5 && f < 4.5) { p.y += sin(p.x*0.42 + uTime*0.9)*0.6 + cos(p.z*0.45 + uTime*0.6)*0.5; }
    else if (f > 4.5) { p = rotY(p, uSway); }
    return p;
  }
  void main(){
    float seed = aMeta.x;
    float k = clamp(uMix*1.7 - seed*0.7, 0.0, 1.0); k = k*k*(3.0-2.0*k);
    vec3 p = mix(place(aFrom, aMeta.y), place(aTo, aMeta.z), k);
    float arc = sin(k*3.14159);
    p += vec3(sin(seed*91.0), cos(seed*57.0)*0.6+0.5, sin(seed*33.0)) * arc * 1.8;
    p += vec3(sin(uTime*1.3+seed*80.0), cos(uTime*1.1+seed*60.0), sin(uTime*0.9+seed*40.0)) * 0.022;
    vec4 v = uView * vec4(p, 1.0);
    vec4 c = uProj * v;
    vec2 ndc = c.xy / c.w;
    vec2 d = ndc - uMouse; d.x *= uAspect;
    float r2 = dot(d, d);
    float push = uPush * exp(-r2 / 0.02);
    if (r2 > 0.000001) ndc += normalize(d) * push * vec2(1.0/uAspect, 1.0);
    c.xy = ndc * c.w;
    gl_Position = c;
    float tw = 0.7 + 0.3*sin(uTime*2.1 + seed*120.0);
    gl_PointSize = max(uSize * tw * (0.55 + seed*0.9) / max(-v.z, 0.5), 1.0);
    vCol = mix(aCF, aCT, k) * (1.0 + push*9.0);
    vAlpha = clamp(1.0 - (-v.z - 8.0)/60.0, 0.06, 1.0);
  }`;
  const FS = `
  precision mediump float; varying vec3 vCol; varying float vAlpha;
  void main(){ vec2 q = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.05, length(q)) * vAlpha; gl_FragColor = vec4(vCol * a * 0.62, a); }`;
  const VS2 = `
  attribute vec3 aPos; attribute vec4 aCol; uniform mat4 uProj, uView; uniform float uSize;
  varying vec4 vCol;
  void main(){ vec4 v = uView * vec4(aPos, 1.0); gl_Position = uProj * v; gl_PointSize = max(uSize * (0.4 + aCol.a) / max(-v.z, 0.5), 1.0); vCol = aCol; }`;
  const FS2 = `
  precision mediump float; varying vec4 vCol;
  void main(){ vec2 q = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(q)) * vCol.a; gl_FragColor = vec4(vCol.rgb * a, a); }`;

  function program(vs, fs) {
    const make = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, make(gl.VERTEX_SHADER, vs)); gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, a = {};
    for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) { const n = gl.getActiveUniform(p, i).name; u[n] = gl.getUniformLocation(p, n); }
    for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i++) { const n = gl.getActiveAttrib(p, i).name; a[n] = gl.getAttribLocation(p, n); }
    return { p, u, a };
  }
  let P, P2;
  try { P = program(VS, FS); P2 = program(VS2, FS2); }
  catch (error) { console.warn(error); document.documentElement.classList.add("no-webgl"); return; }

  const buf = data => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW); return b; };
  const upload = (b, data) => { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW); };
  const from = { pos: new Float32Array(N * 3), col: new Float32Array(N * 3) };
  let to = null;
  const meta = new Float32Array(N * 3); // seed, флаг «откуда», флаг «куда»
  for (let i = 0; i < N; i++) meta[i * 3] = Math.random();
  const B = { from: buf(from.pos), to: buf(from.pos), cf: buf(from.col), ct: buf(from.col), meta: buf(meta) };
  const sprayPos = new Float32Array(SPRAY * 3), sprayCol = new Float32Array(SPRAY * 4);
  const sprayVel = new Float32Array(SPRAY * 3), sprayLife = new Float32Array(SPRAY), sprayMax = new Float32Array(SPRAY), sprayBase = new Float32Array(SPRAY * 3);
  const B2 = { pos: buf(sprayPos), col: buf(sprayCol) };
  let sprayHead = 0;

  const state = {
    current: null, mix: 1, time: 0, road: 0, spin: 0, sway: 0,
    mouse: [0, 0], mouseT: [0, 0], push: 0, pushT: 0,
    car: [0, 0, 0], carV: [0, 0], carT: [0, 0], carActive: 0, turn: 0.6,
    cam: { eye: [0, 0.6, 15], at: [0, 0.2, 0], fov: 50 }, scroll: 0,
  };
  let dirty = true;

  // Повторяем расчёт шейдера на CPU, чтобы смена сцены посреди перехода не давала рывка.
  function placeCPU(x, y, z, f) {
    const rot = a => { const c = Math.cos(a), s = Math.sin(a); const nx = x * c + z * s; z = -x * s + z * c; x = nx; };
    if (f > 0.5 && f < 1.5) { rot(state.car[2]); x += state.car[0]; z += state.car[1]; }
    else if (f > 1.5 && f < 2.5) z = ((z + 70 + state.road) % 80 + 80) % 80 - 70;
    else if (f > 2.5 && f < 3.5) rot(state.spin);
    else if (f > 3.5 && f < 4.5) y += Math.sin(x * 0.42 + state.time * 0.9) * 0.6 + Math.cos(z * 0.45 + state.time * 0.6) * 0.5;
    else if (f > 4.5) rot(state.sway);
    return [x, y, z];
  }
  function snapshot() {
    const m = state.mix;
    for (let i = 0; i < N; i++) {
      const seed = meta[i * 3];
      let k = Math.min(Math.max(m * 1.7 - seed * 0.7, 0), 1); k = k * k * (3 - 2 * k);
      const a = placeCPU(from.pos[i * 3], from.pos[i * 3 + 1], from.pos[i * 3 + 2], meta[i * 3 + 1]);
      const b = to ? placeCPU(to.pos[i * 3], to.pos[i * 3 + 1], to.pos[i * 3 + 2], meta[i * 3 + 2]) : a;
      const arc = Math.sin(k * Math.PI) * 1.8;
      from.pos[i * 3] = a[0] + (b[0] - a[0]) * k + Math.sin(seed * 91) * arc;
      from.pos[i * 3 + 1] = a[1] + (b[1] - a[1]) * k + (Math.cos(seed * 57) * 0.6 + 0.5) * arc;
      from.pos[i * 3 + 2] = a[2] + (b[2] - a[2]) * k + Math.sin(seed * 33) * arc;
      if (to) for (let j = 0; j < 3; j++) from.col[i * 3 + j] += (to.col[i * 3 + j] - from.col[i * 3 + j]) * k;
      meta[i * 3 + 1] = 0;
    }
  }
  function go(name, force = false) {
    if (!builders[name] || (name === state.current && !force)) return;
    const next = scene(name);
    if (state.current === null) {
      for (let i = 0; i < N; i++) {
        from.pos[i * 3] = rnd(-30, 30); from.pos[i * 3 + 1] = rnd(-20, 20); from.pos[i * 3 + 2] = rnd(-40, 5);
        from.col.set(C.dim, i * 3);
      }
    } else snapshot();
    to = next;
    for (let i = 0; i < N; i++) meta[i * 3 + 2] = to.flag[i];
    upload(B.from, from.pos); upload(B.cf, from.col); upload(B.to, to.pos); upload(B.ct, to.col); upload(B.meta, meta);
    if (name !== state.current) {
      if (name === "road") { state.car[0] = 0; state.car[1] = 2.2; state.car[2] = 0; }
      if (name === "car") { state.car[0] = 0; state.car[1] = 0; state.turn = state.car[2]; }
    }
    state.current = name; state.mix = reduced ? 1 : 0;
    dirty = true;
    document.documentElement.dataset.scene = name;
  }

  // ---------- матрицы ----------
  function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  function lookAt(eye, at) {
    const z = norm(sub(eye, at)), x = norm(cross([0, 1, 0], z)), y = cross(z, x);
    return { m: new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]), x, y, z };
  }

  let W = 1, H = 1, dpr = 1;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75);
    W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    dirty = true;
  }
  addEventListener("resize", resize); resize();

  // ---------- ввод ----------
  addEventListener("pointermove", e => {
    state.mouseT[0] = (e.clientX / W) * 2 - 1; state.mouseT[1] = 1 - (e.clientY / H) * 2;
    state.pushT = 0.06; dirty = true;
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => { state.pushT = 0; });
  addEventListener("pointerdown", e => {
    if (e.target.closest("a, button, input, summary, label, [role=tab], .panel")) return;
    burst(small ? 160 : 420);
  });

  // ---------- искры ----------
  function carWorld(lx, ly, lz) {
    const a = state.car[2], c = Math.cos(a), s = Math.sin(a);
    return [lx * c + lz * s + state.car[0], ly, -lx * s + lz * c + state.car[1]];
  }
  function emit(count, power = 1) {
    const a = state.car[2], c = Math.cos(a), s = Math.sin(a);
    for (let n = 0; n < count; n++) {
      const i = sprayHead; sprayHead = (sprayHead + 1) % SPRAY;
      const side = Math.random() < 0.5 ? -1 : 1;
      const p = Math.random() < 0.7 ? carWorld(side * rnd(0.3, 0.7), rnd(0.25, 0.6), 2.3) : carWorld(side * 0.9, 0.05, rnd(-1.6, 1.6));
      sprayPos.set(p, i * 3);
      const back = rnd(2, 6) * power, spread = gauss() * 2.2 * power;
      const vx = spread * c + back * s;
      let vz = -spread * s + back * c;
      if (state.current === "road") vz += 10;
      sprayVel[i * 3] = vx + state.carV[0] * 0.4; sprayVel[i * 3 + 1] = rnd(0.6, 3.2) * power; sprayVel[i * 3 + 2] = vz + state.carV[1] * 0.4;
      sprayMax[i] = sprayLife[i] = rnd(0.9, 2.2);
      sprayBase.set(pick([C.copper, C.copper, C.red, C.white, C.ice, C.wine]), i * 3);
    }
  }
  function burst(count) {
    if (reduced || state.carActive < 0.5) return;
    emit(count, 1.8);
  }
  function stepSpray(dt) {
    for (let i = 0; i < SPRAY; i++) {
      if (sprayLife[i] <= 0) { sprayCol[i * 4 + 3] = 0; continue; }
      sprayLife[i] -= dt;
      sprayVel[i * 3 + 1] -= 5.5 * dt;
      for (let j = 0; j < 3; j++) sprayPos[i * 3 + j] += sprayVel[i * 3 + j] * dt;
      if (sprayPos[i * 3 + 1] < 0) { sprayPos[i * 3 + 1] = 0; sprayVel[i * 3 + 1] *= -0.35; sprayVel[i * 3] *= 0.7; sprayVel[i * 3 + 2] *= 0.7; }
      const life = Math.max(sprayLife[i] / sprayMax[i], 0), heat = Math.min(life * 1.6, 1);
      sprayCol[i * 4] = sprayBase[i * 3] * heat + 0.15 * life; sprayCol[i * 4 + 1] = sprayBase[i * 3 + 1] * heat; sprayCol[i * 4 + 2] = sprayBase[i * 3 + 2] * heat;
      sprayCol[i * 4 + 3] = life;
    }
  }

  // ---------- сцена по секции у центра экрана ----------
  const sections = [...document.querySelectorAll("[data-scene]")];
  let activeSection = null;
  function pickSection() {
    const mid = innerHeight * 0.5;
    let best = sections[0];
    for (const s of sections) if (s.getBoundingClientRect().top <= mid) best = s;
    if (best && best !== activeSection) { activeSection = best; go(best.dataset.scene); }
    if (activeSection) {
      const r = activeSection.getBoundingClientRect();
      state.scroll = Math.min(Math.max((mid - r.top) / Math.max(r.height, 1), 0), 1);
    }
    dirty = true;
  }
  addEventListener("scroll", pickSection, { passive: true });

  // ---------- иконки услуг для литника ----------
  const iconBase = canvas.dataset.icons;
  if (iconBase) {
    const names = ["ai", "server", "web", "layers", "mini", "mobile", "bot", "design", "watch", "spark"];
    Promise.all(names.map(n => fetch(iconBase + n + ".svg").then(r => r.text()).then(svg => new Promise(res => {
      const img = new Image();
      img.onload = () => res(img); img.onerror = () => res(null);
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.replaceAll("currentColor", "#fff").replace(/stroke-width="[\d.]+"/, 'stroke-width="2.1"'));
    })).catch(() => null))).then(list => {
      icons = list.filter(Boolean);
      delete cache.kit;
      if (state.current === "kit") go("kit", true);
    });
  }

  // ---------- цикл ----------
  let last = performance.now();
  const lerp = (a, b, k) => a + (b - a) * k;
  const attr = (loc, b, size) => { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); };
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (reduced && !dirty) return;
    dirty = false;
    if (!reduced) {
      state.time += dt; state.spin = (state.spin + dt * 0.12) % TAU; state.sway = Math.sin(state.time * 0.35) * 0.2;
      state.road = (state.road + dt * 14) % 80;
      state.mix = Math.min(state.mix + dt / 2.1, 1);
    }
    const ease = reduced ? 1 : 1 - Math.exp(-dt * 6);
    state.mouse[0] = lerp(state.mouse[0], state.mouseT[0], ease); state.mouse[1] = lerp(state.mouse[1], state.mouseT[1], ease);
    state.push = lerp(state.push, state.pushT, 1 - Math.exp(-dt * 3));
    state.pushT *= Math.exp(-dt * 0.8);

    const target = cameras[state.current] || cameras.mark;
    const ce = reduced ? 1 : 1 - Math.exp(-dt * 2.2);
    for (let j = 0; j < 3; j++) { state.cam.eye[j] = lerp(state.cam.eye[j], target.eye[j], ce); state.cam.at[j] = lerp(state.cam.at[j], target.at[j], ce); }
    state.cam.fov = lerp(state.cam.fov, target.fov, ce);
    const dolly = (state.scroll - 0.5) * 1.6;
    const eye = [state.cam.eye[0] + state.mouse[0] * 0.8, state.cam.eye[1] + state.mouse[1] * 0.5 - dolly * 0.3, state.cam.eye[2] - dolly];
    const basis = lookAt(eye, state.cam.at);

    const carScene = state.current === "car" || state.current === "road";
    state.carActive = lerp(state.carActive, carScene && state.mix > 0.6 ? 1 : 0, ease);
    if (carScene) {
      const prevX = state.car[0];
      if (state.current === "road") {
        // дорога: машина перестраивается за курсором влево-вправо и слегка подруливает
        state.carT[0] = Math.max(-4.4, Math.min(4.4, state.mouse[0] * 6));
        const ck = reduced ? 1 : 1 - Math.exp(-dt * 2.2);
        state.car[0] = lerp(state.car[0], state.carT[0], ck); state.car[1] = 2.2;
        const vx = (state.car[0] - prevX) / Math.max(dt, 1e-3);
        state.carV[0] = vx; state.carV[1] = 0;
        state.car[2] = lerp(state.car[2], Math.max(-0.4, Math.min(0.4, -vx * 0.12)), 1 - Math.exp(-dt * 6));
        if (!reduced && state.carActive > 0.5) emit(Math.floor((45 + Math.abs(vx) * 60) * dt + Math.random()));
      } else {
        // шоурум: машина стоит на подиуме, медленно вращается, курсор доворачивает её
        state.turn = (state.turn + dt * 0.18) % TAU;
        const yawT = state.turn + state.mouse[0] * 1.1;
        const dy = ((yawT - state.car[2] + Math.PI) % TAU + TAU) % TAU - Math.PI;
        state.car[2] += dy * (reduced ? 1 : 1 - Math.exp(-dt * 3));
        state.car[0] = lerp(state.car[0], 0, 1 - Math.exp(-dt * 3)); state.car[1] = 0;
        state.carV[0] = 0; state.carV[1] = 0;
      }
    }
    if (!reduced) stepSpray(dt);

    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const proj = perspective(state.cam.fov * Math.PI / 180, W / H, 0.1, 200);
    const size = 30 * dpr * Math.min(H / 900, 1.3) * (small ? 1.25 : 1);

    gl.useProgram(P.p);
    gl.uniformMatrix4fv(P.u.uProj, false, proj); gl.uniformMatrix4fv(P.u.uView, false, basis.m);
    gl.uniform1f(P.u.uMix, state.mix); gl.uniform1f(P.u.uTime, state.time); gl.uniform1f(P.u.uSize, size);
    gl.uniform1f(P.u.uAspect, W / H); gl.uniform1f(P.u.uPush, reduced ? 0 : state.push);
    gl.uniform1f(P.u.uRoad, state.road); gl.uniform1f(P.u.uSpin, state.spin); gl.uniform1f(P.u.uSway, state.sway);
    gl.uniform3f(P.u.uCar, state.car[0], state.car[1], state.car[2]); gl.uniform2f(P.u.uMouse, state.mouse[0], state.mouse[1]);
    attr(P.a.aFrom, B.from, 3); attr(P.a.aTo, B.to, 3); attr(P.a.aCF, B.cf, 3); attr(P.a.aCT, B.ct, 3); attr(P.a.aMeta, B.meta, 3);
    gl.drawArrays(gl.POINTS, 0, N);
    for (const k of ["aFrom", "aTo", "aCF", "aCT", "aMeta"]) gl.disableVertexAttribArray(P.a[k]);

    if (!reduced && state.carActive > 0.02) {
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(P2.p);
      gl.uniformMatrix4fv(P2.u.uProj, false, proj); gl.uniformMatrix4fv(P2.u.uView, false, basis.m);
      gl.uniform1f(P2.u.uSize, size * 1.6);
      upload(B2.pos, sprayPos); attr(P2.a.aPos, B2.pos, 3);
      upload(B2.col, sprayCol); attr(P2.a.aCol, B2.col, 4);
      gl.drawArrays(gl.POINTS, 0, SPRAY);
      gl.disableVertexAttribArray(P2.a.aPos); gl.disableVertexAttribArray(P2.a.aCol);
    }
  }
  pickSection();
  if (!state.current) go("mark");
  requestAnimationFrame(frame);
  window.devlarionField = { go, burst, state };
})();
