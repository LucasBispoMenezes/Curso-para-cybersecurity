import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import hljs from "highlight.js";

const ROOT = "cursos";
const OUT = "public";

marked.setOptions({ gfm: true, breaks: false });

const renderer = new marked.Renderer();

renderer.code = function ({ text, lang }) {
  const language = lang && hljs.getLanguage(lang) ? lang : null;
  const highlighted = language
    ? hljs.highlight(text, { language }).value
    : hljs.highlightAuto(text).value;
  return `<div class="code-block"><div class="code-head"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span><span class="lang">${language || "texto"}</span></div><pre><code class="hljs language-${language || "plaintext"}">${highlighted}</code></pre></div>`;
};

renderer.heading = function ({ text, depth }) {
  const id = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `<h${depth} id="${id}">${text}</h${depth}>`;
};

marked.use({ renderer });

const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function walk(dir, depth = 0) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full, depth + 1);
    if (!full.endsWith(".md")) return [];

    const nome = e.name.toLowerCase();

    // Ignora READMEs (inclusive os de subpastas) e arquivos de apoio
    if (nome === "readme.md") return [];
    if (/^(package|tsconfig|docker-compose|requirements)/.test(nome)) return [];

    return [full];
  });
}

const orderOf = (name) => {
  const m = name.match(/^(\d+)/);
  return m ? Number(m[1]) : 999;
};

// Ordem final dentro do curso: ementa -> modulos -> avaliacoes -> glossario
const RANK = (nome) => {
  const n = nome.toLowerCase();
  if (/^0*0?[-_]?ementa$/.test(n)) return 0;
  if (/^modulo/.test(n)) return 1;
  if (/^avalia/.test(n)) return 2;
  if (/^gloss/.test(n)) return 3;
  if (/^0*0?[-_]?index$/.test(n)) return 0;
  return 4;
};


const readingTime = (text) => {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

if (!fs.existsSync(ROOT)) {
  console.error("Pasta 'cursos/' nao encontrada. Crie a pasta e adicione os .md.");
  process.exit(1);
}

const cursos = [];

for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const dir = path.join(ROOT, entry.name);
  const arquivos = walk(dir).sort();

  const parsed = arquivos.map((file) => {
    const nome = path.basename(file, ".md");
    const { data, content } = matter(fs.readFileSync(file, "utf8"));
    const limpo = nome.replace(/^\d+[-_]?/, "");
    return {
      nome,
      isIndex: /^0*0?[-_]?index$/.test(nome.toLowerCase()),
      title: data.title || limpo.replace(/[-_]/g, " ") || "Sem titulo",
      order: data.order ?? orderOf(nome),
      slug: slugify(limpo),
      html: marked.parse(content),
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
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

  const coverFile = index?.data?.cover;
  const cover = coverFile ? coverFile.replace(/^\.?\/?/, "") : null;

  const minutos = aulas.reduce((n, a) => n + a.minutes, 0);

  cursos.push({
    slug: slugify(entry.name.replace(/^\d+[-_]?/, "")),
    folder: entry.name,
    order: orderOf(entry.name),
    title:
      index?.title || entry.name.replace(/^\d+[-_]?/, "").replace(/[-_]/g, " "),
    description: index?.excerpt || "",
    cover,
    hours: Math.max(1, Math.round(minutos / 60)),
    minutes: minutos,
    html: index?.html || "",
    aulas: aulas.map((a) => ({
      slug: a.slug,
      title: a.title,
      html: a.html,
      minutes: a.minutes,
    })),
  });
}

cursos.sort((a, b) => a.order - b.order || a.folder.localeCompare(b.folder));

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

console.log(
  cursos.length +
    " curso(s) e " +
    cursos.reduce((n, c) => n + c.aulas.length, 0) +
    " aula(s) geradas em " +
    OUT +
    "/cursos.json"
);
