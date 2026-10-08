const ring = document.getElementById("ring");
const stage = document.getElementById("stage");

// Elementos do Modal
const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");
const modalPreview = document.getElementById("modalPreview");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const modalTags = document.getElementById("modalTags");
const modalVisitBtn = document.getElementById("modalVisitBtn");

const host = u => {
  if (!u || u.trim() === "" || u === "#") return "exemplo.com";
  return u.replace(/^https?:\/\//, "").replace(/\/$/, "");
};

// CORREÇÃO DO BFCache
window.addEventListener("pageshow", () => {
  document.body.classList.remove("page-exit");
});

// Navegação com efeito de transição
function navigateWithEffect(url, event) {
  if (!url || url.trim() === "" || url === "#") return;
  
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  document.body.classList.add("page-exit");

  setTimeout(() => {
    window.location.href = url;
  }, 450);
}

// ABRIR MODAL COM DETALHES COMPLETOS
function openModal(site) {
  modalTitle.textContent = site.nome;
  modalDesc.textContent = site.desc;
  modalPreview.style.background = `linear-gradient(135deg, ${site.cores[0]}, ${site.cores[1]})`;
  
  // Renderizar tags
  modalTags.innerHTML = "";
  if (site.tags && site.tags.length > 0) {
    site.tags.forEach(tag => {
      const span = document.createElement("span");
      span.className = "tag-pill";
      span.textContent = "#" + tag;
      modalTags.appendChild(span);
    });
  }

  // Configurar botão de visita no modal
  modalVisitBtn.href = site.url;
  modalVisitBtn.onclick = (e) => navigateWithEffect(site.url, e);

  modalOverlay.classList.add("active");
  modalOverlay.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modalOverlay.classList.remove("active");
  modalOverlay.setAttribute("aria-hidden", "true");
}

modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalOverlay.classList.contains("active")) {
    closeModal();
  }
});

/* =========================================================
   ANEL 3D REUTILIZÁVEL: o mesmo scroll/efeito para pastas e arquivos
   ========================================================= */
const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;

/* Transição pastas <-> arco: tempo fixo (igual em qualquer aparelho) com início e fim suaves */
const TRANS_MS = 1100;
const easeIO = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const easeOut = p => 1 - Math.pow(1 - p, 3);

/* Governador: se os quadros ficarem lentos, liga o modo leve sozinho */
const rootEl = document.documentElement;
let lite = rootEl.classList.contains("lite");
let gLast = 0, gSlow = 0;
const gStart = performance.now() + 2000;      // ignora o carregamento inicial
function governor(t) {
  if (!t) return;
  const dt = t - gLast; gLast = t;
  if (lite || t < gStart || dt > 250) return;
  gSlow = dt > 34 ? gSlow + 1 : Math.max(0, gSlow - 1);
  if (gSlow > 45) { lite = true; rootEl.classList.add("lite"); setBgQuality(); }
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MIN_SLOTS = 14;          // posições do círculo por pasta (as vazias viram "vaga")
const rings = [];
let cur = null, dragging = false, moved = 0, lastX = 0;

function makeCard(o) {
  const a = document.createElement("div");
  a.className = "card";
  a.tabIndex = 0;
  a.setAttribute("role", "button");
  if (o.ghost) {
    a.classList.add("ghost");
    a.setAttribute("aria-label", "Vaga livre");
    a.innerHTML = "<b>+</b><span>vaga livre</span>";
    return a;
  }
  a.setAttribute("aria-label", "Trazer " + (o.nome.trim() || "item") + " para a frente");
  a.innerHTML = '<div class="bar"><i></i><i></i><i></i><span></span></div><div class="shot"><b></b><div><em></em><em></em><em></em></div></div><div class="cap"><strong></strong><p class="card-short-desc"></p><a class="visit"></a></div>';
  a.querySelector(".bar span").textContent = o.bar;
  const sh = a.querySelector(".shot");
  sh.style.background = "linear-gradient(135deg," + o.cores[0] + "," + o.cores[1] + ")";
  if (o.img) { sh.style.backgroundImage = 'url("' + o.img.replace(/"/g, "%22") + '")'; sh.style.backgroundSize = "cover"; sh.style.backgroundPosition = "center"; }
  sh.querySelector("b").textContent = o.nome;
  a.querySelector("strong").textContent = o.nome;
  a.querySelector(".card-short-desc").textContent = o.desc;
  const v = a.querySelector(".visit");
  v.textContent = o.btn;
  v.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); o.onOpen(v); });
  v.addEventListener("pointerdown", e => e.stopPropagation());
  a.insertAdjacentHTML("beforeend", '<span class="gl"></span>');
  return a;
}

function makeRing(el, items) {
  const r = { el, n: items.length, step: 360 / items.length, cards: [], popv: [], angle: 0, vel: 0, focused: -1,
              pauseUntil: 0, animating: false, tok: 0, R: 380, vis: 0, off: 220, tVis: 0, tOff: 220, dep: 0, tDep: 0, p: 1, t0: 0, f0: 0, o0: 0, d0: 0 };
  items.forEach((o, i) => {
    const c = makeCard(o);
    c.addEventListener("click", () => focusCard(r, i));
    c.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); focusCard(r, i); } });
    el.appendChild(c); r.cards.push(c); r.popv.push(0);
  });
  rings.push(r);
  return r;
}

function sizeRings() {
  const sw = stage.clientWidth;
  const W = sw < 340 ? 130 : sw < 380 ? 150 : sw < 600 ? 180 : sw < 900 ? 200 : sw < 1400 ? 230 : 260;
  stage.style.setProperty("--w", W + "px");
  rings.forEach(r => { r.R = Math.max(W * 1.15, (W / 2) / Math.tan(Math.PI / r.n) + 20); });
}

function drawRing(r) {
  if (r.p < 1) {
    r.p = reduce ? 1 : Math.min(1, (performance.now() - r.t0) / TRANS_MS);
    const e = easeIO(r.p), v = easeOut(r.p);
    r.vis = r.f0 + (r.tVis - r.f0) * v;
    r.off = r.o0 + (r.tOff - r.o0) * e;
    r.dep = r.d0 + (r.tDep - r.d0) * e;
  }
  if (r.vis === 0) { if (r.hid !== 1) { r.el.style.visibility = "hidden"; r.hid = 1; } return; }
  if (r.hid !== 0) { r.el.style.visibility = "visible"; r.hid = 0; }
  const tr = "translateY(" + r.off.toFixed(1) + "px) translateZ(" + (-(r.R + r.dep)).toFixed(0) + "px) rotateY(" + r.angle.toFixed(2) + "deg)";
  if (tr !== r.tr) { r.el.style.transform = tr; r.tr = tr; }
  r.cards.forEach((c, i) => {
    const a = i * r.step, tgt = i === r.focused ? 1 : 0;
    r.popv[i] += (tgt - r.popv[i]) * 0.12;
    if (Math.abs(tgt - r.popv[i]) < 0.002) r.popv[i] = tgt;
    const t = "rotateY(" + a + "deg) translateZ(" + (r.R + 60 * r.popv[i]).toFixed(1) + "px) scale(" + (1 + 0.05 * r.popv[i]).toFixed(3) + ")";
    if (t !== c._t) { c.style.transform = t; c._t = t; }
    const isF = i === r.focused;
    if (isF !== c._f) { c.classList.toggle("focus", isF); c._f = isF; }
    const f = (Math.cos((a + r.angle) * Math.PI / 180) + 1) / 2;
    const o = ((0.2 + 0.8 * f) * r.vis).toFixed(2);
    if (o !== c._o) { c.style.opacity = o; c._o = o; }
    const z = Math.round(f * 100);
    if (z !== c._z) { c.style.zIndex = z; c._z = z; }
    const pe = (f > 0.55 && r.tVis === 1) ? "auto" : "none";
    if (pe !== c._pe) { c.style.pointerEvents = pe; c._pe = pe; }
  });
}

function stepRing(r) {
  if (dragging || r.animating) return;
  r.angle += r.vel;
  r.vel *= 0.94;
  if (performance.now() >= r.pauseUntil) {
    if (r.focused >= 0) r.focused = -1;
    if (!reduce && Math.abs(r.vel) < 0.05) r.angle -= 0.17
      ;
  }
}

function tick(t) {
  governor(t);
  rings.forEach(r => { if (r === cur || (r === folderRing && !lite)) stepRing(r); drawRing(r); });
  arcTick();
  requestAnimationFrame(tick);
}

function animTo(r, target, ms) {
  const tok = ++r.tok;
  r.animating = true; r.vel = 0;
  const from = r.angle, t0 = performance.now();
  (function a(t) {
    if (tok !== r.tok) return;
    const p = Math.min((t - t0) / ms, 1);
    r.angle = from + (target - from) * (1 - Math.pow(1 - p, 3));
    if (p < 1) requestAnimationFrame(a);
    else { r.animating = false; if (r.focused >= 0) r.pauseUntil = performance.now() + 5000; }
  })(t0);
}

function focusCard(r, i) {
  r.focused = i;
  r.pauseUntil = performance.now() + 8000;
  const need = -i * r.step;
  const target = need + Math.round((r.angle - need) / 360) * 360;
  if (Math.abs(target - r.angle) < 6) return;
  animTo(r, target, 350);
}

/* =========================================================
   ARCO DE ARQUIVOS (dentro do palco, no lugar das pastas)
   ========================================================= */
let arc = null, arcOn = false;
let aW = 150, aH = 207, aR = 460, aGap = 25;
const wrapIdx = (d, n) => ((d + n / 2) % n + n) % n - n / 2;

function sizeArc() {
  const sw = stage.clientWidth, vh = innerHeight;
  const short = vh < 520;                       // celular deitado / janela baixa
  const need = short ? 120 : 200;               // espaço do texto abaixo do card
  const sh = clamp(vh * 0.64, short ? 300 : 440, 620);
  stage.style.height = sh + "px";
  aW = clamp(Math.min(sw * 0.34, (sh - need - 40) / 1.38), 84, 210);
  aH = Math.round(aW * 1.38);
  aR = sw < 340 ? 360 : sw < 600 ? 420 : clamp(sw * 0.5, 480, 760);
  aGap = Math.max((aW * 1.12 / aR) * 180 / Math.PI, 360 / arc.n);
  const cy = 12 + aH / 2;
  arc.el.style.top = (cy + aR) + "px";
  arc.info.style.top = (cy + aH / 2 + (short ? 18 : 28)) + "px";
  stage.style.setProperty("--cw", aW + "px");
  stage.style.setProperty("--ch", aH + "px");
}

function arcInfo(a, i) {
  a.shown = i;
  const s = a.items[i], q = x => a.info.querySelector(x);
  q("small").textContent = (i + 1) + " / " + a.n;
  a.info.classList.remove("in"); void a.info.offsetWidth; a.info.classList.add("in");
  const tg = q(".modal-tags"), b = q(".pill"); tg.innerHTML = "";
  if (s.ghost) {
    q("h2").textContent = "Espaço livre";
    q("p").textContent = 'Adicione um site em "sites" desta pasta para ele aparecer aqui.';
    b.style.display = "none";
    return;
  }
  q("h2").textContent = s.nome;
  q("p").textContent = s.desc;
  (s.tags || []).forEach(t => { const sp = document.createElement("span"); sp.className = "tag-pill"; sp.textContent = "#" + t; tg.appendChild(sp); });
  const ok = s.url && s.url !== "#";
  b.style.display = ""; b.textContent = ok ? "Visitar site" : "Em breve"; b.href = ok ? s.url : "#";
  b.onclick = ev => ok ? navigateWithEffect(s.url, ev) : ev.preventDefault();
}

function arcDraw(a) {
  a.cards.forEach((c, i) => {
    const d = wrapIdx(i - a.pos, a.n), ad = Math.abs(d), th = d * aGap;
    const op = clamp(1 - (Math.abs(th) - 65) / 35, 0, 1);
    const hid = op < 0.02;
    if (hid !== c._h) { c.style.visibility = hid ? "hidden" : "visible"; c._h = hid; }
    if (hid) { if (c._o !== "0") { c.style.opacity = "0"; c._o = "0"; } return; }
    const t = "rotate(" + th.toFixed(2) + "deg) translateY(" + (-aR) + "px) scale(" + (1 + 0.1 * Math.max(0, 1 - ad)).toFixed(3) + ")";
    if (t !== c._t) { c.style.transform = t; c._t = t; }
    const o = op.toFixed(2);
    if (o !== c._o) { c.style.opacity = o; c._o = o; }
    const z = 100 - Math.round(ad * 10);
    if (z !== c._z) { c.style.zIndex = z; c._z = z; }
    const pe = (op > 0.2 && a.tVis === 1) ? "auto" : "none";
    if (pe !== c._pe) { c.style.pointerEvents = pe; c._pe = pe; }
    const on = ad < 0.5;
    if (on !== c._on) { c.classList.toggle("on", on); c._on = on; }
  });
  const idx = ((Math.round(a.pos) % a.n) + a.n) % a.n;
  if (idx !== a.shown) arcInfo(a, idx);
}

function arcTick() {
  const a = arc;
  if (!a) return;
  if (a.p < 1) {
    a.p = reduce ? 1 : Math.min(1, (performance.now() - a.t0) / TRANS_MS);
    a.vis = a.f0 + (a.tVis - a.f0) * easeOut(a.p);
    a.sc = a.s0 + (a.tSc - a.s0) * easeIO(a.p);
  }
  a.root.style.opacity = a.vis.toFixed(3);
  a.root.style.transform = "scale(" + a.sc.toFixed(3) + ")";
  a.root.style.visibility = a.vis === 0 ? "hidden" : "visible";
  if (a.vis === 0) return;
  if (arcOn && !dragging) {
    if (a.target !== null) {
      a.pos += (a.target - a.pos) * (reduce ? 1 : 0.14);
      if (Math.abs(a.target - a.pos) < 0.001) { a.pos = a.target; a.target = null; }
    } else {
      a.pos += a.vel; a.vel *= 0.94;
      if (Math.abs(a.vel) < 0.015) {
        a.vel = 0;
        const now = performance.now();
        if (now < a.pauseUntil) a.target = Math.round(a.pos);          // encaixa no card mais próximo
        else if (!reduce) a.pos += 0.12 / aGap;                         // rola sozinho, devagar
      }
    }
  }
  arcDraw(a);
}

function arcGo(n) {
  arc.vel = 0; arc.pauseUntil = performance.now() + 5000;
  arc.target = Math.round(arc.target !== null ? arc.target : arc.pos) + n;
}

/* Gestos: valem para o anel de pastas ou para o arco, conforme o que estiver aberto */
stage.addEventListener("pointerdown", e => {
  if (arcOn) { arc.vel = 0; arc.target = null; arc.pauseUntil = performance.now() + 5000; }
  else if (cur) { cur.focused = -1; cur.pauseUntil = 0; cur.tok++; cur.animating = false; cur.vel = 0; }
  else return;
  dragging = true; moved = 0; lastX = e.clientX;
  stage.classList.add("drag");
});
addEventListener("pointermove", e => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  lastX = e.clientX; moved += Math.abs(dx);
  if (arcOn) {
    const di = -dx / (aR * aGap * Math.PI / 180);
    arc.pos += di; arc.vel = di;
  } else if (cur) { cur.angle += dx * 0.35; cur.vel = dx * 0.35; }
});
const endDrag = () => { dragging = false; stage.classList.remove("drag"); if (arcOn) arc.pauseUntil = performance.now() + 5000; };
addEventListener("pointerup", endDrag);
addEventListener("pointercancel", endDrag);
stage.addEventListener("click", e => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
stage.addEventListener("wheel", e => {
  e.preventDefault(); e.stopPropagation();
  const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  if (arcOn) { arc.target = null; arc.pauseUntil = performance.now() + 5000; arc.vel = clamp(d * 0.04, -6, 6) / aGap; }
  else if (cur) { cur.focused = -1; cur.pauseUntil = 0; cur.vel = clamp(-d * 0.04, -6, 6); }
}, { passive: false });

/* Pastas -> Arquivos: as pastas descem e somem, o arco sobe e ocupa o lugar */
const heroH1 = document.querySelector(".hero h1"), heroSub = document.querySelector(".hero p.sub");
const heroDefault = [heroH1.textContent, heroSub.textContent];
const backBtn = document.getElementById("backBtn");
let folderRing = null;

function setHero(t, s) {
  [heroH1, heroSub].forEach((el, k) => {
    el.style.opacity = 0;
    setTimeout(() => { el.textContent = k ? s : t; el.style.opacity = 1; }, 220);
  });
}
/* on = pastas à frente; off = pastas ficam para trás: menores, fracas e ainda girando */
function showRing(r, on) {
  r.f0 = r.vis; r.o0 = r.off; r.d0 = r.dep; r.t0 = performance.now(); r.p = 0;
  r.tVis = on ? 1 : 0.4; r.tOff = on ? 0 : -24; r.tDep = on ? 0 : 1000;
}

function openFolder(c) {
  if (arcOn) return;
  if (arc) arc.root.remove();
  const items = c.sites.slice();
  while (items.length < MIN_SLOTS) items.push({ ghost: true });
  const root = document.createElement("div");
  root.className = "arc-root";
  root.innerHTML = '<div class="arc"></div><div class="arch-info"><small></small><h2></h2><p></p><div class="modal-tags"></div><a class="pill lime" rel="noopener">Visitar site</a></div>';
  stage.appendChild(root);
  const a = arc = { root, el: root.querySelector(".arc"), info: root.querySelector(".arch-info"), items, n: items.length,
                    cards: [], pos: 0, vel: 0, target: null, shown: -1, vis: 0, sc: 0.7, tVis: 1, tSc: 1, p: 0, t0: performance.now(), f0: 0, s0: 0.7, pauseUntil: performance.now() + 1500 };
  a.info.querySelector(".pill").addEventListener("pointerdown", e => e.stopPropagation());
  items.forEach((s, i) => {
    const el = document.createElement("div");
    el.className = "acard";
    if (s.ghost) {
      el.classList.add("ghost");
      el.innerHTML = '<b>+</b><span>vaga</span><span class="gl"></span>';
    } else {
      el.innerHTML = '<div class="bar"><i></i><i></i><i></i><span></span></div><div class="pic"><b></b></div>';
      el.querySelector("span").textContent = host(s.url);
      const pic = el.querySelector(".pic");
      pic.style.background = "linear-gradient(135deg," + s.cores[0] + "," + s.cores[1] + ")";
      if (s.img) { pic.style.backgroundImage = 'linear-gradient(to top,rgba(0,0,0,.55),transparent 55%),url("' + s.img.replace(/"/g, "%22") + '")'; pic.style.backgroundSize = "cover"; pic.style.backgroundPosition = "center"; }
      pic.querySelector("b").textContent = s.nome;
      el.insertAdjacentHTML("beforeend", '<span class="gl"></span>');
    }
    el.addEventListener("click", () => {
      const cu = Math.round(a.pos), k = wrapIdx(i - cu, a.n);
      a.pauseUntil = performance.now() + 8000;
      if (k === 0) { if (!s.ghost) openModal(s); } else { a.vel = 0; a.target = cu + k; }
    });
    a.el.appendChild(el); a.cards.push(el);
  });
  arcOn = true; cur = null;
  sizeArc();
  folderRing.focused = -1; folderRing.pauseUntil = 0;
  ring.inert = true; ring.setAttribute("aria-hidden", "true");
  showRing(folderRing, false);
  setHero(c.nome, c.desc);
  backBtn.hidden = false;
}

function closeFolder() {
  if (!arcOn) return;
  const a = arc;
  arcOn = false;
  a.f0 = a.vis; a.s0 = a.sc; a.t0 = performance.now(); a.p = 0;
  a.tVis = 0; a.tSc = 0.7;
  ring.inert = false; ring.removeAttribute("aria-hidden");
  showRing(folderRing, true); cur = folderRing;
  stage.style.height = "";
  setHero(heroDefault[0], heroDefault[1]);
  backBtn.hidden = true;
  setTimeout(() => { if (arc === a) { a.root.remove(); arc = null; } }, 1000);
}
backBtn.addEventListener("click", closeFolder);

addEventListener("keydown", e => {
  if (e.target.closest && e.target.closest("#edPanel")) return;
  if (modalOverlay.classList.contains("active")) return;
  if (arcOn) {
    if (e.key === "Escape") closeFolder();
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); arcGo(1); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); arcGo(-1); }
    return;
  }
  if (!cur || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
  const front = ((Math.round(-cur.angle / cur.step) % cur.n) + cur.n) % cur.n;
  const base = cur.focused >= 0 ? cur.focused : front;
  focusCard(cur, (base + (e.key === "ArrowRight" ? 1 : -1) + cur.n) % cur.n);
}, true);

/* Anel inicial: as pastas */
folderRing = makeRing(ring, categorias.map(c => ({
  nome: c.nome, desc: c.desc, cores: c.cores,
  bar: "arquivos / " + c.nome.toLowerCase(),
  btn: "Abrir pasta · " + c.sites.length,
  onOpen: () => openFolder(c)
})));
folderRing.vis = 1; folderRing.off = 0; folderRing.tVis = 1; folderRing.tOff = 0;
cur = folderRing;

addEventListener("resize", () => { sizeRings(); if (arcOn) sizeArc(); });
sizeRings();
tick();

/* Brilho de vidro: todos os cards, um de cada vez, bem devagar */
let glintLast = null;
function glintLoop() {
  let delay = 1500 + Math.random() * 1500;
  if (!reduce && !document.hidden) {
    const src = (arcOn && arc) ? arc.cards : (folderRing && folderRing.tVis === 1 ? folderRing.cards : []);
    const pool = src.filter(c => c !== glintLast && parseFloat(c.style.opacity) > 0.12);
    if (pool.length) {
      const c = pool[Math.floor(Math.random() * pool.length)];
      glintLast = c;
      c.classList.add("glint");
      setTimeout(() => c.classList.remove("glint"), 3300);
      delay += 3300;                 // só começa o próximo depois que este terminou
    }
  }
  setTimeout(glintLoop, delay);
}
setTimeout(glintLoop, 1200);

/* =========================================================
   CANVAS DE FUNDO: MALHA 3D, ILUMINAÇÃO CENTRAL E LUZ DO MOUSE
   ========================================================= */
const bgCanvas = document.getElementById("bgCanvas");
const bgCtx = bgCanvas.getContext("2d");
const heroSection = document.querySelector(".hero");

let bgW = 0;
let bgH = 0;

let mouse = {
  x: -1000,
  y: -1000,
  intensity: 0,
  isOver: false
};

let bgS = 1;                       // escala do bitmap (0.5 no modo leve = 4x menos pixels)
function resizeBg() {
  bgW = heroSection.clientWidth;
  bgH = heroSection.clientHeight;
  bgCanvas.width = Math.round(bgW * bgS);
  bgCanvas.height = Math.round(bgH * bgS);
}

let bgT = 0;
const resizeBgSoon = () => { clearTimeout(bgT); bgT = setTimeout(resizeBg, 150); };   // evita refazer o canvas a cada quadro
window.addEventListener("resize", resizeBgSoon);
resizeBg();
if (window.ResizeObserver) new ResizeObserver(resizeBgSoon).observe(heroSection);

heroSection.addEventListener("pointermove", e => {
  if (e.pointerType !== "mouse") return;
  const rect = bgCanvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
  mouse.isOver = true;
});

heroSection.addEventListener("pointerleave", () => {
  mouse.isOver = false;
});

let cols = 35, rows = 35, bgFps = 60, bgLast = 0, bgFrame = 0, time = 0;
let gx = new Float32Array(0), gy = new Float32Array(0);
let centerX = 0, centerY = 0;

function setBgQuality() {
  cols = rows = lite ? 14 : innerWidth < 600 ? 20 : 35;
  bgS = lite ? 0.5 : 1;
  bgFps = reduce ? 5 : lite ? 30 : 60;
  gx = new Float32Array(cols * rows);
  gy = new Float32Array(cols * rows);
  resizeBg();
}

function glow(x, y, rad, stops) {
  const g = bgCtx.createRadialGradient(x, y, 0, x, y, rad);
  stops.forEach(s => g.addColorStop(s[0], s[1]));
  bgCtx.fillStyle = g;
  bgCtx.beginPath();
  bgCtx.arc(x, y, rad, 0, Math.PI * 2);
  bgCtx.fill();
}

function drawBackground(t) {
  requestAnimationFrame(drawBackground);
  if (document.hidden || !t) return;
  const elapsed = t - bgLast;
  if (elapsed < 1000 / bgFps - 2) return;          // limita os quadros por segundo
  bgLast = t;
  const dt = Math.min(elapsed, 50) / 16.67;

  bgCtx.setTransform(bgS, 0, 0, bgS, 0, 0);
  bgCtx.clearRect(0, 0, bgW, bgH);
  if (!reduce) time += 0.012 * dt;
  mouse.intensity += ((mouse.isOver ? 1 : 0) - mouse.intensity) * (mouse.isOver ? 0.08 : 0.03);

  if (bgFrame++ % 8 === 0) {                        // posição do palco muda pouco: não precisa medir todo quadro
    const sr = stage.getBoundingClientRect(), hr = heroSection.getBoundingClientRect();
    centerX = sr.left - hr.left + sr.width / 2;
    centerY = sr.top - hr.top + sr.height / 2;
  }

  const cellW = bgW / (cols - 1), cellH = bgH / (rows - 1);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bx = c * cellW, by = r * cellH;
      const w3 = Math.sin((c + r) * 0.12 + time * 1.1) * 7;
      let ox = Math.sin(c * 0.22 + time) * 10 + w3;
      let oy = Math.cos(r * 0.22 + time * 0.8) * 10 + w3;
      if (mouse.intensity > 0.01) {
        const dx = bx - mouse.x, dy = by - mouse.y, dm = Math.hypot(dx, dy);
        if (dm < 180) {
          const force = (1 - dm / 180) * 18 * mouse.intensity, an = Math.atan2(dy, dx);
          ox += Math.cos(an) * force; oy += Math.sin(an) * force;
        }
      }
      gx[r * cols + c] = bx + ox;
      gy[r * cols + c] = by + oy;
    }
  }

  // Agrupa as linhas por transparência: poucas chamadas de stroke em vez de milhares
  const buckets = {};
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c, x = gx[i], y = gy[i];
      let al = 0.07;
      const dc = Math.hypot(x - centerX, y - centerY);
      if (dc < 300) al += (1 - dc / 300) * 0.25;
      if (mouse.intensity > 0.01) {
        const dm = Math.hypot(x - mouse.x, y - mouse.y);
        if (dm < 250) al += (1 - dm / 250) * 0.35 * mouse.intensity;
      }
      const key = Math.round(al * 25);
      const arr = buckets[key] || (buckets[key] = []);
      if (c < cols - 1) arr.push(x, y, gx[i + 1], gy[i + 1]);
      if (r < rows - 1) arr.push(x, y, gx[i + cols], gy[i + cols]);
    }
  }
  bgCtx.lineWidth = 0.8;
  for (const key in buckets) {
    const arr = buckets[key];
    bgCtx.strokeStyle = "rgba(255,255,255," + (key / 25).toFixed(2) + ")";
    bgCtx.beginPath();
    for (let k = 0; k < arr.length; k += 4) { bgCtx.moveTo(arr[k], arr[k + 1]); bgCtx.lineTo(arr[k + 2], arr[k + 3]); }
    bgCtx.stroke();
  }

  if (!lite) {                                       // brilhos ambiente só em aparelhos fortes
    glow(bgW * 0.2 + Math.sin(time * 0.4) * 100, bgH * 0.25 + Math.cos(time * 0.5) * 70, 300,
         [[0, "rgba(255,255,255,0.04)"], [1, "rgba(255,255,255,0)"]]);
    glow(bgW * 0.8 + Math.cos(time * 0.5) * 90, bgH * 0.75 + Math.sin(time * 0.6) * 80, 340,
         [[0, "rgba(212,248,98,0.035)"], [1, "rgba(212,248,98,0)"]]);
  }
  glow(centerX, centerY, 280 + Math.sin(time * 1.5) * 15,
       [[0, "rgba(255,255,255,0.22)"], [0.35, "rgba(212,248,98,0.08)"], [0.7, "rgba(124,155,255,0.03)"], [1, "rgba(255,255,255,0)"]]);
  if (mouse.intensity > 0.001) {
    const mi = mouse.intensity;
    glow(mouse.x, mouse.y, 220,
         [[0, "rgba(255,255,255," + (0.18 * mi).toFixed(3) + ")"], [0.4, "rgba(212,248,98," + (0.08 * mi).toFixed(3) + ")"], [1, "rgba(255,255,255,0)"]]);
  }
}

setBgQuality();
requestAnimationFrame(drawBackground);

