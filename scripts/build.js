import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import hljs from "highlight.js";

const ROOT = "cursos";
const OUT = "public";

// Habilita GitHub Flavored Markdown e mantém as quebras de linha padrão.
marked.setOptions({ gfm: true, breaks: false });

/* ============================================================
   NIVEIS — taxonomia fixa.
   Valor no front matter da ementa; rotulo legivel aqui.
   Ausente ou invalido NAO quebra: entra em "Outras trilhas".
   ============================================================ */
const NIVEIS = {
  basico: { ordem: 0, nome: "Básico" },
  intermediario: { ordem: 1, nome: "Intermediário" },
  avancado: { ordem: 2, nome: "Avançado" },
  especialista: { ordem: 3, nome: "Especialista" },
};

/* ============================================================
   POS-PROCESSAMENTO DO CODIGO
   ============================================================ */
const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// A ordem importa: &amp; por ultimo, senao "&amp;lt;" viraria "<".
const decodeEntities = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

function decorate(html) {
  return html.replace(
    /<pre><code class="language-([\w+-]+)">([\s\S]*?)<\/code><\/pre>/g,
    (_full, lang, body) => {
      const code = decodeEntities(body);
      let inner;
      try {
        inner = hljs.getLanguage(lang)
          ? hljs.highlight(code, { language: lang }).value
          : hljs.highlightAuto(code).value;
      } catch {
        inner = escapeHtml(code);
      }
      return (
        '<div class="code-block"><div class="code-head">' +
        '<span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>' +
        `<span class="lang">${lang}</span></div>` +
        `<pre><code class="hljs language-${lang}">${inner}</code></pre></div>`
      );
    }
  );
}

/* ============================================================
   UTILITARIOS
   ============================================================ */
const slugify = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const TITULO_GENERICO =
  /^(ementa|index|indice|sumario|conteudo|conteúdo|sobre|introducao|introdução|apresentacao|apresentação|curso|descricao|descrição|readme)$/i;

const titleFrom = (content, fallback) => {
  for (const l of String(content).split("\n")) {
    const m = l.match(/^[ \t]*#[ \t]+(.+?)[ \t]*$/);
    if (!m) continue;
    const t = m[1].replace(/[*_`]/g, "").trim();
    if (TITULO_GENERICO.test(t)) continue;
    return t;
  }
  return fallback;
};

const excerptFrom = (content, data) => {
  if (data && data.description) return data.description;

  const linhas = String(content)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith(">") && !l.startsWith("|"))
    .filter((l) => !/^\*\*\s*$/.test(l))
    .filter((l) => !/^[-*_]{3,}$/.test(l));

  for (const l of linhas) {
    const limpo = l
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/^[-*+]\s+/, "")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1")
      .trim();

    if (limpo.length < 15) continue;
    return limpo.length > 200 ? limpo.slice(0, 197) + "..." : limpo;
  }
  return "";
};

/* ---------- front matter: nivel ---------- */
const nivelDe = (data) => {
  if (!data) return null;
  const v = slugify(data.nivel || "");
  return NIVEIS[v] ? v : null;
};

/* ---------- front matter: tags ----------
   "Use-After-Free" e "use after free" viram a mesma tag. */
const tagsDe = (data) => {
  if (!data || !data.tags) return [];
  const bruto = Array.isArray(data.tags) ? data.tags : String(data.tags).split(",");
  return [...new Set(bruto.map((t) => slugify(t)).filter(Boolean))].sort();
};

/* ---------- horas: front matter tem prioridade ---------- */
const horasDe = (data, content) => {
  const declarado = Number(data && data.horas);
  if (Number.isInteger(declarado) && declarado > 0) return declarado;

  const m = String(content || "").match(/(\d{1,3})\s*(?:horas?|h)\b/i);
  const n = m ? Number(m[1]) : null;
  return n && n > 0 && n < 500 ? n : null;
};

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    if (!full.endsWith(".md")) return [];

    const nome = e.name.toLowerCase();
    if (nome === "readme.md") return [];
    if (/^(package|tsconfig|docker-compose|requirements|\.)/.test(nome)) return [];

    return [full];
  });
}

const orderOf = (name) => {
  const m = name.match(/^(\d+)/);
  return m ? Number(m[1]) : 999;
};

/* 0 = ementa/capa · 1 = modulo · 2 = avaliacoes · 3 = glossario · 4 = outros */
const RANK = (nome) => {
  const n = nome.toLowerCase();
  if (/^0*\d*[-_]?(ementa|index)$/.test(n)) return 0;
  if (/^0*\d*[-_]?modulo/.test(n)) return 1;
  if (/^0*\d*[-_]?avalia/.test(n)) return 2;
  if (/^0*\d*[-_]?gloss/.test(n)) return 3;
  return 4;
};

const readingTime = (text) => {
  const words = String(text).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

const IMG_RE = /\.(png|jpe?g|webp|gif|svg|avif)$/i;

/* ============================================================
   IMAGENS DO CURSO
   ============================================================ */
function copiarImagens(dirCurso, folder) {
  const origem = path.join(dirCurso, "img");
  if (!fs.existsSync(origem)) return null;

  const destino = path.join(OUT, "cursos", folder, "img");
  fs.mkdirSync(destino, { recursive: true });

  const nomes = [];
  for (const f of fs.readdirSync(origem, { withFileTypes: true })) {
    if (!f.isFile() || !IMG_RE.test(f.name)) continue;
    fs.copyFileSync(path.join(origem, f.name), path.join(destino, f.name));
    nomes.push(f.name);
  }

  if (!nomes.length) return null;

  nomes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const escolhida =
    nomes.find((n) => /^cover\./i.test(n)) ||
    nomes.find((n) => /^(capa|thumb|banner)\./i.test(n)) ||
    nomes[0];

  return `cursos/${folder}/img/${escolhida}`;
}

/* ============================================================
   VERIFICACAO
   ============================================================ */
if (!fs.existsSync(ROOT)) {
  console.error("Pasta 'cursos/' nao encontrada. Crie a pasta e adicione os .md.");
  process.exit(1);
}

/* ============================================================
   COLETA
   ============================================================ */
const cursos = [];
const problemas = [];
const semNivel = [];
let imagensCopiadas = 0;

for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const dir = path.join(ROOT, entry.name);
  const arquivos = walk(dir);

  /* ---------- apresentacao (README.md) ---------- */
  const readme = path.join(dir, "README.md");
  let apresentacaoHtml = "";
  let temApresentacao = false;

  if (fs.existsSync(readme)) {
    const brutoAp = fs.readFileSync(readme, "utf8");
    const { content: contentAp } = matter(brutoAp);
    try {
      apresentacaoHtml = decorate(marked.parse(contentAp));
      temApresentacao = true;
    } catch (err) {
      problemas.push(`${path.relative(ROOT, readme)}: ${err.message}`);
    }
  }

  /* ---------- paginas (ementa + aulas) ---------- */
  const parsed = arquivos.map((file) => {
    const nome = path.basename(file, ".md");
    const bruto = fs.readFileSync(file, "utf8");

    let data = {};
    let content = bruto;

    try {
      const m = matter(bruto);
      data = m.data || {};
      content = m.content;
    } catch (err) {
      problemas.push(
        `${path.relative(ROOT, file)}: YAML invalido — ${err.reason || err.message}`
      );
      // segue com o arquivo bruto: o curso publica sem metadados
    }

    const limpo = nome.replace(/^\d+[-_]?/, "");
    const rank = RANK(nome);

    let html = "";
    try {
      html = decorate(marked.parse(content));
    } catch (err) {
      problemas.push(`${path.relative(ROOT, file)}: ${err.message}`);
      html = "<p><em>Erro ao processar este arquivo.</em></p>";
    }

    return {
      nome,
      rank,
      isIndex: rank === 0,
      data,
      content,
      title:
        data.title ||
        titleFrom(content, limpo.replace(/[-_]/g, " ")) ||
        "Sem titulo",
      order: data.order ?? orderOf(nome),
      slug: slugify(nome),
      html,
      minutes: readingTime(content),
      excerpt: excerptFrom(content, data),
    };
  });


  const index = parsed.find((p) => p.isIndex);
  const aulas = parsed
    .filter((p) => !p.isIndex)
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.order - b.order ||
        a.title.localeCompare(b.title)
    );

  /* ---------- nivel e tags (tolerantes) ---------- */
  const nivel = index ? nivelDe(index.data) : null;
  const tags = index ? tagsDe(index.data) : [];

  if (nivel === null) {
    const brutoNivel = String(index?.data?.nivel ?? "").trim();
    semNivel.push(brutoNivel ? `${entry.name} (nivel: "${brutoNivel}")` : entry.name);
  }

  /* ---------- capa ---------- */
  const capaAuto = copiarImagens(dir, entry.name);
  if (capaAuto) imagensCopiadas++;

  const coverFile = index?.data?.cover;
  const cover = coverFile ? String(coverFile).replace(/^\.?\/?/, "") : capaAuto;

  /* ---------- horas ---------- */
  const horas = index ? horasDe(index.data, index.content) : null;
  const minutos = aulas.reduce((n, a) => n + a.minutes, 0);

  cursos.push({
    slug: slugify(entry.name.replace(/^\d+[-_]?/, "")),
    folder: entry.name,
    title:
      index?.title ||
      entry.name.replace(/^\d+[-_]?/, "").replace(/[-_]/g, " "),
    description: index?.excerpt || "",
    cover,

    nivel,
    nivelOrdem: nivel ? NIVEIS[nivel].ordem : 99,
    nivelNome: nivel ? NIVEIS[nivel].nome : null,
    tags,

    horas,
    hours: horas || Math.max(1, Math.round(minutos / 60)),
    minutes: minutos,

    html: index?.html || "",
    hasEmenta: Boolean(index),
    temApresentacao,
    apresentacaoHtml,
    aulas: aulas.map((a) => ({
      slug: a.slug,
      title: a.title,
      html: a.html,
      minutes: a.minutes,
    })),
  });
}

cursos.sort((a, b) => a.nivelOrdem - b.nivelOrdem || a.title.localeCompare(b.title));

/* ============================================================
   TOTALIZADORES
   ============================================================ */
const niveis = Object.entries(NIVEIS)
  .map(([slug, n]) => {
    const doNivel = cursos.filter((c) => c.nivel === slug);
    return {
      slug,
      nome: n.nome,
      ordem: n.ordem,
      total: doNivel.length,
      horas: doNivel.reduce((s, c) => s + (c.hours || 0), 0),
      aulas: doNivel.reduce((s, c) => s + c.aulas.length, 0),
      cursos: doNivel.map((c) => c.slug),
    };
  })
  .sort((a, b) => a.ordem - b.ordem);

const todasTags = [...new Set(cursos.flatMap((c) => c.tags))].sort();

/* ============================================================
   SAIDA
   ============================================================ */
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(
  path.join(OUT, "cursos.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      totalCursos: cursos.length,
      totalAulas: cursos.reduce((n, c) => n + c.aulas.length, 0),
      totalHoras: cursos.reduce((s, c) => s + (c.hours || 0), 0),
      niveis,
      tags: todasTags,
      cursos,
    },
    null,
    2
  )
);

/* ============================================================
   RELATORIO
   ============================================================ */
const totalAulas = cursos.reduce((n, c) => n + c.aulas.length, 0);
const totalHoras = cursos.reduce((s, c) => s + (c.hours || 0), 0);

console.log(
  `${cursos.length} curso(s) e ${totalAulas} aula(s) e ${totalHoras}h em ${OUT}/cursos.json`
);

for (const n of niveis) {
  if (n.total) console.log(`  ${n.nome}: ${n.total} trilha(s), ${n.horas}h`);
}

const fora = cursos.filter((c) => !c.nivel).length;
if (fora) console.log(`  Sem nivel: ${fora} trilha(s)`);

if (todasTags.length) console.log(`  ${todasTags.length} tag(s) em uso`);

if (imagensCopiadas) {
  console.log(`  ${imagensCopiadas} curso(s) com pasta img/ copiada.`);
}

const comAp = cursos.filter((c) => c.temApresentacao).length;
if (comAp) console.log(`  ${comAp} curso(s) com README de apresentacao.`);

if (semNivel.length) {
  console.log(`Aviso: "nivel:" ausente ou invalido em ${semNivel.length} — vao para "Outras trilhas":`);
  semNivel.forEach((f) => console.log("  - " + f));
  console.log(`  valores aceitos: ${Object.keys(NIVEIS).join(", ")}`);
}

const semCapa = cursos.filter((c) => !c.cover).map((c) => c.folder);
if (semCapa.length) {
  console.log(`Aviso: sem capa em ${semCapa.length} curso(s)`);
}

const semEmenta = cursos.filter((c) => !c.hasEmenta).map((c) => c.folder);
if (semEmenta.length) console.log(`Aviso: sem ementa em ${semEmenta.join(", ")}`);

const semAulas = cursos.filter((c) => !c.aulas.length).map((c) => c.folder);
if (semAulas.length) console.log(`Aviso: sem aulas em ${semAulas.join(", ")}`);

if (problemas.length) {
  console.log("Arquivos com erro de parsing:");
  problemas.forEach((p) => console.log("  - " + p));
}
