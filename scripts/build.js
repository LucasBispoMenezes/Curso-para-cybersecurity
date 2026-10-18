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
   POS-PROCESSAMENTO DO CODIGO
   Opera sobre a saida do marked, nao sobre a API do renderer.
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

// Le o primeiro titulo de nivel 1 do corpo do Markdown.
// Usado quando a ementa nao declara "title:" no front matter.
const titleFrom = (content, fallback) => {
  const m = String(content).match(/^[ \t]*#[ \t]+(.+?)[ \t]*$/m);
  return m ? m[1].replace(/[*_`]/g, "").trim() : fallback;
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
   Copia cursos/<curso>/img/** para public/cursos/<curso>/img/**
   e escolhe uma capa automaticamente:
     1. cover.* / capa.* / thumb.* / banner.*
     2. a primeira imagem em ordem natural
   O front matter "cover:" continua tendo prioridade sobre isso.
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
let imagensCopiadas = 0;

for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const dir = path.join(ROOT, entry.name);
  const arquivos = walk(dir);

  const parsed = arquivos.map((file) => {
    const nome = path.basename(file, ".md");
    const bruto = fs.readFileSync(file, "utf8");
    const { data, content } = matter(bruto);
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
      // Prioridade: front matter -> primeiro "# ..." do corpo -> nome do arquivo
      title:
        data.title ||
        titleFrom(content, limpo.replace(/[-_]/g, " ")) ||
        "Sem titulo",
      order: data.order ?? orderOf(nome),
      slug: slugify(nome),
      html,
      minutes: readingTime(content),
      excerpt:
        data.description ||
        content
          .split("\n")
          .map((l) => l.trim())
          .find((l) => l && !l.startsWith("#") && !l.startsWith(">")) ||
        "",
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

  // Capa: front matter tem prioridade; senao, a pasta img/ do curso decide.
  const capaAuto = copiarImagens(dir, entry.name);
  if (capaAuto) imagensCopiadas++;

  const coverFile = index?.data?.cover;
  const cover = coverFile
    ? String(coverFile).replace(/^\.?\/?/, "")
    : capaAuto;

  const minutos = aulas.reduce((n, a) => n + a.minutes, 0);

  cursos.push({
    slug: slugify(entry.name.replace(/^\d+[-_]?/, "")),
    folder: entry.name,
    order: orderOf(entry.name),
    title:
      index?.title ||
      titleFrom(index ? "" : "", entry.name.replace(/^\d+[-_]?/, "").replace(/[-_]/g, " ")),
    description: index?.excerpt || "",
    cover,
    hours: Math.max(1, Math.round(minutos / 60)),
    minutes: minutos,
    html: index?.html || "",
    hasEmenta: Boolean(index),
    aulas: aulas.map((a) => ({
      slug: a.slug,
      title: a.title,
      html: a.html,
      minutes: a.minutes,
    })),
  });
}

cursos.sort((a, b) => a.order - b.order || a.folder.localeCompare(b.folder));

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
console.log(`${cursos.length} curso(s) e ${totalAulas} aula(s) em ${OUT}/cursos.json`);

if (imagensCopiadas) {
  console.log(`${imagensCopiadas} curso(s) com pasta img/ copiada.`);
}

const semCapa = cursos.filter((c) => !c.cover).map((c) => c.folder);
if (semCapa.length) {
  console.log(`Aviso: sem capa em ${semCapa.length} curso(s): ${semCapa.join(", ")}`);
}

const semEmenta = cursos.filter((c) => !c.hasEmenta).map((c) => c.folder);
if (semEmenta.length) {
  console.log(`Aviso: sem ementa em ${semEmenta.join(", ")}`);
}

const semAulas = cursos.filter((c) => !c.aulas.length).map((c) => c.folder);
if (semAulas.length) {
  console.log(`Aviso: sem aulas em ${semAulas.join(", ")}`);
}

if (problemas.length) {
  console.log("Arquivos com erro de parsing:");
  problemas.forEach((p) => console.log("  - " + p));
}
