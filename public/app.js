const app = document.getElementById("app");
let DATA = null;

async function load() {
  if (DATA) return DATA;
  const res = await fetch("cursos.json");
  DATA = await res.json();
  return DATA;
}

function route() {
  const hash = location.hash.replace(/^#\/?/, "");
  const [cursoSlug, aulaSlug] = hash.split("/");

  if (!cursoSlug) return renderHome();
  if (!aulaSlug) return renderCurso(cursoSlug);
  return renderAula(cursoSlug, aulaSlug);
}

async function renderHome() {
  const { cursos } = await load();
  app.className = "home";
  app.innerHTML = `
    <h1>Cursos disponíveis</h1>
    <div class="grid">
      ${cursos
        .map(
          (c) => `
        <a class="card" href="#/${c.slug}">
          <h2>${c.title}</h2>
          <p>${c.description || ""}</p>
          <span>${c.aulas.length} aulas</span>
        </a>`
        )
        .join("")}
    </div>`;
}

async function renderCurso(slug) {
  const { cursos } = await load();
  const curso = cursos.find((c) => c.slug === slug);
  if (!curso) return renderNotFound();

  if (curso.aulas.length) return (location.hash = `#/${slug}/${curso.aulas[0].slug}`);

  app.innerHTML = `<h1>${curso.title}</h1><p>Este curso ainda não tem aulas.</p>`;
}

async function renderAula(cursoSlug, aulaSlug) {
  const { cursos } = await load();
  const curso = cursos.find((c) => c.slug === cursoSlug);
  if (!curso) return renderNotFound();

  const i = curso.aulas.findIndex((a) => a.slug === aulaSlug);
  if (i === -1) return renderNotFound();

  const aula = curso.aulas[i];
  const prev = curso.aulas[i - 1];
  const next = curso.aulas[i + 1];

  app.className = "layout";
  app.innerHTML = `
    <aside>
      <h3>${curso.title}</h3>
      <nav>
        ${curso.aulas
          .map(
            (a) => `<a href="#/${cursoSlug}/${a.slug}" class="${a.slug === aulaSlug ? "active" : ""}">${a.title}</a>`
          )
          .join("")}
      </nav>
    </aside>
    <article>
      ${aula.html}
      <div class="pager">
        ${prev ? `<a href="#/${cursoSlug}/${prev.slug}">← ${prev.title}</a>` : "<span></span>"}
        ${next ? `<a href="#/${cursoSlug}/${next.slug}">${next.title} →</a>` : "<span></span>"}
      </div>
    </article>`;

  window.scrollTo(0, 0);
}

function renderNotFound() {
  app.className = "";
  app.innerHTML = `<h1>404</h1><p>Conteúdo não encontrado.</p><a href="#">Voltar</a>`;
}

window.addEventListener("hashchange", route);
route();
