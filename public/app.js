const app = document.getElementById("app");
const menuToggle = document.getElementById("menu-toggle");
const readbar = document.getElementById("readbar");

const STORE = "cursos-progresso";

let DATA = null;

/* ---------- progresso ---------- */
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

/* ---------- ícones ---------- */
const ICO = {
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  arrow:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  back:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  clock:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>',
  book:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z"/></svg>',
};

/* ---------- dados ---------- */
async function load() {
  if (DATA) return DATA;
  const res = await fetch("cursos.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("cursos.json nao encontrado. Rode: npm run build");
  DATA = await res.json();
  return DATA;
}

/* ---------- scroll bar ---------- */
function trackReading() {
  const article = document.querySelector("article");
  if (!article) {
    readbar.style.width = "0%";
    return;
  }
  const update = () => {
    const top = article.getBoundingClientRect().top + window.scrollY;
    const height = article.offsetHeight;
    const seen = window.scrollY + window.innerHeight - top;
    const ratio = Math.min(1, Math.max(0, seen / height));
    readbar.style.width = ratio * 100 + "%";
  };
  window.removeEventListener("scroll", update);
  window.addEventListener("scroll", update, { passive: true });
  update();
}

/* ---------- roteamento ---------- */
function route() {
  const hash = location.hash.replace(/^#\/?/, "");
  const [cursoSlug, aulaSlug] = hash.split("/").filter(Boolean);
  app.classList.remove("layout", "home");
  document.body.classList.remove("menu-open");

  if (!cursoSlug) return renderHome();
  if (!aulaSlug) return renderCurso(cursoSlug);
  return renderAula(cursoSlug, aulaSlug);
}

/* ---------- HOME ---------- */
async function renderHome() {
  let data;
  try {
    data = await load();
  } catch (e) {
    return renderError(e.message);
  }

  document.title = "Cursos";
  readbar.style.width = "0%";

  if (!data.cursos.length) {
    app.className = "home";
    app.innerHTML =
      '<div class="empty"><h1>Nenhum curso ainda</h1>' +
      "<p>Crie uma pasta em <code>cursos/</code> com um arquivo <code>00-index.md</code> e faca o push.</p></div>";
    return;
  }

  const feitos = data.cursos.reduce((n, c) => {
    const p = getProgress()[c.slug] || {};
    return n + c.aulas.filter((a) => p[a.slug]).length;
  }, 0);

  app.className = "home";
  app.innerHTML =
    '<section class="hero">' +
    '<p class="eyebrow">Trilhas de estudo</p>' +
    "<h1>Aprenda no seu ritmo</h1>" +
    '<p class="hero-sub">' +
    data.totalCursos +
    " cursos &middot; " +
    data.totalAulas +
    " aulas &middot; " +
    (feitos ? feitos + " concluidas" : "comece por onde quiser") +
    "</p>" +
    "</section>" +
    '<div class="grid">' +
    data.cursos
      .map((c) => {
        const p = pct(c);
        return (
          '<a class="card" href="#/' + c.slug + '">' +
          '<div class="card-cover">' +
          (c.cover
            ? '<img src="' + c.cover + '" alt="" loading="lazy" />'
            : '<div class="cover-fallback">' + ICO.book + "</div>") +
          (p > 0 ? '<span class="badge-done">' + p + "%</span>" : "") +
          "</div>" +
          '<div class="card-body">' +
          "<h2>" + c.title + "</h2>" +
          "<p>" + (c.description || "Sem descricao.") + "</p>" +
          '<div class="card-meta">' +
          "<span>" + ICO.book + c.aulas.length + " aulas</span>" +
          "<span>" + ICO.clock + c.hours + "h</span>" +
          "</div>" +
          '<div class="bar"><div class="bar-fill" style="width:' + p + '%"></div></div>' +
          "</div>" +
          "</a>"
        );
      })
      .join("") +
    "</div>";
}

/* ---------- CURSO ---------- */
async function renderCurso(slug) {
  let data;
  try {
    data = await load();
  } catch (e) {
    return renderError(e.message);
  }

  const curso = data.cursos.find((c) => c.slug === slug);
  if (!curso) return renderNotFound();

  document.title = curso.title + " \u00b7 Cursos";

  if (curso.aulas.length) {
    location.replace("#/" + slug + "/" + curso.aulas[0].slug);
    return;
  }

  app.className = "layout";
  app.innerHTML =
    "<aside>" +
    '<a class="back" href="#/">' + ICO.back + " Todos os cursos</a>" +
    "<h3>" + curso.title + "</h3>" +
    "</aside>" +
    "<article>" + (curso.html || "<p>Este curso ainda nao tem aulas.</p>") + "</article>";
}

/* ---------- AULA ---------- */
async function renderAula(cursoSlug, aulaSlug) {
  let data;
  try {
    data = await load();
  } catch (e) {
    return renderError(e.message);
  }

  const curso = data.cursos.find((c) => c.slug === cursoSlug);
  if (!curso) return renderNotFound();

  const i = curso.aulas.findIndex((a) => a.slug === aulaSlug);
  if (i === -1) return renderNotFound();

  const aula = curso.aulas[i];
  const prev = curso.aulas[i - 1];
  const next = curso.aulas[i + 1];
  const p = pct(curso);
  const done = isDone(cursoSlug, aulaSlug);

  document.title = aula.title + " \u00b7 " + curso.title;

  const proxima = next || curso.aulas[0];

  app.className = "layout";
  app.innerHTML =
    "<aside>" +
    '<a class="back" href="#/">' + ICO.back + " Todos os cursos</a>" +
    "<h3>" + curso.title + "</h3>" +
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
          '<span class="nav-check">' + (d ? ICO.check : idx + 1) + "</span>" +
          '<span class="nav-label">' + a.title + "</span>" +
          "</a>"
        );
      })
      .join("") +
    "</nav>" +
    "</aside>" +
    "<article>" +
    '<header class="lesson-head">' +
    "<h1>" + aula.title + "</h1>" +
    '<div class="lesson-meta">' +
    "<span>" + ICO.clock + aula.minutes + " min de leitura</span>" +
    "<span>Aula " + (i + 1) + " de " + curso.aulas.length + "</span>" +
    "</div>" +
    "</header>" +
    aula.html +
    '<div class="lesson-actions">' +
    '<button class="btn-done' + (done ? " is-done" : "") + '" id="mark-done">' +
    (done ? ICO.check + " Aula concluida" : "Marcar como concluida") +
    "</button>" +
    "</div>" +
    '<div class="pager">' +
    (prev
      ? '<a class="prev" href="#/' + cursoSlug + "/" + prev.slug + '">' +
        '<span class="pager-dir">' + ICO.back + " Anterior</span>" +
        '<span class="pager-title">' + prev.title + "</span></a>"
      : "<span></span>") +
    (proxima
      ? '<a class="next" href="#/' + cursoSlug + "/" + proxima.slug + '">' +
        '<span class="pager-dir">' + (next ? "Proxima" : "Recomecar") + " " + ICO.arrow + "</span>" +
        '<span class="pager-title">' + proxima.title + "</span></a>"
      : '<a class="next" href="#/">' +
        '<span class="pager-dir">Fim do curso ' + ICO.arrow + "</span>" +
        '<span class="pager-title">Voltar aos cursos</span></a>') +
    "</div>" +
    "</article>";

  const btn = document.getElementById("mark-done");
  btn.addEventListener("click", () => {
    const now = !isDone(cursoSlug, aulaSlug);
    setDone(cursoSlug, aulaSlug, now);
    renderAula(cursoSlug, aulaSlug);
  });

  window.scrollTo({ top: 0 });
  trackReading();
}

/* ---------- erros ---------- */
function renderNotFound() {
  app.className = "home";
  app.innerHTML =
    '<div class="empty"><h1>404</h1><p>Conteudo nao encontrado.</p>' +
    '<a class="btn" href="#/">Voltar aos cursos</a></div>';
  readbar.style.width = "0%";
}

function renderError(msg) {
  app.className = "home";
  app.innerHTML =
    '<div class="empty"><h1>Ops</h1><p>' + msg + "</p>" +
    '<a class="btn" href="">Recarregar</a></div>';
  readbar.style.width = "0%";
}

/* ---------- init ---------- */
if (menuToggle) {
  menuToggle.addEventListener("click", () =>
    document.body.classList.toggle("menu-open")
  );
}

window.addEventListener("hashchange", route);
route();
