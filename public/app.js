const app = document.getElementById("app");
const menuToggle = document.getElementById("menu-toggle");
const readbar = document.getElementById("readbar");

const STORE = "cursos-progresso";

let DATA = null;

/* ============================================================
   SANITIZACAO
   ============================================================ */
const TAGS_PERIGOSAS =
  /<\s*\/?\s*(script|iframe|object|embed|form|input|button|link|meta|base|style|svg|math)\b[^>]*>/gi;

const ATRIBUTOS_PERIGOSOS =
  /\s+(on[a-z]+|srcdoc|formaction|xlink:href)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;

function sanitize(html) {
  return String(html)
    .replace(TAGS_PERIGOSAS, "")
    .replace(ATRIBUTOS_PERIGOSOS, "")
    .replace(/javascript:/gi, "")
    .replace(/data:text\/html/gi, "");
}

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* ============================================================
   PROGRESSO
   ============================================================ */
function getProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORE) || "{}");
  } catch {
    return {};
  }
}
function setDone(cursoSlug, aulaSlug, done) {
  const p = getProgress();
  p[cursoSlug] = p[cursoSlug] || {};
  if (done) p[cursoSlug][aulaSlug] = true;
  else delete p[cursoSlug][aulaSlug];
  localStorage.setItem(STORE, JSON.stringify(p));
}
function isDone(cursoSlug, aulaSlug) {
  const p = getProgress();
  return Boolean(p[cursoSlug] && p[cursoSlug][aulaSlug]);
}
function pct(curso) {
  if (!curso.aulas.length) return 0;
  const p = getProgress()[curso.slug] || {};
  const n = curso.aulas.filter((a) => p[a.slug]).length;
  return Math.round((n / curso.aulas.length) * 100);
}

/* ============================================================
   ICONES
   ============================================================ */
const ICO = {
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  arrow:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  back:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  clock:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>',
  book:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z"/></svg>',
  layers:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 8 12 14 2 8 12 2"/><polyline points="2 14 12 20 22 14"/></svg>',
};

/* ============================================================
   DADOS
   ============================================================ */
async function load() {
  if (DATA) return DATA;
  const res = await fetch("cursos.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("cursos.json nao encontrado. Rode: pnpm run build");
  DATA = await res.json();
  return DATA;
}

/* ============================================================
   BARRA DE LEITURA — um unico listener, referencia estavel
   ============================================================ */
let onScrollAtual = null;

function trackReading() {
  const alvo =
    document.querySelector("article") || document.querySelector(".ap-conteudo");

  if (onScrollAtual) {
    window.removeEventListener("scroll", onScrollAtual);
    onScrollAtual = null;
  }

  if (!alvo) {
    readbar.style.width = "0%";
    return;
  }

  onScrollAtual = () => {
    const top = alvo.getBoundingClientRect().top + window.scrollY;
    const altura = alvo.offsetHeight;
    if (altura <= 0) return;
    const visto = window.scrollY + window.innerHeight - top;
    const ratio = Math.min(1, Math.max(0, visto / altura));
    readbar.style.width = ratio * 100 + "%";
  };

  window.addEventListener("scroll", onScrollAtual, { passive: true });
  onScrollAtual();
}

/* ============================================================
   PEDACOS REUTILIZAVEIS
   ============================================================ */
const seloNivel = (curso) =>
  curso.nivel
    ? '<span class="selo selo-' + curso.nivel + '">' + esc(curso.nivelNome) + "</span>"
    : "";

const pilulasTags = (curso) =>
  curso.tags && curso.tags.length
    ? '<div class="tags">' +
    curso.tags.map((t) => '<span class="tag">' + esc(t) + "</span>").join("") +
    "</div>"
    : "";

function cardCurso(c) {
  const p = pct(c);
  return (
    '<a class="card" href="#/apresentacao/' + c.slug + '">' +
    '<div class="card-cover">' +
    (c.cover
      ? '<img src="' + esc(c.cover) + '" alt="" loading="lazy" />'
      : '<div class="cover-fallback">' + ICO.layers + "</div>") +
    seloNivel(c) +
    (p > 0 ? '<span class="badge-done">' + p + "%</span>" : "") +
    "</div>" +
    '<div class="card-body">' +
    "<h2>" + esc(c.title) + "</h2>" +
    "<p>" + esc(c.description || "Sem descricao.") + "</p>" +
    '<div class="card-meta">' +
    "<span>" + ICO.book + c.aulas.length + "</span>" +
    "<span>" + ICO.clock + c.hours + "h</span>" +
    "</div>" +
    '<div class="bar"><div class="bar-fill" style="width:' + p + '%"></div></div>' +
    "</div>" +
    "</a>"
  );
}

function blocoNivel(n) {
  return (
    '<section class="nivel-bloco">' +
    '<div class="nivel-head">' +
    '<div class="nivel-titulo">' +
    '<span class="selo selo-' + n.slug + '">' + esc(n.nome) + "</span>" +
    "<h2>" + esc(n.nome) + "</h2>" +
    '<span class="meta-mono">' +
    n.total + " trilhas &middot; " + n.horas + "h</span>" +
    "</div>" +
    "</div>" +
    '<div class="grid">' +
    n.cursos
      .map((s) => DATA.cursos.find((c) => c.slug === s))
      .filter(Boolean)
      .map(cardCurso)
      .join("") +
    "</div>" +
    "</section>"
  );
}

/* ============================================================
   ROTEAMENTO
   ============================================================ */
function route() {
  const hash = location.hash.replace(/^#\/?/, "");
  const p = hash.split("/").filter(Boolean);

  app.classList.remove("layout", "home", "apresentacao");
  document.body.classList.remove("menu-open");

  if (p[0] === "sobre") return renderSobre();
  if (p[0] === "apresentacao" && p[1]) return renderApresentacao(p[1]);
  if (!p.length) return renderHome();
  if (p.length === 1) return renderIndice(p[0]);
  return renderAula(p[0], p[1]);
}

/* ============================================================
   HOME — agrupada por nivel
   ============================================================ */
async function renderHome() {
  let data;
  try {
    data = await load();
  } catch (e) {
    return renderError(e.message);
  }

  document.title = "Sec / Research";
  readbar.style.width = "0%";

  if (!data.cursos.length) {
    app.className = "home";
    app.innerHTML =
      '<div class="empty"><h1>Nenhum curso ainda</h1>' +
      "<p>Crie uma pasta em <code>cursos/</code> com uma ementa e faca o push.</p></div>";
    return;
  }

  const iniciados = data.cursos.filter((c) => pct(c) > 0).length;
  const semNivelLista = data.cursos.filter((c) => !c.nivel);
  const niveis = data.niveis || [];

  app.className = "home";
  app.innerHTML =
    '<section class="home-hero">' +
    "<div>" +
    '<p class="eyebrow">Pesquisa &middot; Engenharia &middot; Experimentacao</p>' +
    "<h1>Biblioteca tecnica de pesquisa em seguranca</h1>" +
    '<p class="lede">Entenda o sistema. Investigue o comportamento. Produza conhecimento. ' +
    "Material autoral de baixo nivel, engenharia reversa, fuzzing e analise defensiva.</p>" +
    "</div>" +
    '<div class="home-stats">' +
    '<div class="stat"><b>' + data.totalCursos + "</b><span>Trilhas</span></div>" +
    '<div class="stat"><b>' + data.totalAulas + "</b><span>Aulas</span></div>" +
    '<div class="stat"><b>' + data.totalHoras + "h</b><span>Estudo</span></div>" +
    '<div class="stat"><b>' + iniciados + "</b><span>Em curso</span></div>" +
    "</div>" +
    "</section>" +
    niveis
      .filter((n) => n.total > 0)
      .map(blocoNivel)
      .join("") +
    (semNivelLista.length
      ? '<section class="nivel-bloco">' +
      '<div class="nivel-head">' +
      '<div class="nivel-titulo">' +
      "<h2>Outras trilhas</h2>" +
      '<span class="meta-mono">' +
      semNivelLista.length +
      " sem nivel definido</span>" +
      "</div>" +
      "</div>" +
      '<div class="grid">' +
      semNivelLista.map(cardCurso).join("") +
      "</div>" +
      "</section>"
      : "");

  window.scrollTo({ top: 0 });
}

/* ============================================================
   SOBRE / METODO
   ============================================================ */
async function renderSobre() {
  let data = null;
  try {
    data = await load();
  } catch {
    data = { totalCursos: 0, totalAulas: 0 };
  }

  document.title = "Metodo \u00b7 Sec / Research";
  readbar.style.width = "0%";

  app.className = "home";
  app.innerHTML =
    '<section class="home-hero">' +
    "<div>" +
    '<p class="eyebrow">Metodo</p>' +
    "<h1>Como este material e construido</h1>" +
    '<p class="lede">Cada trilha segue o mesmo desenho: teoria curta, demonstracao com ' +
    "saida real, laboratorio reproduzivel e criterio de validacao.</p>" +
    "</div>" +
    '<div class="home-stats">' +
    '<div class="stat"><b>' + (data.totalCursos || 0) + "</b><span>Trilhas</span></div>" +
    '<div class="stat"><b>' + (data.totalAulas || 0) + "</b><span>Aulas</span></div>" +
    '<div class="stat"><b>~65%</b><span>Pratica</span></div>' +
    "</div>" +
    "</section>" +
    '<div class="ap-conteudo" style="margin-top:2.5rem;max-width:76ch">' +
    "<h2>Os quatro niveis</h2>" +
    "<ul>" +
    "<li><strong>Básico</strong> &mdash; sem pre-requisito tecnico. Ponto de partida.</li>" +
    "<li><strong>Intermediário</strong> &mdash; exige base de programacao ou de sistema.</li>" +
    "<li><strong>Avançado</strong> &mdash; exige dois ou tres cursos do material.</li>" +
    "<li><strong>Especialista</strong> &mdash; encadeia os anteriores em sequencia.</li>" +
    "</ul>" +
    "<h2>O que voce encontra em cada modulo</h2>" +
    "<ul>" +
    "<li><strong>Teoria</strong> &mdash; o conceito no menor numero de palavras possivel.</li>" +
    "<li><strong>Demonstracao</strong> &mdash; codigo que roda, com a saida real colada.</li>" +
    "<li><strong>Laboratorio</strong> &mdash; ambiente reproduzivel, procedimento e hipotese.</li>" +
    "<li><strong>Avaliacao</strong> &mdash; criterio explicito do que conta como feito.</li>" +
    "</ul>" +
    "<h2>Principios</h2>" +
    '<blockquote><p>Funcionou <strong>neste</strong> caso. A pergunta e sempre por que &mdash; ' +
    "e o que mudaria se a entrada fosse outra.</p></blockquote>" +
    "<p>Todo alvo e seu, na sua maquina. O bug e provocado no codigo que voce escreveu, " +
    "para que voce entenda o mecanismo antes de reconhecer o sintoma.</p>" +
    "</div>";

  window.scrollTo({ top: 0 });
}

/* ============================================================
   INDICE DO CURSO
   ============================================================ */
async function renderIndice(slug) {
  let data;
  try {
    data = await load();
  } catch (e) {
    return renderError(e.message);
  }

  const curso = data.cursos.find((c) => c.slug === slug);
  if (!curso) return renderNotFound();

  if (curso.temApresentacao) {
    location.replace("#/apresentacao/" + slug);
    return;
  }

  if (!curso.aulas.length) {
    document.title = curso.title + " \u00b7 Biblioteca";
    app.className = "layout";
    app.innerHTML =
      '<aside class="side">' +
      '<a class="side-back" href="#/">' + ICO.back + " Biblioteca</a>" +
      '<h3 class="side-title">' + esc(curso.title) + "</h3>" +
      "</aside>" +
      "<article>" + sanitize(curso.html || "<p>Este curso ainda nao tem aulas.</p>") + "</article>";
    return;
  }

  location.replace("#/" + slug + "/" + curso.aulas[0].slug);
}

/* ============================================================
   APRESENTACAO — selo + tags
   ============================================================ */
async function renderApresentacao(slug) {
  let data;
  try {
    data = await load();
  } catch (e) {
    return renderError(e.message);
  }

  const curso = data.cursos.find((c) => c.slug === slug);
  if (!curso) return renderNotFound();

  document.title = curso.title + " \u00b7 Biblioteca";

  const p = pct(curso);
  const feitas = curso.aulas.filter((a) => isDone(slug, a.slug)).length;
  const comecou = feitas > 0;
  const alvo = curso.aulas.find((a) => !isDone(slug, a.slug)) || curso.aulas[0];

  app.className = "apresentacao";
  app.innerHTML =
    '<div class="ap-hero' + (curso.cover ? " com-capa" : "") + '">' +
    (curso.cover ? '<img class="ap-capa" src="' + esc(curso.cover) + '" alt="" />' : "") +
    '<div class="ap-hero-veu"></div>' +
    '<div class="ap-hero-txt">' +
    '<a class="ap-voltar" href="#/">' + ICO.back + " Biblioteca</a>" +
    '<div class="ap-selo">' + seloNivel(curso) + "</div>" +
    "<h1>" + esc(curso.title) + "</h1>" +
    pilulasTags(curso) +
    '<div class="ap-meta">' +
    "<span>" + ICO.book + curso.aulas.length + " aulas</span>" +
    "<span>" + ICO.clock + curso.hours + "h</span>" +
    (curso.minutes ? "<span>" + curso.minutes + " min de leitura</span>" : "") +
    "</div>" +
    (comecou
      ? '<div class="ap-progresso">' +
      '<div class="ap-progresso-top"><span>' +
      feitas + " / " + curso.aulas.length +
      " concluidas</span><strong>" + p + "%</strong></div>" +
      '<div class="bar"><div class="bar-fill" style="width:' + p + '%"></div></div>' +
      "</div>"
      : "") +
    "</div>" +
    "</div>" +
    '<div class="ap-corpo">' +
    '<div class="ap-conteudo">' +
    sanitize(
      curso.apresentacaoHtml ||
      curso.html ||
      "<p>Este curso ainda nao tem apresentacao.</p>"
    ) +
    "</div>" +
    '<div class="ap-cta">' +
    '<div class="ap-cta-box">' +
    '<span class="ap-cta-kicker">' +
    (comecou ? "Em andamento" : "Trilha disponivel") +
    "</span>" +
    "<strong>" + (comecou ? "Continuar de onde parou" : "Pronto para comecar?") + "</strong>" +
    "<p>" +
    (comecou
      ? "Sua proxima aula e <em>" + esc(alvo ? alvo.title : "") + "</em>."
      : esc(curso.aulas.length) + " aulas, cerca de " + curso.hours + " horas de estudo.") +
    "</p>" +
    (alvo
      ? '<a class="btn-iniciar" href="#/' + slug + "/" + alvo.slug + '">' +
      (comecou ? "Continuar" : "Iniciar") + " " + ICO.arrow + "</a>"
      : "") +
    '<a class="ap-ver-tudo" href="#/' + slug + '/_indice">Ver o conteudo</a>' +
    "</div>" +
    "</div>" +
    "</div>";

  window.scrollTo({ top: 0 });
  trackReading();
}

/* ============================================================
   AULA
   ============================================================ */
async function renderAula(cursoSlug, aulaSlug) {
  let data;
  try {
    data = await load();
  } catch (e) {
    return renderError(e.message);
  }

  const curso = data.cursos.find((c) => c.slug === cursoSlug);
  if (!curso) return renderNotFound();

  if (aulaSlug === "_indice") {
    document.title = curso.title + " \u00b7 Biblioteca";
    app.className = "layout";
    app.innerHTML =
      '<aside class="side">' +
      '<a class="side-back" href="#/apresentacao/' + cursoSlug + '">' +
      ICO.back + " Apresentacao</a>" +
      '<h3 class="side-title">' + esc(curso.title) + "</h3>" +
      "</aside>" +
      "<article>" + sanitize(curso.html || "<p>Sem ementa.</p>") + "</article>";
    window.scrollTo({ top: 0 });
    trackReading();
    return;
  }

  const i = curso.aulas.findIndex((a) => a.slug === aulaSlug);
  if (i === -1) return renderNotFound();

  const aula = curso.aulas[i];
  const prev = curso.aulas[i - 1];
  const next = curso.aulas[i + 1];
  const p = pct(curso);
  const done = isDone(cursoSlug, aulaSlug);
  const proxima = next || curso.aulas[0];

  document.title = aula.title + " \u00b7 " + curso.title;

  app.className = "layout";
  app.innerHTML =
    '<aside class="side">' +
    '<a class="side-back" href="#/apresentacao/' + cursoSlug + '">' +
    ICO.back + " Apresentacao</a>" +
    '<h3 class="side-title">' + esc(curso.title) + "</h3>" +
    '<div class="side-progress">' +
    '<div class="side-progress-top"><span>Progresso</span><strong>' + p + "%</strong></div>" +
    '<div class="bar"><div class="bar-fill" style="width:' + p + '%"></div></div>' +
    "</div>" +
    "<nav>" +
    curso.aulas
      .map((a, idx) => {
        const d = isDone(cursoSlug, a.slug);
        const active = a.slug === aulaSlug;
        return (
          '<a href="#/' + cursoSlug + "/" + a.slug + '" class="' +
          (active ? "active" : "") + (d ? " done" : "") + '">' +
          '<span class="nav-num">' + (d ? ICO.check : idx + 1) + "</span>" +
          "<span>" + esc(a.title) + "</span>" +
          "</a>"
        );
      })
      .join("") +
    "</nav>" +
    "</aside>" +
    "<article>" +
    '<header class="lesson-head">' +
    "<h1>" + esc(aula.title) + "</h1>" +
    '<div class="lesson-meta">' +
    "<span>" + ICO.clock + aula.minutes + " min de leitura</span>" +
    "<span>Modulo " + (i + 1) + " / " + curso.aulas.length + "</span>" +
    "</div>" +
    "</header>" +
    sanitize(aula.html) +
    '<div class="lesson-actions">' +
    '<button class="btn-done' + (done ? " is-done" : "") + '" id="mark-done">' +
    (done ? ICO.check + " Concluida" : "Marcar como concluida") +
    "</button>" +
    "</div>" +
    '<div class="pager">' +
    (prev
      ? '<a class="prev" href="#/' + cursoSlug + "/" + prev.slug + '">' +
      '<span class="pager-dir">' + ICO.back + " Anterior</span>" +
      '<span class="pager-title">' + esc(prev.title) + "</span></a>"
      : '<a class="prev" href="#/apresentacao/' + cursoSlug + '">' +
      '<span class="pager-dir">' + ICO.back + " Apresentacao</span>" +
      '<span class="pager-title">Inicio da trilha</span></a>') +
    (proxima
      ? '<a class="next" href="#/' + cursoSlug + "/" + proxima.slug + '">' +
      '<span class="pager-dir">' + (next ? "Proxima" : "Recomecar") + " " + ICO.arrow + "</span>" +
      '<span class="pager-title">' + esc(proxima.title) + "</span></a>"
      : '<span class="spacer"></span>') +
    "</div>" +
    "</article>";

  const btn = document.getElementById("mark-done");
  btn.addEventListener("click", () => {
    setDone(cursoSlug, aulaSlug, !isDone(cursoSlug, aulaSlug));
    renderAula(cursoSlug, aulaSlug);
  });

  window.scrollTo({ top: 0 });
  trackReading();
}

/* ============================================================
   ERROS
   ============================================================ */
function renderNotFound() {
  app.className = "home";
  app.innerHTML =
    '<div class="empty"><h1>404</h1><p>Conteudo nao encontrado.</p>' +
    '<a class="btn" href="#/">Voltar a biblioteca</a></div>';
  readbar.style.width = "0%";
}

function renderError(msg) {
  app.className = "home";
  app.innerHTML =
    '<div class="empty"><h1>Ops</h1><p>' + esc(msg) + "</p>" +
    '<a class="btn" href="">Recarregar</a></div>';
  readbar.style.width = "0%";
}

/* ============================================================
   INIT
   ============================================================ */
if (menuToggle) {
  menuToggle.addEventListener("click", () =>
    document.body.classList.toggle("menu-open")
  );
}

window.addEventListener("hashchange", route);
route();
