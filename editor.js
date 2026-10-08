/* Carrega os dados (salvos no navegador ou padrão), aplica contato/textos e, com ?editar, mostra o painel */
(async function () {
  const KEY = "portfolio_dados_v1", CK = "portfolio_cache";
  const CFG = window.FIREBASE_CFG || {};
  const remoto = !!(CFG.projectId && CFG.apiKey);
  const URLDOC = "https://firestore.googleapis.com/v1/projects/" + CFG.projectId + "/databases/(default)/documents/site/dados";
  let dados = DADOS_PADRAO;
  const lerLS = k => { try { const d = JSON.parse(localStorage.getItem(k)); return d && d.categorias ? d : null; } catch (e) { return null; } };
  if (remoto) {
    try {
      const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 2500);
      const r = await fetch(URLDOC, { signal: ctl.signal, cache: "no-store" });
      clearTimeout(tm);
      if (r.ok) { const d = JSON.parse((await r.json()).fields.json.stringValue); if (d.categorias) { dados = d; localStorage.setItem(CK, JSON.stringify(d)); } }
      else if (r.status !== 404) throw 0;
    } catch (e) { dados = lerLS(CK) || dados; }
  } else dados = lerLS(KEY) || dados;
  window.categorias = dados.categorias;

  const $ = id => document.getElementById(id);
  const c = dados.contato || {}, t = dados.textos || {};
  const setLink = (el, val, href, txt) => { el.style.display = val ? "" : "none"; if (val) { el.href = href; if (txt) el.textContent = txt; } };
  setLink($("ctEmail"), c.email, "mailto:" + c.email, c.email);
  const ig = String(c.instagram || "").replace(/^.*instagram\.com\//i, "").replace(/[@\/?].*$/g, "").trim();
  setLink($("ctInsta"), ig, "https://instagram.com/" + ig);
  const wa = String(c.whatsapp || "").replace(/\D/g, "");
  setLink($("ctWpp"), wa, "https://wa.me/" + wa);
  if (t.titulo) { document.querySelector(".hero h1").textContent = t.titulo; document.title = t.titulo; }
  if (t.sub) document.querySelector(".hero p.sub").textContent = t.sub;

  const sc = document.createElement("script"); sc.src = "script.js"; document.body.appendChild(sc);

  /* Painel só aparece com ?editar na URL (fica lembrado neste navegador) */
  if (/[?&#]editar/.test(location.href)) localStorage.setItem("portfolio_admin", "1");
  if (localStorage.getItem("portfolio_admin") !== "1") return;

  let ed;
  const e = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const hex = v => /^#[0-9a-f]{6}$/i.test(v) ? v : "#444444";
  const inp = (p, l, v, extra = "") => `<label>${l}<input data-p="${p}" ${extra} value="${e(v)}"></label>`;
  const txt = (p, l, v) => `<label>${l}<textarea rows="2" data-p="${p}">${e(v)}</textarea></label>`;
  const col = (p, l, v) => `<label>${l}<input type="color" data-p="${p}" value="${hex(v)}"></label>`;

  const panel = document.createElement("div");
  panel.id = "edPanel";
  panel.innerHTML = '<div class="ed-body" id="edBody"></div><div class="ed-foot"><button class="main" data-a="save">Publicar</button><button data-a="dl">Baixar dados.js</button><button data-a="reset" class="danger">Restaurar</button><button data-a="close">Fechar</button></div>';
  if (remoto) {
    const lg = document.createElement("div");
    lg.style.cssText = "padding:10px 14px;border-top:1px solid #2a2a2a;background:#0c0c0c";
    lg.innerHTML = '<label>Login de administrador (para publicar)<input id="edEmail" type="email" placeholder="e-mail" autocomplete="username"></label><label><input id="edSenha" type="password" placeholder="senha" autocomplete="current-password"></label>';
    panel.insertBefore(lg, panel.querySelector(".ed-foot"));
    lg.querySelector("#edEmail").value = localStorage.getItem("portfolio_email") || "";
  }
  const gear = document.createElement("button");
  gear.id = "edGear"; gear.textContent = "⚙"; gear.setAttribute("aria-label", "Editar site");
  document.body.append(panel, gear);

  function render() {
    const open = [...panel.querySelectorAll("details[open]")].map(d => d.dataset.k);
    const sc = $("edBody").scrollTop;
    let h = "<h3>Textos da página</h3>" + inp("textos.titulo", "Título", ed.textos.titulo) + txt("textos.sub", "Subtítulo", ed.textos.sub);
    h += "<h3>Contato</h3>" + inp("contato.email", "E-mail (vazio = esconde)", ed.contato.email) +
         inp("contato.instagram", "Instagram (usuário ou link)", ed.contato.instagram) +
         inp("contato.whatsapp", "WhatsApp (com DDI+DDD, ex.: 5531999999999)", ed.contato.whatsapp, 'inputmode="tel"');
    h += "<h3>Pastas (carrossel) e arquivos (arco)</h3>";
    ed.categorias.forEach((p, i) => {
      const b = "categorias." + i;
      h += `<details data-k="c${i}"><summary>📁 ${e(p.nome)} · ${p.sites.length}</summary>` +
        inp(b + ".nome", "Nome da pasta", p.nome) + txt(b + ".desc", "Descrição", p.desc) +
        `<div class="ed-2">${col(b + ".cores.0", "Cor 1", p.cores[0])}${col(b + ".cores.1", "Cor 2", p.cores[1])}</div>` +
        `<div class="ed-row"><button data-a="up" data-i="${i}">↑</button><button data-a="down" data-i="${i}">↓</button><button class="danger" data-a="delc" data-i="${i}">Remover pasta</button></div>`;
      p.sites.forEach((s, j) => {
        const q = b + ".sites." + j;
        h += `<details data-k="c${i}s${j}"><summary>📄 ${e(s.nome)}</summary>` +
          inp(q + ".nome", "Nome", s.nome) + inp(q + ".url", "Link (vazio = “Em breve”)", s.url, 'inputmode="url"') +
          txt(q + ".desc", "Descrição", s.desc) + inp(q + ".tags", "Tags (separe por vírgula)", (s.tags || []).join(", "), "data-tags") +
          `<div class="ed-2">${col(q + ".cores.0", "Cor 1", s.cores[0])}${col(q + ".cores.1", "Cor 2", s.cores[1])}</div>` +
          inp(q + ".img", "Imagem (caminho ou link, opcional)", s.img) +
          `<div class="ed-row"><button class="danger" data-a="dels" data-i="${i}" data-j="${j}">Remover arquivo</button></div></details>`;
      });
      h += `<div class="ed-row"><button data-a="adds" data-i="${i}">+ Adicionar arquivo</button></div></details>`;
    });
    h += '<div class="ed-row"><button class="main" data-a="addc">+ Adicionar pasta</button></div>';
    $("edBody").innerHTML = h;
    panel.querySelectorAll("details").forEach(d => { if (open.includes(d.dataset.k)) d.open = true; });
    $("edBody").scrollTop = sc;
  }

  const openPanel = () => { ed = JSON.parse(JSON.stringify(dados)); ed.textos = ed.textos || {}; ed.contato = ed.contato || {}; render(); panel.classList.add("open"); };
  gear.onclick = openPanel;

  async function publicar(btn) {
    const email = $("edEmail").value.trim(), senha = $("edSenha").value, t0 = btn.textContent;
    if (!email || !senha) return alert("Informe o e-mail e a senha de administrador, logo acima dos botões.");
    btn.disabled = true; btn.textContent = "Publicando…";
    try {
      const a = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + CFG.apiKey, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: senha, returnSecureToken: true }) });
      const aj = await a.json();
      if (!a.ok) throw new Error("Login falhou (" + ((aj.error && aj.error.message) || a.status) + ")");
      const r = await fetch(URLDOC + "?updateMask.fieldPaths=json", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer " + aj.idToken }, body: JSON.stringify({ fields: { json: { stringValue: JSON.stringify(ed) } } }) });
      if (!r.ok) throw new Error("Não consegui salvar (" + r.status + "). Confira as regras do Firestore.");
      localStorage.setItem("portfolio_email", email); localStorage.setItem(CK, JSON.stringify(ed));
      location.reload();
    } catch (err) { alert(err.message); btn.disabled = false; btn.textContent = t0; }
  }

  panel.addEventListener("input", ev => {
    const el = ev.target, p = el.dataset.p;
    if (!p) return;
    const k = p.split("."); const last = k.pop();
    let o = ed; k.forEach(x => o = o[x]);
    o[last] = el.hasAttribute("data-tags") ? el.value.split(",").map(x => x.trim()).filter(Boolean) : el.value;
  });

  panel.addEventListener("click", ev => {
    const b = ev.target.closest("button[data-a]");
    if (!b) return;
    const a = b.dataset.a, i = +b.dataset.i, j = +b.dataset.j, L = ed.categorias;
    if (a === "close") return panel.classList.remove("open");
    if (a === "save") return remoto ? publicar(b) : (localStorage.setItem(KEY, JSON.stringify(ed)), location.reload());
    if (a === "reset" && remoto) { if (confirm("Carregar no editor os dados originais do dados.js? (só vale depois de Publicar)")) { ed = JSON.parse(JSON.stringify(DADOS_PADRAO)); render(); } return; }
    if (a === "reset") { if (confirm("Voltar aos dados originais do arquivo dados.js?")) { localStorage.removeItem(KEY); location.reload(); } return; }
    if (a === "dl") {
      const f = new Blob(["// DADOS DO SITE (gerado pelo editor). Para editar: abra seusite/?editar\nconst DADOS_PADRAO = " + JSON.stringify(ed, null, 2) + ";\n"], { type: "text/javascript" });
      const l = document.createElement("a"); l.href = URL.createObjectURL(f); l.download = "dados.js"; l.click(); return;
    }
    if (a === "addc") L.push({ nome: "Nova pasta", desc: "Descrição da pasta.", cores: ["#222222", "#3E63DD"], sites: [] });
    if (a === "adds") L[i].sites.push({ nome: "Novo site", url: "", desc: "Descrição do site.", tags: [], cores: ["#222222", "#3E63DD"], img: "" });
    if (a === "dels") L[i].sites.splice(j, 1);
    if (a === "delc") { if (L.length <= 3) return alert("Mantenha pelo menos 3 pastas para o carrossel funcionar bem."); if (!confirm("Remover a pasta e todos os arquivos dela?")) return; L.splice(i, 1); }
    if (a === "up" && i > 0) [L[i - 1], L[i]] = [L[i], L[i - 1]];
    if (a === "down" && i < L.length - 1) [L[i + 1], L[i]] = [L[i], L[i + 1]];
    render();
  });
})();
